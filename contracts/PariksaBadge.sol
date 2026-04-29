// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PariksaBadge is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint8 public constant VERIFIED = 0;
    uint8 public constant VETERAN = 1;
    uint8 public constant EXCELLENCE = 2;
    uint8 public constant POLYGLOT = 3;
    uint8 public constant SPECIALIST = 4;

    struct BadgeMeta {
        uint8 badgeType;
        string agentEns;
        string thresholdData;
        uint256 mintedAt;
    }

    uint256 private _nextTokenId;
    address public backendAuthority;

    mapping(uint256 => BadgeMeta) private _badges;
    // agentEns => badgeType => has badge
    mapping(string => mapping(uint8 => bool)) private _agentHasBadge;

    event BadgeMinted(address indexed to, uint8 indexed badgeType, string agentEns, uint256 tokenId);
    event BackendAuthoritySet(address indexed oldAuthority, address indexed newAuthority);

    modifier onlyBackend() {
        require(msg.sender == backendAuthority || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {
        backendAuthority = msg.sender;
    }

    function mintBadge(
        address to,
        uint8 badgeType,
        string memory agentEns,
        string memory thresholdData
    ) external onlyBackend returns (uint256) {
        require(badgeType <= SPECIALIST, "Invalid badge type");
        require(!_agentHasBadge[agentEns][badgeType], "Badge already awarded");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _badges[tokenId] = BadgeMeta({
            badgeType: badgeType,
            agentEns: agentEns,
            thresholdData: thresholdData,
            mintedAt: block.timestamp
        });

        _agentHasBadge[agentEns][badgeType] = true;

        emit BadgeMinted(to, badgeType, agentEns, tokenId);
        return tokenId;
    }

    function setBackendAuthority(address newAuthority) external onlyOwner {
        emit BackendAuthoritySet(backendAuthority, newAuthority);
        backendAuthority = newAuthority;
    }

    function hasBadge(string memory agentEns, uint8 badgeType) external view returns (bool) {
        return _agentHasBadge[agentEns][badgeType];
    }

    function getBadge(uint256 tokenId) external view returns (BadgeMeta memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _badges[tokenId];
    }

    function badgeTypeName(uint8 badgeType) public pure returns (string memory) {
        if (badgeType == VERIFIED) return "VERIFIED";
        if (badgeType == VETERAN) return "VETERAN";
        if (badgeType == EXCELLENCE) return "EXCELLENCE";
        if (badgeType == POLYGLOT) return "POLYGLOT";
        if (badgeType == SPECIALIST) return "SPECIALIST";
        return "UNKNOWN";
    }

    function badgeColor(uint8 badgeType) public pure returns (string memory) {
        if (badgeType == VERIFIED) return "#00FF94";
        if (badgeType == VETERAN) return "#D4AF37";
        if (badgeType == EXCELLENCE) return "#BF5AF2";
        if (badgeType == POLYGLOT) return "#00C7FF";
        if (badgeType == SPECIALIST) return "#FF9500";
        return "#8B8B95";
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        BadgeMeta memory badge = _badges[tokenId];
        string memory typeName = badgeTypeName(badge.badgeType);
        string memory color = badgeColor(badge.badgeType);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#14141A" rx="20"/>',
            '<rect x="10" y="10" width="380" height="380" fill="none" stroke="', color, '" stroke-width="2" rx="16"/>',
            '<circle cx="200" cy="140" r="60" fill="none" stroke="', color, '" stroke-width="3"/>',
            '<text x="200" y="148" font-family="monospace" font-size="32" fill="', color, '" text-anchor="middle">',
            unicode'★',
            '</text>',
            '<text x="200" y="230" font-family="monospace" font-size="20" font-weight="bold" fill="', color, '" text-anchor="middle">', typeName, '</text>',
            '<text x="200" y="260" font-family="monospace" font-size="12" fill="#8B8B95" text-anchor="middle">Pariksha Badge</text>',
            '<text x="200" y="290" font-family="monospace" font-size="11" fill="#F5F5F7" text-anchor="middle">', badge.agentEns, '</text>',
            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"Pariksha ', typeName, ' Badge","description":"Awarded to ', badge.agentEns, ' for achieving ', typeName, ' status on Pariksha.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Badge Type","value":"', typeName, '"},{"trait_type":"Agent","value":"', badge.agentEns, '"},{"trait_type":"Threshold","value":"', badge.thresholdData, '"}]}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // ERC721Enumerable overrides
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
