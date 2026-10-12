/* ── scripts/solana-memo.ts ──────────────────────────────────────────────────
   The Solana half of anchoring, kept in one small module so both the writer
   (scripts/anchor.ts) and the reader (scripts/verify-anchor.ts) use the same
   bytes, and so tests can assert the transaction this project would send without
   needing a funded wallet.

   SPL Memo is a program that does nothing but carry text: the memo *is* the
   transaction's data, which is exactly what a daily commitment needs — no state,
   no authority, nothing to upgrade.
   --------------------------------------------------------------------------- */

import {
  Keypair, PublicKey, Transaction, TransactionInstruction, VersionedTransaction,
  type Connection, type ParsedTransactionWithMeta
} from "@solana/web3.js";

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const memoProgramId = () => new PublicKey(MEMO_PROGRAM_ID);

/** The transaction this project sends: one memo instruction, signed by the anchor wallet. */
export function buildMemoTransaction(payer: PublicKey, memo: string): Transaction {
  return new Transaction().add(new TransactionInstruction({
    programId: memoProgramId(),
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, "utf8")
  }));
}

/** Read the memo text back out of a fetched transaction, or "" if there is none. */
export function readMemo(parsed: ParsedTransactionWithMeta | null): string {
  const instructions = parsed?.transaction.message.instructions ?? [];
  for (const ix of instructions) {
    if (!("programId" in ix) || ix.programId.toBase58() !== MEMO_PROGRAM_ID) continue;
    if ("parsed" in ix && typeof ix.parsed === "string") return ix.parsed;
    const data = (ix as unknown as { data?: string }).data;
    if (typeof data === "string") return Buffer.from(data, "base64").toString("utf8");
  }
  return "";
}

/** Sign locally and check the signature against the serialized message. */
export function signAndVerifyLocally(tx: Transaction, payer: Keypair): true {
  tx.recentBlockhash = tx.recentBlockhash ?? PublicKey.default.toBase58();
  tx.feePayer = tx.feePayer ?? payer.publicKey;
  tx.sign(payer);
  const roundTrip = Transaction.from(tx.serialize());
  if (!roundTrip.verifySignatures()) throw new Error("signature does not verify over the serialized message");
  return true;
}

/** Round-trip a signed transaction through the wire format, returning its memo. */
export function memoFromSerialized(tx: Transaction): string {
  const roundTrip = Transaction.from(tx.serialize());
  for (const ix of roundTrip.instructions) {
    if (ix.programId.toBase58() === MEMO_PROGRAM_ID) return Buffer.from(ix.data).toString("utf8");
  }
  return "";
}

/** Send a signed transaction, returning its signature. */
export async function sendMemo(connection: Connection, tx: Transaction, payer: Keypair, signers: Keypair[] = []): Promise<string> {
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  void payer; void signers; void VersionedTransaction;
  return signature;
}
