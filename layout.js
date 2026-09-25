// layout.js：分层排版（最长路径分层，同层按编号升序排 x）

export function resolveId(nodes, ref) {
  if (typeof ref === "number") return nodes[ref] ? nodes[ref].id : null;
  return ref;
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function numberSuffix(id) {
  const matched = String(id).match(/\d+$/);
  return matched ? parseInt(matched[0], 10) : null;
}

export function byNumber(a, b) {
  const na = numberSuffix(a);
  const nb = numberSuffix(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

// 一次线性扫描（Kahn 拓扑 + 最长路径），自环直接报错，环也不会递归死循环。
export function computeLayers(nodes, edges) {
  const ids = nodes.map((node) => node.id);
  const adjacency = new Map();
  const indegree = new Map();
  for (const id of ids) {
    adjacency.set(id, []);
    indegree.set(id, 0);
  }
  for (const edge of edges || []) {
    const source = resolveId(nodes, edge[0]);
    const target = resolveId(nodes, edge[1]);
    if (source === target) fail("E_SELF_LOOP", "self loop at " + source);
    if (!adjacency.has(source) || !adjacency.has(target)) {
      fail("E_UNKNOWN_NODE", "unknown endpoint in edge " + JSON.stringify(edge));
    }
    adjacency.get(source).push(target);
    indegree.set(target, indegree.get(target) + 1);
  }

  const layer = new Map(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => indegree.get(id) === 0);
  let seen = 0;
  for (let head = 0; head < queue.length; head++) {
    const source = queue[head];
    seen += 1;
    for (const target of adjacency.get(source)) {
      if (layer.get(source) + 1 > layer.get(target)) {
        layer.set(target, layer.get(source) + 1);
      }
      const left = indegree.get(target) - 1;
      indegree.set(target, left);
      if (left === 0) queue.push(target);
    }
  }
  if (seen < ids.length) fail("E_CYCLE", "graph contains a cycle");
  return { layer, ids };
}

// 归并计数严格逆序对：target 相同不算交叉；O(n log n)。
function inversionCount(values) {
  const work = values.slice();
  const buffer = new Array(values.length);
  let crossings = 0;
  function sort(lo, hi) {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid, hi);
    let i = lo;
    let j = mid;
    let k = lo;
    while (i < mid && j < hi) {
      if (work[i] <= work[j]) {
        buffer[k++] = work[i++];
      } else {
        crossings += mid - i;
        buffer[k++] = work[j++];
      }
    }
    while (i < mid) buffer[k++] = work[i++];
    while (j < hi) buffer[k++] = work[j++];
    for (let p = lo; p < hi; p++) work[p] = buffer[p];
  }
  sort(0, values.length);
  return crossings;
}

function countCrossings(edges, nodes, xOf, layerOf) {
  let maxLayer = 0;
  for (const y of layerOf.values()) if (y > maxLayer) maxLayer = y;

  let total = 0;
  for (let y = 0; y < maxLayer; y++) {
    const spans = [];
    for (const edge of edges || []) {
      const source = resolveId(nodes, edge[0]);
      const target = resolveId(nodes, edge[1]);
      if (layerOf.get(source) === y && layerOf.get(target) === y + 1) {
        spans.push([xOf[source], xOf[target]]);
      }
    }
    // 同一起点按 target 升序打破并列，避免共享端点被误计。
    spans.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    total += inversionCount(spans.map((span) => span[1]));
  }
  return total;
}

export function layout(nodes, edges) {
  const { layer } = computeLayers(nodes, edges);

  const members = new Map();
  for (const id of layer.keys()) {
    const y = layer.get(id);
    if (!members.has(y)) members.set(y, []);
    members.get(y).push(id);
  }

  const positions = {};
  for (const group of members.values()) {
    group.sort(byNumber);
    group.forEach((id, x) => { positions[id] = [x, layer.get(id)]; });
  }

  return {
    positions,
    layers: nodes.map((node) => [node.id, layer.get(node.id)]),
    crossings: countCrossings(edges, nodes, positions, layer),
  };
}
