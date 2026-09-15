/* Window-close proof: a MANUAL-lane winner takes the slot, is recorded, and mints free.
   Needs the server running with a short ARENA_WINDOW_SEC. */
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, getAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { SiweMessage } from "siwe";
import pg from "pg";

const BASE = "http://localhost:3000";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT = getAddress("0x8ec4406b0e936ced9a26c5604cc552a5e34d9570");
const DB = process.env.DATABASE_URL ?? "postgresql://fruitfly_app@127.0.0.1:5432/fruit_fly_world";

const wallets = JSON.parse(readFileSync(`${process.env.HOME}/.ffw-test/wallets.json`, "utf8"));
const W = (n: string) => privateKeyToAccount(wallets[n].privateKey as Hex);
const arenaModule: any = await import("./app/lib/arena.ts");
const bestRoute: (epoch: number) => { route: string[]; signals: any[] } =
  arenaModule.bestRoute ?? arenaModule.default.bestRoute;
const scoreRoute: (e: number, r: string[], s: any[]) => { exact: number } =
  arenaModule.scoreRoute ?? arenaModule.default.scoreRoute;

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const walletFor = (n: string) => createWalletClient({ account: W(n), chain: sepolia, transport: http(RPC) });
const db = new pg.Client({ connectionString: DB });
await db.connect();

let pass = 0, fail = 0;
const ok = (c: boolean, l: string, x = "") => { if (c) { pass++; console.log(`  ok   ${l}`); } else { fail++; console.log(`  FAIL ${l}${x ? " — " + x : ""}`); } };
const eq = (a: unknown, b: unknown, l: string) => ok(a === b, l, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);
const head = (t: string) => console.log(`\n── ${t}`);

async function api(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: BASE };
  if (init.cookie) headers.cookie = init.cookie;
  const res = await fetch(BASE + path, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers, body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });
  const sc = res.headers.getSetCookie?.()?.[0] ?? res.headers.get("set-cookie") ?? "";
  let json: any = null; try { json = await res.json(); } catch {}
  return { status: res.status, body: json, cookie: sc ? sc.split(";")[0] : "" };
}

