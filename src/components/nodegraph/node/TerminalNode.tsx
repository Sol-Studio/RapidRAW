import { Handle, Node, NodeProps, Position } from '@xyflow/react';

export interface TerminalNodeData {
  label: string;
  kind: 'source' | 'output';
  [key: string]: unknown;
}

export type TerminalFlowNode = Node<TerminalNodeData, 'terminal'>;

/** The fixed Source / Output endpoints that bracket the pipeline. */
export default function TerminalNode({ data }: NodeProps<TerminalFlowNode>) {
  return (
    <div className="rounded-full border border-accent/60 bg-bg-secondary px-4 py-2 text-xs font-medium text-text-primary shadow-md">
      {data.kind === 'output' && <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />}
      {data.label}
      {data.kind === 'source' && <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />}
    </div>
  );
}
