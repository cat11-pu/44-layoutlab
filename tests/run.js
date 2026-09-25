import assert from "node:assert";
import { layout } from "../layout.js";
import { addEdges } from "../incremental.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const nodes = [{ id: "n0" }, { id: "n1" }];
const edges = [[0, 1]];

check("layout gives a position per node", () => {
  assert.strictEqual(Object.keys(layout(nodes, edges).positions).length, 2);
});

check("layout reports crossings", () => {
  assert.strictEqual(typeof layout(nodes, edges).crossings, "number");
});

check("addEdges returns moved list", () => {
  assert.ok(Array.isArray(addEdges(nodes, edges, [], layout(nodes, edges).positions).moved));
});

check("addEdges returns positions", () => {
  assert.strictEqual(typeof addEdges(nodes, edges, [], layout(nodes, edges).positions).positions, "object");
});

check("render exposes consistent flag", () => {
  assert.strictEqual(typeof render({ nodes: nodes, edges: edges, added_edges: [] }).consistent, "boolean");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
