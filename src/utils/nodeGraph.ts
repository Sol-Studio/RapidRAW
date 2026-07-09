import { v4 as uuidv4 } from 'uuid';
import {
  GraphEdge,
  GraphNode,
  NodeGraphData,
  NodeOpType,
  NodePipelineEntry,
  OUTPUT_NODE_ID,
  SOURCE_NODE_ID,
} from '../types/nodeGraph';
import { allNodeDefinitions, getNodeDefinition, getNodeParams } from '../components/nodegraph/node/registry';
import { getDefaultCurves } from './adjustments';

/**
 * Kahn's algorithm. Returns nodes in dependency order; nodes that are part of a
 * cycle are omitted (the editor prevents cycles at connect time, this is a
 * safety net for persisted data).
 */
export function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: GraphNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(byId.get(id) as GraphNode);
    for (const target of adjacency.get(id) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }
  return order;
}

function reachable(startId: string, edges: GraphEdge[], direction: 'forward' | 'backward'): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const [from, to] = direction === 'forward' ? [edge.source, edge.target] : [edge.target, edge.source];
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  }
  const visited = new Set<string>([startId]);
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return visited;
}

/** True when adding source -> target would create a cycle. */
export function wouldCreateCycle(source: string, target: string, edges: GraphEdge[]): boolean {
  if (source === target) return true;
  return reachable(target, edges, 'forward').has(source);
}

/**
 * Serializes the graph into the ordered pass list consumed by the Rust backend.
 * Only op nodes lying on a path from the source node to the output node are
 * active; dangling branches are ignored, matching how Resolve treats
 * disconnected nodes.
 */
export function serializeNodePipeline(nodes: GraphNode[], edges: GraphEdge[]): NodePipelineEntry[] {
  const fromSource = reachable(SOURCE_NODE_ID, edges, 'forward');
  const toOutput = reachable(OUTPUT_NODE_ID, edges, 'backward');
  return topologicalSort(nodes, edges)
    .filter((n) => n.op !== 'source' && n.op !== 'output' && fromSource.has(n.id) && toOutput.has(n.id))
    .map((n) => ({
      op: n.op as NodeOpType,
      enabled: n.enabled !== false,
      values: { ...n.values },
    }));
}

/**
 * Flattens the pipeline into a single legacy adjustments patch. Every parameter
 * controlled by some op type is reset to its default first, so removing a node
 * removes its contribution; graph-owned parameters are the graph's source of
 * truth while graph mode is active.
 *
 * Numeric params reset to their spec defaults; structured params (curves) reset
 * to their neutral identity so a removed Tone Curve node reverts thumbnails and
 * other flat-adjustment consumers.
 */
export function flattenNodePipeline(pipeline: NodePipelineEntry[]): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  for (const def of allNodeDefinitions()) {
    for (const param of def.params) {
      flattened[param.key] = param.defaultValue;
    }
  }
  // Neutral defaults for the structured (non-slider) node values.
  flattened.curves = getDefaultCurves();
  flattened.curveMode = 'point';

  for (const entry of pipeline) {
    if (!entry.enabled) continue;
    for (const [key, value] of Object.entries(entry.values)) {
      if (typeof value === 'number') {
        if (Number.isFinite(value)) flattened[key] = value;
      } else if (value !== undefined && value !== null) {
        // Structured values (curves object, curveMode string) pass through as-is.
        flattened[key] = value;
      }
    }
  }
  return flattened;
}

/** Horizontal anchor and vertical spacing for the top-to-bottom node chain. */
export const NODE_CHAIN_X = 120;
export const NODE_CHAIN_TOP_Y = 20;
export const NODE_CHAIN_STEP_Y = 120;

export function createDefaultGraph(): NodeGraphData {
  return {
    nodes: [
      { id: SOURCE_NODE_ID, op: 'source', position: { x: NODE_CHAIN_X, y: NODE_CHAIN_TOP_Y }, enabled: true, values: {} },
      {
        id: OUTPUT_NODE_ID,
        op: 'output',
        position: { x: NODE_CHAIN_X, y: NODE_CHAIN_TOP_Y + NODE_CHAIN_STEP_Y * 3 },
        enabled: true,
        values: {},
      },
    ],
    edges: [{ id: `e-${SOURCE_NODE_ID}-${OUTPUT_NODE_ID}`, source: SOURCE_NODE_ID, target: OUTPUT_NODE_ID }],
  };
}

export function createOpNode(op: NodeOpType, position: { x: number; y: number }): GraphNode {
  const def = getNodeDefinition(op);
  const values: Record<string, unknown> = def?.initialValues ? def.initialValues() : {};
  for (const param of getNodeParams(op)) {
    if (values[param.key] === undefined) values[param.key] = param.defaultValue;
  }
  return { id: uuidv4(), op, position, enabled: true, values };
}
