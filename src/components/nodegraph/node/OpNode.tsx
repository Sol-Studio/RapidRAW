import { Node, NodeProps } from '@xyflow/react';
import { GraphNode, NodeOpType, NodeValues } from '../../../types/nodeGraph';
import { getNodeDefinition } from './registry';
import NodeShell from './NodeShell';

export interface OpNodeData {
  graphNode: GraphNode;
  onValueChange: (id: string, key: string, value: number, dragging: boolean) => void;
  onValuesChange: (id: string, values: NodeValues, dragging: boolean) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

export type OpFlowNode = Node<OpNodeData, 'op'>;

/**
 * Generic React Flow renderer for every op node. It resolves the node's type in
 * the registry, wraps it in the shared chrome, and delegates the body to that
 * type's own `Body` component — so the visual language stays consistent while
 * each node owns its interior.
 */
export default function OpNode({ id, data }: NodeProps<OpFlowNode>) {
  const { graphNode, onValueChange, onValuesChange, onToggle, onDelete } = data;
  const definition = getNodeDefinition(graphNode.op as NodeOpType);
  if (!definition) return null;

  const { Body } = definition;
  return (
    <NodeShell
      title={definition.label}
      enabled={graphNode.enabled}
      onToggle={() => onToggle(id, !graphNode.enabled)}
      onDelete={() => onDelete(id)}
    >
      <Body
        node={graphNode}
        onValueChange={(key, value, dragging) => onValueChange(id, key, value, dragging)}
        onValuesChange={(values, dragging) => onValuesChange(id, values, dragging)}
      />
    </NodeShell>
  );
}
