# Security Policy

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Report vulnerabilities privately to: **security@atnia.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will respond within **48 hours** and work with you on a coordinated disclosure.

## Bug Bounty

For hackathon scope (pre-mainnet): recognition only — we'll credit you in the changelog and on our site.

Post-mainnet launch, we will run a formal bug bounty program. Scope, rewards, and rules will be published at that time.

## Scope

In scope:
- Smart contracts (`contracts/`)
- API routes (`app/api/`)
- Payment verification logic (`lib/x402.ts`)
- Chain execution logic (`lib/chain-executor.ts`)

Out of scope:
- Third-party services (Supabase, Anthropic, Vercel)
- Testnet-only issues with no mainnet path
- UI/UX issues that don't have security impact
