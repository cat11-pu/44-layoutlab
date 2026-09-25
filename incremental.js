// incremental.js：增量重排（只重排受影响层及其后续层，不做整张重排）
import { byNumber, computeLayers, resolveId } from "./layout.js";

export function addEdges(nodes, edges, added, positions) {
  const addedEdges = added || [];
  const previous = positions || {};

  const next = {};
  for (const id of Object.keys(previous)) next[id] = previous[id].slice();

  // 分层是线性操作；新分层只用于确定受影响范围，不触碰范围外节点的坐标。
  const { layer } = computeLayers(nodes, (edges || []).concat(addedEdges));

  let start = Infinity;
  for (const edge of addedEdges) {
    const target = resolveId(nodes, edge[1]);
    const oldLayer = previous[target] ? previous[target][1] : 0;
    if (oldLayer < start) start = oldLayer;
  }
  if (start === Infinity) return { positions: next, moved: [] };

  // 新边只会让目标层及其下游层号变大；最早可能变动的层 = 目标旧层号的最小值。
  // 该层以下的成员集合与编号顺序都不会变，因此坐标保持不动即与整张重排一致。
  const groups = new Map();
  for (const id of layer.keys()) {
    const y = layer.get(id);
    if (y >= start) {
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(id);
    }
  }

  const touched = new Set();
  for (const [y, group] of groups) {
    group.sort(byNumber);
    group.forEach((id, x) => {
      next[id] = [x, y];
      touched.add(id);
    });
  }

  return { positions: next, moved: Array.from(touched).sort(byNumber) };
}
