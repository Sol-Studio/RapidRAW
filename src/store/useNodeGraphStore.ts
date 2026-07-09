import { create } from 'zustand';
import { GraphEdge, GraphNode, NodeGraphData, NodeOpType, NodeValues } from '../types/nodeGraph';
import {
  NODE_CHAIN_STEP_Y,
  NODE_CHAIN_TOP_Y,
  NODE_CHAIN_X,
  createDefaultGraph,
  createOpNode,
  wouldCreateCycle,
} from '../utils/nodeGraph';

/**
 * Canonical DAG state of the node-based editing pipeline.
 *
 * This replaces the flat "one object of sliders" model as the source of truth
 * while graph mode is active: the render sequence is derived by topologically
 * sorting these nodes (utils/nodeGraph.ts) and serializing them into
 * `adjustments.nodePipeline`, which the Rust backend turns into one GPU shader
 * pass per node.
 */
interface NodeGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];

  setGraph: (graph: NodeGraphData) => void;
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  addOpNode: (op: NodeOpType, position?: { x: number; y: number }) => GraphNode;
  removeNode: (id: string) => void;
  updateNodeValues: (id: string, values: NodeValues) => void;
  setNodeEnabled: (id: string, enabled: boolean) => void;
  connect: (source: string, target: string) => boolean;
  disconnect: (edgeId: string) => void;
  reset: () => void;
}

export const useNodeGraphStore = create<NodeGraphState>((set, get) => ({
  ...createDefaultGraph(),

  setGraph: (graph) => set({ nodes: graph.nodes, edges: graph.edges }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addOpNode: (op, position) => {
    const { nodes } = get();
    const opCount = nodes.filter((n) => n.op !== 'source' && n.op !== 'output').length;
    // Default stagger stacks vertically (top-to-bottom chain); callers that
    // splice into the chain pass an explicit position instead.
    const node = createOpNode(
      op,
      position ?? { x: NODE_CHAIN_X, y: NODE_CHAIN_TOP_Y + NODE_CHAIN_STEP_Y * (opCount + 1) },
    );
    set({ nodes: [...nodes, node] });
    return node;
  },

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  updateNodeValues: (id, values) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, values: { ...n.values, ...values } } : n)),
    })),

  setNodeEnabled: (id, enabled) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, enabled } : n)),
    })),

  connect: (source, target) => {
    const { edges } = get();
    if (wouldCreateCycle(source, target, edges)) return false;
    if (edges.some((e) => e.source === source && e.target === target)) return false;
    set({ edges: [...edges, { id: `e-${source}-${target}-${Date.now()}`, source, target }] });
    return true;
  },

  disconnect: (edgeId) => set((state) => ({ edges: state.edges.filter((e) => e.id !== edgeId) })),

  reset: () => set({ ...createDefaultGraph() }),
}));
