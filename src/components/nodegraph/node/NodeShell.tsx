import { ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Power, Trash2 } from 'lucide-react';

interface NodeShellProps {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
  children: ReactNode;
}

/**
 * The chrome shared by every op node: the card frame, target/source handles,
 * title bar and the enable/delete controls. Node type modules only supply the
 * body via `children`, so their code stays focused on the actual UI.
 */
export default function NodeShell({ title, enabled, onToggle, onDelete, children }: NodeShellProps) {
  return (
    <div
      className={`rounded-md border text-xs shadow-md min-w-44 bg-bg-secondary ${
        enabled ? 'border-accent/60' : 'border-white/10 opacity-60'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-white/10">
        <span className="font-medium text-text-primary">{title}</span>
        <div className="flex items-center gap-1">
          <button
            className={`nodrag p-0.5 rounded hover:bg-white/10 ${enabled ? 'text-accent' : 'text-text-secondary'}`}
            onClick={onToggle}
            title="Toggle node"
          >
            <Power size={12} />
          </button>
          <button
            className="nodrag p-0.5 rounded hover:bg-white/10 text-text-secondary hover:text-red-400"
            onClick={onDelete}
            title="Delete node"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {children}
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}
