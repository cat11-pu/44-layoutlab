// app.js：渲染结果
import { layout } from "./layout.js";
import { addEdges } from "./incremental.js";

export function render(spec) {
  const base = layout(spec.nodes, spec.edges || []);
  const grown = addEdges(spec.nodes, spec.edges || [], spec.added_edges || [], base.positions);
  const full = layout(spec.nodes, (spec.edges || []).concat(spec.added_edges || []));
  const same = JSON.stringify(grown.positions) === JSON.stringify(full.positions);
  return { positions: base.positions, layers: base.layers, crossings: base.crossings,
           moved: grown.moved, consistent: same, budget_used: grown.moved.length };
}
