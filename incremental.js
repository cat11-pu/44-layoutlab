// incremental.js：增量加边
// 新增边只会抬高（或不动）其可达节点的层号，因此以“新增边目标点的最小旧层号”
// 为界 L：层号 < L 的节点集合不变、层内次序不变，坐标与全量重排必然一致，
// 原样保留；只对层号 >= L 的层重新分层、重新排 x。
// 分层本身仍是一次线性 Kahn 扫描，重排范围不超过受影响后缀，绝不整张重排。

import { computeLayers, endpointId, naturalCmp, selfLoopError } from "./layout.js";

export function addEdges(nodes, edges, added, positions) {
  const list = nodes || [];
  const oldEdges = edges || [];
  const newEdges = added || [];
  const base = positions || {};

  // 先校验新增边的自环，Kahn 对环也只是残留，不递归、不死循环。
  newEdges.forEach((edge) => {
    const from = endpointId(list, edge[0]);
    const to = endpointId(list, edge[1]);
    if (from === to) { throw selfLoopError(from); }
  });

  const allEdges = oldEdges.concat(newEdges);

  // 没有新增边：什么都不重排（moved 为空），坐标原样返回，绝不整张重排。
  if (newEdges.length === 0) {
    const unchanged = {};
    list.forEach((node) => { if (base[node.id]) { unchanged[node.id] = [base[node.id][0], base[node.id][1]]; } });
    return { positions: unchanged, moved: [] };
  }

  const layer = computeLayers(list, allEdges);

  // 受影响层边界：新增边目标点当前所在层（旧坐标）的最小值。
  let boundary = null;
  newEdges.forEach((edge) => {
    const to = endpointId(list, edge[1]);
    const oldLayer = base[to] ? base[to][1] : 0;
    if (boundary === null || oldLayer < boundary) { boundary = oldLayer; }
  });

  const result = {};
  const moved = [];
  list.forEach((node) => {
    const id = node.id;
    if (boundary !== null && base[id] && layer.get(id) < boundary) {
      // 前缀层：层内成员与编号次序都未变，沿用旧坐标即可，与全量结果逐项一致。
      result[id] = [base[id][0], base[id][1]];
    } else {
      moved.push(id);
    }
  });

  moved.sort(naturalCmp);
  const byLayer = new Map();
  moved.forEach((id) => {
    const key = layer.get(id);
    if (!byLayer.has(key)) { byLayer.set(key, []); }
    byLayer.get(key).push(id);
  });
  byLayer.forEach((ids) => {
    ids.sort(naturalCmp);
    ids.forEach((id, x) => { result[id] = [x, layer.get(id)]; });
  });

  return { positions: result, moved: moved };
}
