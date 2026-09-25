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

check("layer is longest path from root, same layer sorted by id", () => {
  const sample = [
    { id: "n0" }, { id: "n1" }, { id: "n2" }, { id: "n3" },
  ];
  const result = layout(sample, [[0, 1], [0, 2], [1, 3]]);
  assert.deepStrictEqual(result.positions, {
    n0: [0, 0], n1: [0, 1], n2: [1, 1], n3: [0, 2],
  });
  assert.deepStrictEqual(result.layers, [["n0", 0], ["n1", 1], ["n2", 1], ["n3", 2]]);
});

check("addEdges only touches affected suffix and matches full relayout", () => {
  const sample = [
    { id: "n0" }, { id: "n1" }, { id: "n2" }, { id: "n3" },
  ];
  const edges = [[0, 1], [0, 2], [1, 3]];
  const base = layout(sample, edges);
  const grown = addEdges(sample, edges, [[2, 3]], base.positions);
  const full = layout(sample, edges.concat([[2, 3]]));
  assert.deepStrictEqual(grown.moved, ["n3"]);
  assert.deepStrictEqual(grown.positions, full.positions);
  assert.deepStrictEqual(grown.positions.n0, base.positions.n0);
  assert.deepStrictEqual(grown.positions.n2, base.positions.n2);
});

check("self loops raise E_SELF_LOOP without recursing", () => {
  try {
    layout([{ id: "x" }], [["x", "x"]]);
    throw new Error("self loop should throw");
  } catch (error) {
    assert.strictEqual(error.code, "E_SELF_LOOP");
  }
  try {
    addEdges([{ id: "x" }], [], [["x", "x"]], { x: [0, 0] });
    throw new Error("self loop should throw");
  } catch (error) {
    assert.strictEqual(error.code, "E_SELF_LOOP");
  }
});

console.log("8 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