async function login(name: string) {
  const account = W(name);
  const n = await api("/api/auth/nonce", { body: {} });
  const message = new SiweMessage({ domain: "localhost:3000", address: account.address, statement: "Sign in to Fruit Fly World", uri: BASE, version: "1", chainId: 11155111, nonce: n.body.nonce }).prepareMessage();
  const signature = await account.signMessage({ message });
  const v = await api("/api/auth/verify", { body: { message, signature } });
  if (v.status !== 200) throw new Error(`login ${name} failed: ${JSON.stringify(v.body)}`);
  return v.cookie;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

head("0. wait for a fresh window to open");
let brief = await api("/api/arena/brief", { method: "GET" });
while (brief.body.window.secondsLeft < brief.body.window.windowSec - 5) {
  const waitMs = brief.body.window.secondsLeft * 1000 - (brief.body.window.windowSec - 5) * 1000;
  console.log(`  … holding ${Math.round(waitMs / 1000)}s for the next window`);
  await sleep(Math.max(waitMs, 1000));
  brief = await api("/api/arena/brief", { method: "GET" });
}
const epoch = brief.body.window.epoch;
const endsAt = brief.body.window.endsAt;
console.log(`  window ${epoch}, ${brief.body.window.windowSec}s, ${brief.body.window.secondsLeft}s left`);
eq(await db.query("SELECT status FROM arena_windows WHERE epoch=$1", [epoch]).then((r) => r.rows[0]?.status), "open", "the window row is open");

head("1. two entries: W11 with the best route, W12 with a one-station trip");
const s11 = await login("W11");
const s12 = await login("W12");
const plan = bestRoute(epoch);
const best = scoreRoute(epoch, plan.route, plan.signals).exact;
const weakRoute = ["F-01"];
const weak = scoreRoute(epoch, weakRoute, [plan.signals[0]]).exact;
ok(best > weak, `the best route outscores the one-station trip (${best} > ${weak})`);

const e11 = await api("/api/arena/enter", { body: { epoch, route: plan.route, signals: plan.signals }, cookie: s11 });
eq(e11.status, 200, "W11 entered on the manual lane");
eq(e11.body.lane, "manual", "  … lane is manual");
eq(e11.body.leading, true, "W11 leads the window");
const e12 = await api("/api/arena/enter", { body: { epoch, route: weakRoute, signals: [plan.signals[0]] }, cookie: s12 });
eq(e12.status, 200, "W12 entered on the manual lane");
eq(e12.body.leading, false, "  … W12 does not lead");

head("2. close the window");
const wait = endsAt * 1000 - Date.now() + 2500;
console.log(`  … waiting ${Math.ceil(wait / 1000)}s for the window to shut`);
await sleep(Math.max(wait, 1000));
const closed = await api("/api/arena", { method: "GET" });
eq(closed.status, 200, "GET /api/arena answers after the close");
eq(closed.body.lastWinner?.address, W("W11").address.toLowerCase(), "lastWinner is W11");
eq(closed.body.lastWinner?.lane, "manual", "  … and the win is marked as the manual lane");
eq(Math.round(closed.body.lastWinner?.exact ?? 0), Math.round(best), "  … with the best route's exact score");
const w = await db.query<{ winner_address: string; winner_agent_address: string; winning_exact: string }>(
  "SELECT winner_address,winner_agent_address,winning_exact FROM arena_windows WHERE epoch=$1", [epoch]
);
eq(w.rows[0]?.winner_address, W("W11").address.toLowerCase(), "arena_windows records W11 as the winner");
eq(w.rows[0]?.winner_agent_address, W("W11").address.toLowerCase(), "  … and its own wallet as the agent for a manual entry");

head("3. the win is a mission worth a free Passport");
const mc = await db.query<{ mission_type: string; evidence_type: string }>(
  "SELECT mission_type,evidence_type FROM mission_completions WHERE participant_address=$1 AND campaign_id='genesis'",
  [W("W11").address.toLowerCase()]
);
eq(mc.rows[0]?.mission_type, "ARENA", "the winner has an ARENA mission completion");
eq(mc.rows[0]?.evidence_type, "arena_route", "  … evidenced by the route");

const status = await api("/api/mint/status", { method: "GET", cookie: s11 });
eq(status.body.participant, true, "W11 is an arena participant");
const voucher = await api("/api/mint/voucher", { body: {}, cookie: s11 });
eq(voucher.status, 200, "W11 was issued a voucher");
eq(voucher.body.tier, "free", "  … the win outranks the discount: tier is free");
eq(voucher.body.price, "0", "  … price is 0");

head("4. W11 mints the won Passport");
const hash = await walletFor("W11").writeContract({
  address: CONTRACT,
  abi: [{ type: "tuple", name: "voucher", components: [{ name: "recipient", type: "address" }, { name: "campaign", type: "bytes32" }, { name: "nonce", type: "bytes32" }, { name: "deadline", type: "uint256" }, { name: "participant", type: "bool" }, { name: "free", type: "bool" }] },
        { type: "bytes", name: "signature" }] as any,
  functionName: "mint", args: [voucher.body.voucher, voucher.body.signature], value: 0n
} as any);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
eq(receipt.status, "success", "W11 minted for free");
const abi = [
  { type: "function", name: "missionQualified", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "tokenOf", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] }
] as const;
eq(await publicClient.readContract({ address: CONTRACT, abi, functionName: "missionQualified", args: [W("W11").address] }), true, "  … missionQualified(W11) is true");
console.log(`  W11 holds Passport #${await publicClient.readContract({ address: CONTRACT, abi, functionName: "tokenOf", args: [W("W11").address] })}`);

head("5. the board reflects the lane");
const board = await api("/api/arena/leaderboard", { method: "GET" });
eq(board.status, 200, "leaderboard fetched");
console.log("  standings:", JSON.stringify(board.body).slice(0, 400));

console.log(`\n${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
