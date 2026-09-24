// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title FlyToken — the one project token of Fruit Fly World.
/// @notice Fixed supply, minted exactly once at deployment. There is no mint
///         function after construction: the entire supply lands in the
///         initial holder (the race reward pool). Tokens are spent by burning
///         them — race entry, breeding, mutation rerolls all burn, so the
///         circulating supply only ever goes down. Anyone can verify the
///         whole monetary policy from this file: one supply, one mint, burns.
/// @dev Self-contained ERC-20 (no OpenZeppelin), same discipline as
///      FruitFlyPassport: custom errors, no storage padding tricks.
contract FlyToken {
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();
    error Overflow();

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    string public constant name = "Fruit Fly World";
    string public constant symbol = "FLY";
    uint8 public constant decimals = 18;
    /// @notice Maximum tokens that will ever exist: 444,444,444 FLY.
    uint256 public constant MAX_SUPPLY = 444_444_444 * 1e18;

    mapping(address => uint256) private _balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(address initialHolder) {
        if (initialHolder == address(0)) revert ZeroAddress();
        _balanceOf[initialHolder] = MAX_SUPPLY;
        totalSupply = MAX_SUPPLY;
        emit Transfer(address(0), initialHolder, MAX_SUPPLY);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balanceOf[account];
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @notice Burn your own tokens — the sink side of the economy. Race
    ///         entries, breeding and mutation rerolls all route through here.
    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }

    /// @notice Burn on someone's behalf under an existing allowance.
    function burnFrom(address from, uint256 value) external {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _burn(from, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = _balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked {
            _balanceOf[from] = fromBalance - value;
            if (_balanceOf[to] + value < value) revert Overflow();
            _balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _burn(address from, uint256 value) private {
        uint256 fromBalance = _balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked {
            _balanceOf[from] = fromBalance - value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }
}
