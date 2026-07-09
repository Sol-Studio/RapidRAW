import { NodeOpType, NodeParamSpec } from '../../../types/nodeGraph';
import { NodeDefinition } from './types';

import exposure from './exposure';
import brightness from './brightness';
import contrast from './contrast';
import tone from './tone';
import whiteBalance from './whiteBalance';
import saturation from './saturation';
import vibrance from './vibrance';
import hue from './hue';
import curves from './curves';
import details from './details';
import dehaze from './dehaze';
import effects from './effects';

/**
 * The single place that knows every node type. Adding a node is: create
 * `node/[op].tsx` exporting a `NodeDefinition`, add its `NodeOpType` in
 * types/nodeGraph.ts, and list it here. Everything else — the toolbar, the
 * renderer, default values, pipeline flattening — is driven off this array.
 *
 * Order here is the order buttons appear in the editor toolbar.
 */
const DEFINITIONS: NodeDefinition[] = [
  exposure,
  brightness,
  contrast,
  tone,
  whiteBalance,
  saturation,
  vibrance,
  hue,
  curves,
  details,
  dehaze,
  effects,
];

export const NODE_REGISTRY = Object.fromEntries(DEFINITIONS.map((d) => [d.op, d])) as Record<
  NodeOpType,
  NodeDefinition
>;

/** Op types in toolbar order. Replaces the old `Object.keys(...)` derivation. */
export const NODE_OP_TYPES: NodeOpType[] = DEFINITIONS.map((d) => d.op);

export function getNodeDefinition(op: NodeOpType): NodeDefinition | undefined {
  return NODE_REGISTRY[op];
}

/** Numeric parameters an op owns — used to seed defaults and flatten the pipeline. */
export function getNodeParams(op: NodeOpType): NodeParamSpec[] {
  return NODE_REGISTRY[op]?.params ?? [];
}

/** Every op definition, for iteration (e.g. resetting all params to defaults). */
export function allNodeDefinitions(): NodeDefinition[] {
  return DEFINITIONS;
}
