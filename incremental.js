// incremental.js：增量重排（基线：整张重排）
import { layout } from "./layout.js";

export function addEdges(nodes, edges, added, positions) {
  const fresh = layout(nodes, edges.concat(added));
  return { positions: fresh.positions, moved: nodes.map((node) => node.id) };
}
