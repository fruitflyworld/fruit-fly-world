// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external returns (bytes4);
}

contract FruitFlyPassport {
    error AlreadyMinted();
    error AlreadyUsed();
    error Expired();
    error InvalidCampaign();
    error InvalidRecipient();
    error InvalidSignature();
    error InvalidVoucher();
    error MetadataIsFrozen();
    error MintPaused();
    error NotOwner();
    error NotPendingOwner();
    error NonTransferable();
    error PublicMintClosed();
    error SoldOut();
    error UnsafeRecipient();
    error WithdrawalFailed();
    error WrongPayment();
    error ZeroAddress();

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MintSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event MintPausedUpdated(bool paused);
    event PublicMintUpdated(bool open, uint256 price);
    event PassportMinted(address indexed recipient, uint256 indexed tokenId, bool missionQualified, uint256 amountPaid);
    event MissionActivated(address indexed recipient, uint256 indexed tokenId);
    event BaseURIUpdated(string baseURI);
    event MetadataFrozen();
    event Locked(uint256 tokenId);

    string public constant name = "Fruit Fly Passport";
    string public constant symbol = "FFWP";
    uint256 public constant MAX_SUPPLY = 4444;
    bytes32 public constant VOUCHER_TYPEHASH = keccak256(
        "MintVoucher(address recipient,bytes32 campaign,bytes32 nonce,uint256 deadline,bool participant,bool free)"
    );
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("Fruit Fly Passport");
    bytes32 private constant VERSION_HASH = keccak256("1");
    uint256 private constant SECP256K1N_HALF =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    bytes32 public immutable campaign;
    address public owner;
    address public pendingOwner;
    address public mintSigner;
    bool public mintPaused = true;
    bool public publicMintOpen;
    bool public metadataFrozen;
    uint256 public publicMintPrice;
    uint256 public totalSupply;
    string private _baseTokenURI;

    mapping(address => bool) public hasMinted;
    mapping(address => bool) public missionQualified;
    mapping(address => uint256) public tokenOf;
    mapping(bytes32 => bool) public usedNonces;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    /// @dev The signer alone decides the billing tier, and the signature covers it, so a
    ///      holder cannot promote a standard voucher into the half-price tier.
    struct MintVoucher {
        address recipient;
        bytes32 campaign;
        bytes32 nonce;
        uint256 deadline;
        bool participant;
        bool free;
    }

    constructor(address initialOwner, address initialSigner, bytes32 campaignId, string memory initialBaseURI) {
        if (initialOwner == address(0) || initialSigner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        mintSigner = initialSigner;
        campaign = campaignId;
        _baseTokenURI = initialBaseURI;
        emit OwnershipTransferred(address(0), initialOwner);
        emit MintSignerUpdated(address(0), initialSigner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Voucher mint. The voucher's tier decides the bill: `free` costs nothing,
    ///         `participant` pays half the standard price, and neither pays the standard price.
    function mint(MintVoucher calldata voucher, bytes calldata signature) external payable returns (uint256 tokenId) {
        if (mintPaused) revert MintPaused();
        if (voucher.recipient != msg.sender) revert InvalidRecipient();
        if (voucher.campaign != campaign) revert InvalidCampaign();
        if (block.timestamp > voucher.deadline) revert Expired();
        if (usedNonces[voucher.nonce]) revert AlreadyUsed();
        if (voucher.free && voucher.participant) revert InvalidVoucher();
        if (_recover(_voucherDigest(voucher), signature) != mintSigner) revert InvalidSignature();

        if (!voucher.free && publicMintPrice == 0) revert PublicMintClosed();
        uint256 due = voucher.free ? 0 : mintPrice(voucher.participant);
        if (msg.value != due) revert WrongPayment();

        usedNonces[voucher.nonce] = true;
        if (hasMinted[msg.sender]) {
            // A second mint can only ever re-activate mission status, never take payment.
            if (!voucher.free) revert AlreadyMinted();
            tokenId = tokenOf[msg.sender];
            if (!missionQualified[msg.sender]) {
                missionQualified[msg.sender] = true;
                emit MissionActivated(msg.sender, tokenId);
            }
            return tokenId;
        }
        tokenId = _mintPassport(msg.sender, voucher.free, msg.value);
    }

    /// @notice Per-token price for the next voucher mint.
    /// @param participant Verified Foraging Hour entrant — pays half the standard price.
    function mintPrice(bool participant) public view returns (uint256) {
        return participant ? publicMintPrice / 2 : publicMintPrice;
    }

    /// @notice Convenience view of the tier a verified Foraging Hour entrant pays.
    function participantPrice() external view returns (uint256) {
        return mintPrice(true);
    }

    function publicMint() external payable returns (uint256 tokenId) {
        if (mintPaused) revert MintPaused();
        if (!publicMintOpen) revert PublicMintClosed();
        if (msg.value != publicMintPrice) revert WrongPayment();
        tokenId = _mintPassport(msg.sender, false, msg.value);
    }

    function voucherDigest(MintVoucher calldata voucher) external view returns (bytes32) {
        return _voucherDigest(voucher);
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balanceOf[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address tokenOwner) {
        tokenOwner = _ownerOf[tokenId];
        if (tokenOwner == address(0)) revert InvalidRecipient();
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return string.concat(_baseTokenURI, _toString(tokenId));
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0xb45a3c0e;
    }

    function locked(uint256 tokenId) external view returns (bool) {
        ownerOf(tokenId);
        return true;
    }

    function approve(address, uint256) external pure { revert NonTransferable(); }
    function setApprovalForAll(address, bool) external pure { revert NonTransferable(); }
    function getApproved(uint256 tokenId) external view returns (address) { ownerOf(tokenId); return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure { revert NonTransferable(); }
    function safeTransferFrom(address, address, uint256) external pure { revert NonTransferable(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert NonTransferable(); }

    function setMintPaused(bool paused) external onlyOwner {
        mintPaused = paused;
        emit MintPausedUpdated(paused);
    }

    function setPublicMint(bool open, uint256 price) external onlyOwner {
        if (open && price == 0) revert WrongPayment();
        publicMintOpen = open;
        publicMintPrice = price;
        emit PublicMintUpdated(open, price);
    }

    function setMintSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit MintSignerUpdated(mintSigner, newSigner);
        mintSigner = newSigner;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;
        emit MetadataFrozen();
    }

    function withdraw(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        (bool success,) = recipient.call{value: address(this).balance}("");
        if (!success) revert WithdrawalFailed();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    function _mintPassport(address recipient, bool qualified, uint256 amountPaid) private returns (uint256 tokenId) {
        if (hasMinted[recipient]) revert AlreadyMinted();
        if (totalSupply >= MAX_SUPPLY) revert SoldOut();

        hasMinted[recipient] = true;
        missionQualified[recipient] = qualified;
        tokenId = ++totalSupply;
        tokenOf[recipient] = tokenId;
        _ownerOf[tokenId] = recipient;
        _balanceOf[recipient] = 1;
        emit Transfer(address(0), recipient, tokenId);
        emit Locked(tokenId);
        emit PassportMinted(recipient, tokenId, qualified, amountPaid);
        if (recipient.code.length != 0) {
            try IERC721Receiver(recipient).onERC721Received(msg.sender, address(0), tokenId, "") returns (bytes4 value) {
                if (value != IERC721Receiver.onERC721Received.selector) revert UnsafeRecipient();
            } catch { revert UnsafeRecipient(); }
        }
    }

    function _voucherDigest(MintVoucher calldata voucher) private view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            VOUCHER_TYPEHASH, voucher.recipient, voucher.campaign, voucher.nonce, voucher.deadline,
            voucher.participant, voucher.free
        ));
        bytes32 domain = keccak256(abi.encode(
            DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)
        ));
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address recovered) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > SECP256K1N_HALF || (v != 27 && v != 28)) revert InvalidSignature();
        recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 temp = value;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
