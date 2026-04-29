// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Deployed on Base Sepolia — the chain where USDC payments happen.
// Acts as an immutable event registry: every paid hire creates an on-chain record.

contract ParikshaAttestation {
    struct Attestation {
        string agentEns;
        address payer;
        uint256 amountUsdc;
        bytes32 queryHash;
        bytes32 responseHash;
        uint256 timestamp;
    }

    uint256 private _count;
    mapping(uint256 => Attestation) private _attestations;

    event Attested(
        uint256 indexed id,
        string agentEns,
        address indexed payer,
        uint256 amountUsdc,
        uint256 timestamp
    );

    function attest(
        string memory agentEns,
        address payer,
        uint256 amountUsdc,
        bytes32 queryHash,
        bytes32 responseHash
    ) external returns (uint256) {
        uint256 id = _count++;
        _attestations[id] = Attestation({
            agentEns: agentEns,
            payer: payer,
            amountUsdc: amountUsdc,
            queryHash: queryHash,
            responseHash: responseHash,
            timestamp: block.timestamp
        });
        emit Attested(id, agentEns, payer, amountUsdc, block.timestamp);
        return id;
    }

    function getAttestation(uint256 id) external view returns (Attestation memory) {
        require(id < _count, "Attestation does not exist");
        return _attestations[id];
    }

    function getAttestationCount() external view returns (uint256) {
        return _count;
    }
}
