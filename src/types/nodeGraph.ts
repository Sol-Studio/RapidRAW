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
  | 'details'
  | 'dehaze'
  | 'effects';

export type GraphNodeKind = NodeOpType | 'source' | 'output';

export interface NodeParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface NodeOpDefinition {
  op: NodeOpType;
  label: string;
  params: NodeParamSpec[];
}

const p = (key: string, label: string, min = -100, max = 100, step = 1, defaultValue = 0): NodeParamSpec => ({
  key,
  label,
  min,
  max,
  step,
  defaultValue,
});

export const NODE_OP_DEFINITIONS: Record<NodeOpType, NodeOpDefinition> = {
  exposure: { op: 'exposure', label: 'Exposure', params: [p('exposure', 'Exposure', -5, 5, 0.01)] },
  brightness: { op: 'brightness', label: 'Brightness', params: [p('brightness', 'Brightness', -5, 5, 0.01)] },
  contrast: { op: 'contrast', label: 'Contrast', params: [p('contrast', 'Contrast')] },
  tone: {
    op: 'tone',
    label: 'Tone',
    params: [
      p('highlights', 'Highlights'),
      p('shadows', 'Shadows'),
      p('whites', 'Whites'),
      p('blacks', 'Blacks'),
    ],
  },
  whiteBalance: {
    op: 'whiteBalance',
    label: 'White Balance',
    params: [p('temperature', 'Temperature'), p('tint', 'Tint')],
  },
  saturation: { op: 'saturation', label: 'Saturation', params: [p('saturation', 'Saturation')] },
  vibrance: { op: 'vibrance', label: 'Vibrance', params: [p('vibrance', 'Vibrance')] },
  hue: { op: 'hue', label: 'Hue', params: [p('hue', 'Hue', -180, 180)] },
  details: {
    op: 'details',
    label: 'Details',
    params: [
      p('sharpness', 'Sharpness'),
      p('clarity', 'Clarity'),
      p('structure', 'Structure'),
      p('lumaNoiseReduction', 'Luma NR', 0, 100),
      p('colorNoiseReduction', 'Color NR', 0, 100),
    ],
  },
  dehaze: { op: 'dehaze', label: 'Dehaze', params: [p('dehaze', 'Dehaze')] },
  effects: {
    op: 'effects',
    label: 'Effects',
    params: [
      p('vignetteAmount', 'Vignette'),
      p('grainAmount', 'Grain', 0, 100),
      p('glowAmount', 'Glow', 0, 100),
      p('halationAmount', 'Halation', 0, 100),
      p('flareAmount', 'Flare', 0, 100),
    ],
  },
};

export const NODE_OP_TYPES = Object.keys(NODE_OP_DEFINITIONS) as NodeOpType[];

/** A node of the editing DAG. Structure is kept React Flow-compatible. */
export interface GraphNode {
  id: string;
  op: GraphNodeKind;
  position: { x: number; y: number };
  enabled: boolean;
  values: Record<string, number>;
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
  values: Record<string, number>;
}

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
