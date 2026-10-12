/* The send path, tested without a chain.
 *
 * The public devnet faucet refused every request from this machine while this was
 * written, so the transaction this project would send is asserted locally instead:
 * the memo it carries, the program it calls, and the fact that a signature over it
 * verifies. What remains unproven until a funded wallet exists is the RPC accepting
 * it — which is stated in docs/STATUS.md rather than glossed over.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Keypair, Transaction } from "@solana/web3.js";
import { MEMO_PROGRAM_ID, buildMemoTransaction, memoFromSerialized, readMemo, signAndVerifyLocally } from "../scripts/solana-memo";
import { memoFor, recomputeDay } from "../app/lib/anchors";

test("the anchor transaction carries exactly the day's memo, to the memo program", () => {
  const payer = Keypair.generate();
  const head = recomputeDay(0);
  const memo = memoFor(0, head.chainHash);

  const tx = buildMemoTransaction(payer.publicKey, memo);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = "11111111111111111111111111111111";

  assert.equal(tx.instructions.length, 1);
  assert.equal(tx.instructions[0].programId.toBase58(), MEMO_PROGRAM_ID);
  assert.equal(Buffer.from(tx.instructions[0].data).toString("utf8"), memo);
  assert.equal(tx.instructions[0].keys[0].pubkey.toBase58(), payer.publicKey.toBase58());
  assert.equal(tx.instructions[0].keys[0].isSigner, true);
});

test("a signed anchor transaction keeps its memo through the wire format", () => {
  const payer = Keypair.generate();
  const memo = memoFor(3, recomputeDay(3).chainHash);
  const tx = buildMemoTransaction(payer.publicKey, memo);
  assert.equal(signAndVerifyLocally(tx, payer), true);
  assert.equal(memoFromSerialized(tx), memo);
  assert.equal(Transaction.from(tx.serialize()).verifySignatures(), true);
});

test("reading a memo back ignores transactions that are not ours", () => {
  assert.equal(readMemo(null), "");
  const notOurs = {
    transaction: { message: { instructions: [{ programId: { toBase58: () => "11111111111111111111111111111111" } }] } }
  } as unknown as Parameters<typeof readMemo>[0];
  assert.equal(readMemo(notOurs), "");
});
