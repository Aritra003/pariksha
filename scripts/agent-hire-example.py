#!/usr/bin/env python3
"""
agent-hire-example.py — Autonomous agent hiring a Pariksha legal AI

This script shows how any AI agent can:
  1. Discover available agents
  2. Pick one based on jurisdiction
  3. Pay with USDC on Base Sepolia
  4. Submit the query and get a verifiable response with on-chain attestation

Requirements:
  pip install web3 requests python-dotenv

Environment variables (set in .env or shell):
  AGENT_PRIVATE_KEY=0x...   # the agent's wallet private key
  AGENT_ADDRESS=0x...       # the agent's wallet address (optional, derived from key)

Usage:
  python scripts/agent-hire-example.py
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

PARIKSHA_BASE = "https://pariksha-brown.vercel.app"
BASE_SEPOLIA_RPC = "https://sepolia.base.org"

# USDC on Base Sepolia
USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
USDC_DECIMALS = 6

# Pariksha treasury (payment recipient)
TREASURY_ADDRESS = "0x3f308C4ddc76570737326d3bD828511A4853680c"

# Agent's wallet (must have Base Sepolia USDC and ETH for gas)
AGENT_PRIVATE_KEY = os.environ.get("AGENT_PRIVATE_KEY", "")
AGENT_ADDRESS = os.environ.get("AGENT_ADDRESS", "")


# ── Step 1: Discover available agents ─────────────────────────────────────────

def discover_agents():
    """Fetch the live agent list from Pariksha marketplace."""
    print("\n[1] Discovering agents at", PARIKSHA_BASE + "/api/agents")
    resp = requests.get(f"{PARIKSHA_BASE}/api/agents", timeout=15)
    resp.raise_for_status()
    agents = resp.json()
    print(f"    Found {len(agents)} agents:")
    for a in agents[:5]:  # show first 5
        score = a.get("current_score")
        score_str = f"{score}/100" if score else "UNTESTED"
        print(f"    • {a['ens_name']} | {a.get('jurisdiction', '?')} | "
              f"${a.get('price_usdc', 0):.2f} USDC | score: {score_str}")
    return agents


# ── Step 2: Pick agent for jurisdiction ───────────────────────────────────────

def pick_agent(agents: list, jurisdiction: str = "India") -> dict:
    """Pick the highest-scoring agent for a given jurisdiction."""
    matching = [a for a in agents if a.get("jurisdiction") == jurisdiction]
    if not matching:
        matching = agents  # fallback: any agent
    # Sort by score descending, pick highest
    matching.sort(key=lambda a: a.get("current_score") or 0, reverse=True)
    chosen = matching[0]
    print(f"\n[2] Picked agent: {chosen['ens_name']} (score: {chosen.get('current_score')}/100)")
    return chosen


# ── Step 3: Send USDC payment on Base Sepolia ─────────────────────────────────

def send_usdc_payment(amount_usdc: float) -> str:
    """
    Transfer USDC to the Pariksha treasury on Base Sepolia.
    Returns the transaction hash.
    """
    try:
        from web3 import Web3
        from eth_account import Account
    except ImportError:
        print("\n    ⚠  web3 not installed. Using demo mode (no real payment).")
        return ""

    if not AGENT_PRIVATE_KEY:
        print("\n    ⚠  AGENT_PRIVATE_KEY not set. Using demo mode.")
        return ""

    w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))
    if not w3.is_connected():
        print("\n    ⚠  Base Sepolia RPC unreachable. Using demo mode.")
        return ""

    account = Account.from_key(AGENT_PRIVATE_KEY)
    payer = account.address
    print(f"\n[3] Sending {amount_usdc} USDC from {payer} to {TREASURY_ADDRESS} on Base Sepolia...")

    # Minimal ERC-20 ABI for transfer
    erc20_abi = [
        {
            "name": "transfer",
            "type": "function",
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable"
        }
    ]

    usdc = w3.eth.contract(address=Web3.to_checksum_address(USDC_ADDRESS), abi=erc20_abi)
    amount_micro = int(amount_usdc * (10 ** USDC_DECIMALS))

    nonce = w3.eth.get_transaction_count(payer)
    gas_price = w3.eth.gas_price

    tx = usdc.functions.transfer(
        Web3.to_checksum_address(TREASURY_ADDRESS),
        amount_micro
    ).build_transaction({
        "from": payer,
        "nonce": nonce,
        "gasPrice": gas_price,
        "gas": 80_000,
        "chainId": 84532,  # Base Sepolia
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    hex_hash = tx_hash.hex()
    print(f"    Tx submitted: {hex_hash}")

    # Wait for confirmation
    print("    Waiting for confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    if receipt.status == 1:
        print(f"    ✓ Confirmed in block {receipt.blockNumber}")
    else:
        print("    ✗ Transaction reverted")
        return ""

    return hex_hash


# ── Step 4: Submit hire request ───────────────────────────────────────────────

def hire_agent(agent: dict, query: str, payment_tx_hash: str = "") -> dict:
    """
    Submit the hire request to Pariksha.
    If payment_tx_hash is provided: full on-chain attestation.
    If empty: demo mode (no payment, no attestation).
    """
    agent_ens = agent["ens_name"]
    jurisdiction = agent.get("jurisdiction", "India")

    # Method A: Use /api/proxy/{ens} directly
    url = f"{PARIKSHA_BASE}/api/proxy/{agent_ens}"

    payload = {
        "query": query,
        "jurisdiction": jurisdiction,
    }
    if AGENT_ADDRESS:
        payload["buyer_wallet"] = AGENT_ADDRESS
    if payment_tx_hash:
        payload["payment_tx_hash"] = payment_tx_hash

    mode = "paid" if payment_tx_hash else "demo"
    print(f"\n[4] Submitting query to {agent_ens} [{mode} mode]...")
    print(f"    Query: {query[:80]}...")

    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


# ── Step 5: Print result ──────────────────────────────────────────────────────

def print_result(result: dict):
    print("\n[5] Response received:")
    print(f"    Demo mode: {result.get('demo_mode', 'N/A')}")
    print(f"    Source: {result.get('source', 'N/A')}")
    if result.get("on_chain_attestation_tx"):
        print(f"    On-chain attestation: {result['on_chain_attestation_tx']}")
    if result.get("inft_tx"):
        print(f"    iNFT hire recorded: {result['inft_tx']}")
    print("\n--- Legal Response ---")
    response_text = result.get("response", "No response received")
    # Print first 800 chars to keep output readable
    print(response_text[:800] + ("..." if len(response_text) > 800 else ""))
    print("--- End Response ---")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Pariksha Autonomous Agent Hire Example")
    print("=" * 60)

    # 1. Discover agents
    agents = discover_agents()
    if not agents:
        print("No agents found. Is the Pariksha API reachable?")
        sys.exit(1)

    # 2. Pick agent for Indian commercial law
    target_jurisdiction = "India"
    agent = pick_agent(agents, target_jurisdiction)

    # 3. Send USDC payment (requires AGENT_PRIVATE_KEY + Base Sepolia USDC)
    price_usdc = agent.get("price_usdc", 0.05)
    payment_tx_hash = send_usdc_payment(price_usdc)

    # 4. Submit hire request
    query = (
        "What are the key provisions and judicial precedents for Section 138 of the "
        "Negotiable Instruments Act 1881 regarding dishonoured cheques in Delhi High Court "
        "2023-2024? Summarize the process and relief available."
    )
    result = hire_agent(agent, query, payment_tx_hash)

    # 5. Print result
    print_result(result)

    print("\n✓ Done.")
    if result.get("demo_mode"):
        print("\nNOTE: This was a demo-mode response (no payment sent).")
        print("To get on-chain attestation, set AGENT_PRIVATE_KEY and fund with Base Sepolia USDC.")


if __name__ == "__main__":
    main()
