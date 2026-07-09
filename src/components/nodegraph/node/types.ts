import { ComponentType } from 'react';
import { GraphNode, NodeOpType, NodeParamSpec, NodeValues } from '../../../types/nodeGraph';

/**
 * Props handed to every node's `Body` component. The editor binds the node id
 * away, so a body only deals with its own node and a plain `(key, value)`
 * updater — it never needs to know how commits are throttled or persisted.
 *
 * This is the extension seam: a slider node calls `onValueChange` from an
 * `<input type="range">`, but a Curve node can render an SVG editor and call the
 * exact same updater with its control-point coordinates. Anything that reads
 * `node.values` and writes numbers back fits here without touching the editor.
 */
export interface NodeBodyProps {
  node: GraphNode;
  /**
   * Update a single numeric parameter. `dragging` should be `true` for the
   * continuous stream of a drag (throttled IPC commit) and `false` on release
   * (flushes the final value).
   */
  onValueChange: (key: string, value: number, dragging: boolean) => void;
  /**
   * Merge several values at once — for structured, non-scalar state such as a
   * curve's control points (`{ curves: {...} }`). Same `dragging` semantics as
   * `onValueChange`.
   */
  onValuesChange: (values: NodeValues, dragging: boolean) => void;
}

/**
 * A node type, authored as a self-contained module under `node/[op].tsx`.
 *
 * `params` stays declarative because the render pipeline and the legacy-flatten
 * path (utils/nodeGraph.ts) need to know every numeric key an op owns and its
 * default — independent of how the UI happens to look. `Body` is the actual
 * React UI shown inside the node card.
 *
 * To add a node with custom UI (e.g. a curve), declare its numeric `params` for
 * the pipeline contract and render whatever you like in `Body`:
 *
 *   const definition: NodeDefinition = {
 *     op: 'curve',
 *     label: 'Curve',
 *     params: [param('curvePoint0', ...), ...],
 *     Body: ({ node, onValueChange }) => <CurveEditor node={node} onChange={onValueChange} />,
 *   };
 */
export interface NodeDefinition {
  op: NodeOpType;
  label: string;
  params: NodeParamSpec[];
  Body: ComponentType<NodeBodyProps>;
  /**
   * Optional factory for a node's starting values. Slider nodes leave this out
   * and get their defaults seeded from `params`; nodes with structured state
   * (e.g. curves) provide it to seed non-numeric values.
   */
  initialValues?: () => NodeValues;
}

/** Terse constructor for a numeric parameter spec. Mirrors sensible defaults. */
export const param = (
  key: string,
  label: string,
  min = -100,
  max = 100,
  step = 1,
  defaultValue = 0,
): NodeParamSpec => ({ key, label, min, max, step, defaultValue });
