import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { freeMintUnlocked, MINT_VOUCHER_TYPE, mintVoucherTypes, shareOwed } from "../app/lib/mint";

/**
 * The signer and the contract must agree on the voucher struct down to the byte, or every
 * signature the server issues is rejected on-chain with InvalidSignature and nothing mints.
 * These two files have no compiler between them, so the test is the compiler.
 */
test("the server's voucher type string matches the contract's VOUCHER_TYPEHASH", () => {
  const source = readFileSync("contracts/src/FruitFlyPassport.sol", "utf8");
  const declared = /VOUCHER_TYPEHASH = keccak256\(\s*"([^"]+)"/.exec(source);
  assert.ok(declared, "could not find VOUCHER_TYPEHASH in the contract");
  assert.equal(declared[1], MINT_VOUCHER_TYPE);
});

test("both billing flags travel inside the signature", () => {
  assert.deepEqual(
    mintVoucherTypes.MintVoucher.map((field) => `${field.type} ${field.name}`),
    ["address recipient", "bytes32 campaign", "bytes32 nonce", "uint256 deadline", "bool participant", "bool free"]
  );
});

/* The free mint is a two-step price (the stonkrobotics model): one qualifying
 * mission earns the slot, the verified X quote post converts it. Nobody mints
 * free in silence — and the share alone buys nothing either. */
test("free mint requires a qualifying mission AND the share", () => {
  assert.equal(freeMintUnlocked(["X_QUOTE"]), false, "the share alone is not a quest");
  assert.equal(freeMintUnlocked(["AGENT"]), false, "a quest alone has not been shared");
  assert.equal(freeMintUnlocked(["AGENT", "X_QUOTE"]), true);
  assert.equal(freeMintUnlocked(["ARENA", "X_QUOTE"]), true);
  assert.equal(freeMintUnlocked(["DISH", "X_QUOTE"]), true);
  assert.equal(freeMintUnlocked(["RUN", "REPLAY", "X_QUOTE"]), false, "non-qualifying completions do not count");
  assert.equal(freeMintUnlocked([]), false);
});

test("shareOwed marks the one-step-left state the UI and voucher both message", () => {
  assert.equal(shareOwed(["AGENT"]), true);
  assert.equal(shareOwed(["DISH", "ARENA"]), true);
  assert.equal(shareOwed(["AGENT", "X_QUOTE"]), false);
  assert.equal(shareOwed(["X_QUOTE"]), false, "nothing is owed when no quest is done yet");
  assert.equal(shareOwed([]), false);
});
