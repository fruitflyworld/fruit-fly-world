import test from "node:test";
import assert from "node:assert/strict";
import { parseRouteReply, type ReplyRead } from "../app/lib/arena-reply";

/** A six-station walk that is legal on the 6x4 grid. */
const CELLS_WALK = ["F-01", "F-02", "F-08", "F-14", "F-13", "F-19"];

const SIGNAL_LINES = [
  "food=82,threat=36,light=58,novelty=71",
  "food=10,threat=100,light=20,novelty=10",
  "food=90,threat=5,light=60,novelty=12",
  "food=40,threat=40,light=40,novelty=90",
  "food=55,threat=60,light=30,novelty=25",
  "food=5,threat=5,light=5,novelty=5"
];

function read(text: string): ReplyRead {
  const parsed = parseRouteReply(text);
  assert.ok(!("error" in parsed), `expected a route, got: ${"error" in parsed ? parsed.error : ""}`);
  return parsed;
}

function readError(text: string): string {
  const parsed = parseRouteReply(text);
  assert.ok("error" in parsed, `expected an error, got route ${JSON.stringify("route" in parsed ? parsed.route : null)}`);
  return parsed.error;
}

test("a Route: line with Signals: quads is read as the claim, signals and all", () => {
  const parsed = read([
    "Here is my answer.",
    "",
    `Route: ${CELLS_WALK.join(",")}`,
    "Signals:",
    ...SIGNAL_LINES
  ].join("\n"));

  assert.deepEqual(parsed.route, CELLS_WALK);
  assert.equal(parsed.source, "labels");
  assert.equal(parsed.signals?.length, 6);
  assert.deepEqual(parsed.signals?.[0], { food: 82, threat: 36, light: 58, novelty: 71 });
  assert.deepEqual(parsed.signals?.[5], { food: 5, threat: 5, light: 5, novelty: 5 });
});

test("a Route: line with no station table still yields the route, with signals left null", () => {
  const parsed = read(`Route: ${CELLS_WALK.join(",")}`);
  assert.deepEqual(parsed.route, CELLS_WALK);
  assert.equal(parsed.signals, null);
  assert.equal(parsed.source, "labels");
});

test("station names are normalised: F-1, f-2 and F_08 all land on the map", () => {
  const parsed = read("Route: f-1,F-2,F_08,f-14,F-13,F-19");
  assert.deepEqual(parsed.route, CELLS_WALK);
});

test("a JSON object with a route and object signals is read in full", () => {
  const parsed = read(JSON.stringify({
    route: CELLS_WALK,
    signals: [
      { food: 82, threat: 36, light: 58, novelty: 71 },
      { food: 10, threat: 100, light: 20, novelty: 10 },
      { food: 90, threat: 5, light: 60, novelty: 12 },
      { food: 40, threat: 40, light: 40, novelty: 90 },
      { food: 55, threat: 60, light: 30, novelty: 25 },
      { food: 5, threat: 5, light: 5, novelty: 5 }
    ]
  }));

  assert.deepEqual(parsed.route, CELLS_WALK);
  assert.equal(parsed.source, "json");
  assert.deepEqual(parsed.signals?.[2], { food: 90, threat: 5, light: 60, novelty: 12 });
});

test("JSON signals written as [food, threat, light, novelty] quads are accepted", () => {
  const parsed = read('{"route":["F-01","F-02"],"signals":[[70,10,40,80],[5,6,7,8]]}');
  assert.deepEqual(parsed.route, ["F-01", "F-02"]);
  assert.deepEqual(parsed.signals, [{ food: 70, threat: 10, light: 40, novelty: 80 }, { food: 5, threat: 6, light: 7, novelty: 8 }]);
});

test("a JSON object inside prose or a code fence is still found", () => {
  const parsed = read([
    "Sure — here is the route:",
    "```json",
    '{"route": ["F-01","F-02","F-08"]}',
    "```"
  ].join("\n"));
  assert.deepEqual(parsed.route, ["F-01", "F-02", "F-08"]);
  assert.equal(parsed.source, "json");
});

test("a bare JSON array of station names is read as the route", () => {
  const parsed = read('["F-01","F-02","F-08"]');
  assert.deepEqual(parsed.route, ["F-01", "F-02", "F-08"]);
  assert.equal(parsed.source, "json");
});

test("a JSON answer wrapped in an array is unwrapped, not read as cell names", () => {
  const parsed = read('[{"route":["F-01","F-02"],"signals":[[1,2,3,4],[5,6,7,8]]}]');
  assert.deepEqual(parsed.route, ["F-01", "F-02"]);
  assert.equal(parsed.source, "json");
  assert.deepEqual(parsed.signals?.[0], { food: 1, threat: 2, light: 3, novelty: 4 });
});

test("a claimed route that is not one walk is reported, not quietly shortened", () => {
  const message = readError('{"route":["F-01","F-19"]}');
  assert.match(message, /F-01 and F-19 are not neighbours on the map/);
});

test("a claimed route naming a cell off the map is reported", () => {
  const message = readError('{"route":["F-01","F-99"]}');
  assert.match(message, /F-99/);
  assert.match(message, /is not a station/);
});

test("a claimed route longer than six stations is reported", () => {
  const message = readError("Route: F-01,F-02,F-03,F-04,F-05,F-06,F-12");
  assert.match(message, /7 stations/);
  assert.match(message, /at most 6/);
});

test("a Route: label with no names after it is the template echoed back, not an answer", () => {
  const message = readError("Route: <cells joined by ,>\nSignals: <one line per station>");
  assert.match(message, /No stations in that answer/);
});

test("prose is read leniently: the best walk it contains is the answer", () => {
  const parsed = read("I checked the map and the strongest walk looks like F-01 then F-02, F-08, F-14, F-13 and finally F-19.");
  assert.deepEqual(parsed.route, CELLS_WALK);
  assert.equal(parsed.source, "cells");
  assert.equal(parsed.signals, null);
});

test("prose with more than six connected stations is capped at ARENA_STEPS", () => {
  const parsed = read("Try F-01 F-02 F-03 F-04 F-05 F-06 F-12 F-18 and see how it scores.");
  assert.equal(parsed.route.length, 6);
  assert.deepEqual(parsed.route, ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06"]);
});

test("signals out of range leave the table null rather than clamping it", () => {
  const parsed = read([
    "Route: F-01,F-02",
    "food=120,threat=10,light=40,novelty=80",
    "food=10,threat=10,light=10,novelty=10"
  ].join("\n"));
  assert.deepEqual(parsed.route, ["F-01", "F-02"]);
  assert.equal(parsed.signals, null);
});

test("a partial station table leaves signals null rather than filling the gap", () => {
  const parsed = read(["Route: " + CELLS_WALK.join(","), ...SIGNAL_LINES.slice(0, 3)].join("\n"));
  assert.deepEqual(parsed.route, CELLS_WALK);
  assert.equal(parsed.signals, null);
});

test("answers that are not answers at all are reported and never throw", () => {
  const junk = [
    "",
    "   ",
    "I can't help with that.",
    "Sorry, I need more context about the map.",
    "---",
    "null"
  ];
  for (const text of junk) {
    const message = readError(text);
    assert.ok(message.length > 0);
  }
});
