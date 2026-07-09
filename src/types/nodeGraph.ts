/**
 * Types and operation definitions for the DaVinci Resolve-style node pipeline.
 *
 * Each op node maps 1:1 to a shader pass on the backend: the graph is
 * topologically sorted, serialized into `adjustments.nodePipeline` and executed
 * by the Rust/WGPU backend as a chain of passes over the monolithic shader,
 * with only that node's operation enabled per pass (see
 * src-tauri/src/image_processing.rs `op_flags` / `get_node_passes_from_json`).
 */

export const SOURCE_NODE_ID = '__source__';
export const OUTPUT_NODE_ID = '__output__';

/** Op identifiers understood by the backend (op_flags::bits_for_op). */
export type NodeOpType =
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'tone'
  | 'whiteBalance'
  | 'saturation'
  | 'vibrance'
  | 'hue'
  | 'curves'
  | 'details'
  | 'dehaze'
  | 'effects';

/**
 * A node's parameter bag. Most ops store plain numbers keyed by their param
 * (`exposure`, `contrast`, …), but richer nodes store structured adjustment
 * values under standard keys the backend already understands — e.g. a Tone
 * Curve node stores `{ curves: {...}, curveMode: 'point' }`. The backend runs
 * each node's `values` through `get_all_adjustments_from_json`, so any standard
 * adjustment key is valid here.
 */
export type NodeValues = Record<string, unknown>;

export type GraphNodeKind = NodeOpType | 'source' | 'output';

/**
 * A single numeric parameter an op contributes to the pipeline. The concrete
 * per-op parameter lists and their UI now live in the node modules under
 * `src/components/nodegraph/node/[op].tsx`, aggregated by that folder's
 * registry; this stays here as the shared shape.
 */
export interface NodeParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/** A node of the editing DAG. Structure is kept React Flow-compatible. */
export interface GraphNode {
  id: string;
  op: GraphNodeKind;
  position: { x: number; y: number };
  enabled: boolean;
  values: NodeValues;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

/** One entry of the serialized, topologically sorted pipeline sent to Rust. */
export interface NodePipelineEntry {
  op: NodeOpType;
  enabled: boolean;
  values: NodeValues;
}

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
