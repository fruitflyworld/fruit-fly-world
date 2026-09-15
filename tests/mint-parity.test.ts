import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MINT_VOUCHER_TYPE, mintVoucherTypes } from "../app/lib/mint";

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
