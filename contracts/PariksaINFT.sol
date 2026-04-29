// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// NOTE: ERC-7857 (iNFT standard) is still emerging and not yet audited on 0G Galileo testnet.
// We implement ERC-721 with iNFT-like properties: rich on-chain metadata, persistent mutable state,
// and authorized backend writes. Compatible with 0G Galileo (EVM-equivalent).
// FALLBACK: If 0G Galileo has RPC/gas issues at deploy time, deploy to Base Sepolia instead.
//           This does not affect the 0G Storage metadata integration (PROMPT-03).

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PariksaINFT is ERC721, ERC721URIStorage, Ownable {
    struct AgentMeta {
        string ensName;
        string jurisdiction;
        string specialty;
        string corpusVersion;
        uint256 mintedAt;
        uint256 totalHires;
        uint256 totalParikshaRuns;
        uint256 currentScore; // basis points 0-10000 (e.g. 9140 = 91.40)
        uint256 lifetimeUSDCEarned; // in USDC base units (6 decimals)
        uint256 trainingExamplesCount;
        bool active;
    }

    uint256 private _nextTokenId;
    address public backendAuthority;

    mapping(uint256 => AgentMeta) private _agents;

    event HireRecorded(uint256 indexed tokenId, uint256 amountUsdc, uint256 totalHires);
    event ScoreUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore, uint256 totalRuns);
    event TrainingExampleAdded(uint256 indexed tokenId, uint256 totalExamples);
    event CorpusUpdated(uint256 indexed tokenId, string newVersion);
    event BackendAuthoritySet(address indexed oldAuthority, address indexed newAuthority);

    modifier onlyBackend() {
        require(msg.sender == backendAuthority || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {
        backendAuthority = msg.sender;
    }

    function mint(
        address to,
        string memory ensName,
        string memory jurisdiction,
        string memory specialty,
        string memory uri
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _agents[tokenId] = AgentMeta({
            ensName: ensName,
            jurisdiction: jurisdiction,
            specialty: specialty,
            corpusVersion: "v1",
            mintedAt: block.timestamp,
            totalHires: 0,
            totalParikshaRuns: 0,
            currentScore: 0,
            lifetimeUSDCEarned: 0,
            trainingExamplesCount: 0,
            active: true
        });

        return tokenId;
    }

    function recordHire(uint256 tokenId, uint256 amountUsdc) external onlyBackend {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        AgentMeta storage agent = _agents[tokenId];
        agent.totalHires++;
        agent.lifetimeUSDCEarned += amountUsdc;
        emit HireRecorded(tokenId, amountUsdc, agent.totalHires);
    }

    function recordParikshaRun(uint256 tokenId, uint256 newScore) external onlyBackend {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(newScore <= 10000, "Score out of range");
        AgentMeta storage agent = _agents[tokenId];
        uint256 oldScore = agent.currentScore;
        agent.currentScore = newScore;
        agent.totalParikshaRuns++;
        emit ScoreUpdated(tokenId, oldScore, newScore, agent.totalParikshaRuns);
    }

    function recordTrainingExample(uint256 tokenId) external onlyBackend {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        AgentMeta storage agent = _agents[tokenId];
        agent.trainingExamplesCount++;
        emit TrainingExampleAdded(tokenId, agent.trainingExamplesCount);
    }

    function updateCorpusVersion(uint256 tokenId, string memory newVersion) external onlyBackend {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _agents[tokenId].corpusVersion = newVersion;
        emit CorpusUpdated(tokenId, newVersion);
    }

    function setBackendAuthority(address newAuthority) external onlyOwner {
        emit BackendAuthoritySet(backendAuthority, newAuthority);
        backendAuthority = newAuthority;
    }

    function getAgent(uint256 tokenId) external view returns (AgentMeta memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _agents[tokenId];
    }

    // ERC721URIStorage overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
