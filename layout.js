// layout.js：分层排版
// 层号 = 到根的最长路径长度（Kahn 拓扑，一次线性扫描，无递归）；
// 同层节点按编号升序分配 x，坐标为 [x, layer]。

export function endpointId(nodes, endpoint) {
  if (typeof endpoint === "number") {
    const node = nodes[endpoint];
    if (!node) { throw new Error("E_BAD_ENDPOINT: 边端点下标越界 " + endpoint); }
    return node.id;
  }
  return endpoint;
}

export function selfLoopError(id) {
  const error = new Error("E_SELF_LOOP: 节点 " + id + " 存在自环");
  error.code = "E_SELF_LOOP";
  return error;
}

// 编号自然序：n2 < n10；非数字段按字典序。
export function naturalCmp(a, b) {
  const pa = String(a).split(/(\d+)/);
  const pb = String(b).split(/(\d+)/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if (pa[i] === pb[i]) { continue; }
    if (pa[i] === undefined) { return -1; }
    if (pb[i] === undefined) { return 1; }
    if (/^\d+$/.test(pa[i]) && /^\d+$/.test(pb[i])) {
      const diff = Number(pa[i]) - Number(pb[i]);
      if (diff !== 0) { return diff < 0 ? -1 : 1; }
    }
    return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

function normalize(nodes, edges) {
  return edges.map((edge) => {
    const from = endpointId(nodes, edge[0]);
    const to = endpointId(nodes, edge[1]);
    if (from === to) { throw selfLoopError(from); }
    return [from, to];
  });
}

// 返回 Map<id, layer>，时间 O(V + E)。Kahn 迭代，环上残留节点保持层 0，不会死循环。
export function computeLayers(nodes, edges) {
  const ids = nodes.map((node) => node.id);
  const norm = normalize(nodes, edges);
  const outgoing = new Map();
  const indegree = new Map();
  const layer = new Map();
  ids.forEach((id) => { outgoing.set(id, []); indegree.set(id, 0); layer.set(id, 0); });

  for (const [from, to] of norm) {
    outgoing.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }

  const queue = ids.filter((id) => indegree.get(id) === 0);
  for (let head = 0; head < queue.length; head += 1) {
    const from = queue[head];
    for (const to of outgoing.get(from)) {
      layer.set(to, Math.max(layer.get(to), layer.get(from) + 1));
      indegree.set(to, indegree.get(to) - 1);
      if (indegree.get(to) === 0) { queue.push(to); }
    }
  }
  return layer;
}

// 交叉数：两条边源同层、目标同层且端点次序相反即交叉。
// 按 (源层, 目标层) 分组，组内按源 x 扫描、Fenwick 统计目标 x 逆序对，总计 O(E log V)。
function countCrossings(norm, layer, positions) {
  const groups = new Map();
  norm.forEach(([from, to]) => {
    if (!positions[from] || !positions[to]) { return; }
    const key = layer.get(from) + "\u0000" + layer.get(to);
    if (!groups.has(key)) { groups.set(key, []); }
    groups.get(key).push([positions[from][0], positions[to][0]]);
  });

  let crossings = 0;
  groups.forEach((pairs) => {
    pairs.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    let maxTarget = 0;
    pairs.forEach((pair) => { maxTarget = Math.max(maxTarget, pair[1]); });
    const bit = new Int32Array(maxTarget + 2);
    const add = (index) => { for (let k = index + 1; k < bit.length; k += k & -k) { bit[k] += 1; } };
    // 严格大于 index 的已插入目标数。
    const greaterThan = (index) => {
      let total = 0;
      let le = 0;
      for (let k = bit.length - 1; k > 0; k -= k & -k) { total += bit[k]; }
      for (let k = index + 1; k > 0; k -= k & -k) { le += bit[k]; }
      return total - le;
    };
    let i = 0;
    while (i < pairs.length) {
      let j = i;
      // 同源的边不交叉：先统计再整批插入。
      while (j < pairs.length && pairs[j][0] === pairs[i][0]) { j += 1; }
      for (let k = i; k < j; k += 1) { crossings += greaterThan(pairs[k][1]); }
      for (let k = i; k < j; k += 1) { add(pairs[k][1]); }
      i = j;
    }
  });
  return crossings;
}

export function layout(nodes, edges) {
  const list = nodes || [];
  const edgeList = edges || [];
  const norm = normalize(list, edgeList);
  const layer = computeLayers(list, edgeList);

  const byLayer = new Map();
  list.forEach((node) => {
    const key = layer.get(node.id);
    if (!byLayer.has(key)) { byLayer.set(key, []); }
    byLayer.get(key).push(node.id);
  });

  const positions = {};
  byLayer.forEach((ids) => {
    ids.sort(naturalCmp);
    ids.forEach((id, x) => { positions[id] = [x, layer.get(id)]; });
  });

  const layers = list.map((node) => [node.id, layer.get(node.id)]);
  const crossings = countCrossings(norm, layer, positions);
  return { positions: positions, layers: layers, crossings: crossings };
}
