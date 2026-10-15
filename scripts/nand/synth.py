#!/usr/bin/env python3
"""synth.py — FFW-NAND/1 truth table -> NAND-only netlist in TapeOut's encoding.

  espresso (two-level minimisation, optional don't-cares) -> Verilog SOP
  -> yosys + ABC mapped to NAND/NOT -> NOT(x) becomes NAND(x,x)
  -> topological gate list, outputs last -> verified on every input word.

usage: synth.py [--mode exact|dc] [--espresso PATH] [--table T] [--out O]
  exact: every one of the 4096 words is implemented as the table says.
  dc:    words FFW-CX/0.1 never visited are don't-cares; the netlist decides them.
Needs: espresso (github.com/classabbyamp/espresso-logic) and yowasp-yosys (pip).
"""
import argparse, json, os, subprocess, tempfile, sys

ap = argparse.ArgumentParser()
ap.add_argument("--mode", default="exact", choices=["exact", "dc"])
ap.add_argument("--espresso", default=os.environ.get("ESPRESSO", "espresso"))
ap.add_argument("--yosys", default="yowasp-yosys")
ap.add_argument("--table", default="app/lib/nand/ffw-nand-1.table.json")
ap.add_argument("--out", default="app/lib/nand/ffw-nand-1.netlist.json")
ap.add_argument("--rounds", type=int, default=6)
a = ap.parse_args()

T = json.load(open(a.table))
NIN, NOUT = 12, 3
table, seen = T["out"], T["seen"]
care = lambda w: a.mode == "exact" or seen[w] == 1

tmp = os.path.relpath(tempfile.mkdtemp(dir="."))  # yowasp (WASI) only sees the working directory
import atexit, shutil; atexit.register(shutil.rmtree, tmp, True)
# ---- 1. espresso: one PLA, input column j = input bit j ----
pla = [f".i {NIN}", f".o {NOUT}", ".type fd" if a.mode == "dc" else ".type f"]
for w in range(1 << NIN):
    ins = "".join(str((w >> j) & 1) for j in range(NIN))
    if care(w):
        outs = "".join(str((table[w] >> k) & 1) for k in range(NOUT))
        if "1" in outs or a.mode == "exact":
            pla.append(f"{ins} {outs}")
    else:
        pla.append(f"{ins} {'-' * NOUT}")
pla.append(".e")
open(f"{tmp}/t.pla", "w").write("\n".join(pla) + "\n")
res = subprocess.run([a.espresso, f"{tmp}/t.pla"], capture_output=True, text=True, check=True).stdout
cubes = [l.split() for l in res.splitlines() if l and l[0] in "01-"]

# ---- 2. Verilog sum of products ----
terms = [[] for _ in range(NOUT)]
for ins, outs in cubes:
    lits = [("i[%d]" % j) if c == "1" else ("~i[%d]" % j) for j, c in enumerate(ins) if c != "-"]
    t = "(" + " & ".join(lits) + ")" if lits else "1'b1"
    for k, c in enumerate(outs):
        if c == "1": terms[k].append(t)
v = ["module brain(input [11:0] i, output [2:0] o);"]
for k in range(NOUT):
    v.append(f"  assign o[{k}] = {' | '.join(terms[k]) if terms[k] else chr(39)+'b0'};".replace("= 'b0", "= 1'b0"))
v.append("endmodule")
open(f"{tmp}/b.v", "w").write("\n".join(v) + "\n")

# ---- 3. yosys + ABC, NAND/NOT only; keep the smallest of a few ABC scripts ----
best = None
scripts = ["abc -g NAND", "abc -g NAND; opt; abc -g NAND", "abc -g AND; abc -g NAND",
           "abc -g NAND -dff; opt -full; abc -g NAND"]
for r in range(a.rounds):
    sc = scripts[r % len(scripts)]
    y = (f"read_verilog {tmp}/b.v; synth -flatten -top brain; opt -full; "
         + "; ".join([sc] * (1 + r // len(scripts))) + f"; opt_clean -purge; write_json {tmp}/n{r}.json")
    p = subprocess.run([a.yosys, "-q", "-p", y], capture_output=True, text=True)
    if p.returncode: sys.exit(p.stdout[-2000:] + p.stderr[-2000:])
    J = json.load(open(f"{tmp}/n{r}.json"))["modules"]["brain"]
    cells = list(J["cells"].values())
    kinds = {c["type"] for c in cells}
    assert kinds <= {"$_NAND_", "$_NOT_"}, kinds
    cost = sum(1 for c in cells)
    if best is None or cost < best[0]: best = (cost, J, sc)
cost, J, used = best

# ---- 4. to TapeOut signals: 0/1 const, 2..13 inputs, gates after ----
ports = J["ports"]
bit_sig = {}
for j, b in enumerate(ports["i"]["bits"]): bit_sig[b] = 2 + j
drivers = {}
for c in J["cells"].values():
    y = c["connections"]["Y"][0]
    ins = [c["connections"]["A"][0]] + ([c["connections"]["B"][0]] if c["type"] == "$_NAND_" else [])
    drivers[y] = ins
gates, order = [], {}
def sig(b):
    if b == "0": return 0
    if b == "1": return 1
    if b in bit_sig: return bit_sig[b]
    if b in order: return order[b]
    ins = [sig(x) for x in drivers[b]]
    gates.append([ins[0], ins[-1]])            # NOT(x) = NAND(x, x)
    order[b] = 2 + NIN + len(gates) - 1
    return order[b]
sys.setrecursionlimit(100000)
outs = [sig(b) for b in ports["o"]["bits"]]
# outputs must be the last NOUT signals, in order. Helper gates first, then one final
# gate per output: a gate output is re-emitted (same two inputs); an input x becomes
# NAND(~x, ~x); constant 0 is NAND(1, 1) and constant 1 is NAND(0, 0).
final = []
for s in outs:
    if s >= 2 + NIN: final.append(list(gates[s - 2 - NIN]))
    elif s == 0: final.append([1, 1])
    elif s == 1: final.append([0, 0])
    else:
        gates.append([s, s]); n = 2 + NIN + len(gates) - 1
        final.append([n, n])
gates.extend(final)
net = {"version": "FFW-NAND/1", "nIn": NIN, "nOut": NOUT, "mode": a.mode, "gates": gates}

# ---- 5. verify on every word ----
def ev(n, w):
    s = [0, 1] + [(w >> j) & 1 for j in range(NIN)]
    for x, y in n["gates"]: s.append(0 if (s[x] and s[y]) else 1)
    return sum(s[len(s) - NOUT + k] << k for k in range(NOUT))
bad = [w for w in range(1 << NIN) if care(w) and ev(net, w) != table[w]]
assert not bad, f"{len(bad)} words differ, first {bad[:5]}"
diff_fill = sum(1 for w in range(1 << NIN) if ev(net, w) != table[w])
json.dump(net, open(a.out, "w"), separators=(",", ":"))
open(a.out, "a").write("\n")
print(json.dumps({"mode": a.mode, "cubes": len(cubes), "nand_gates": len(gates), "abc": used,
                  "words_checked": sum(1 for w in range(1 << NIN) if care(w)), "unseen_words_decided_differently_from_fill": diff_fill}))
