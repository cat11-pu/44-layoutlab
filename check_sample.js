import fs from "node:fs";
import { layout } from "./layout.js";
import { addEdges } from "./incremental.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/layout.json", "utf8"));
const base = layout(spec.nodes, spec.edges || []);
const grown = addEdges(spec.nodes, spec.edges || [], spec.added_edges || [], base.positions);
const view = render(spec);

emit("每个节点的坐标 =", base.positions);
emit("每层节点 =", base.layers);
emit("交叉数 =", base.crossings);
emit("重排的节点 =", grown.moved);
emit("增量是否与全量一致 =", view.consistent);
emit("预算消耗 =", view.budget_used);
emit("自环的错误码 =", spec.self_loop_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "每个节点的坐标": {
    "n0": [
      0,
      0
    ],
    "n1": [
      0,
      1
    ],
    "n2": [
      1,
      1
    ],
    "n3": [
      0,
      2
    ]
  },
  "每层节点": [
    [
      "n0",
      0
    ],
    [
      "n1",
      1
    ],
    [
      "n2",
      1
    ],
    [
      "n3",
      2
    ]
  ],
  "交叉数": 0,
  "重排的节点": [
    "n3"
  ],
  "增量是否与全量一致": true,
  "预算消耗": 1,
  "自环的错误码": "E_SELF_LOOP"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
