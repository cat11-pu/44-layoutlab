// layout.js：分层排版（基线：全部放在一层）
export function layout(nodes, edges) {
  const positions = {};
  nodes.forEach((node, index) => { positions[node.id] = [index, 0]; });
  return { positions: positions, layers: nodes.map(() => 0), crossings: 0 };
}
