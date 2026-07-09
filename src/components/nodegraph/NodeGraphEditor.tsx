import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  EdgeChange,
  Handle,
  Node,
  NodeChange,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowInstance,
  ReactFlowProvider,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import throttle from 'lodash.throttle';
import { Plus, Power, Trash2 } from 'lucide-react';

import { Adjustments } from '../../utils/adjustments';
import {
  GraphEdge,
  GraphNode,
  NODE_OP_DEFINITIONS,
  NODE_OP_TYPES,
  NodeOpType,
  OUTPUT_NODE_ID,
  SOURCE_NODE_ID,
} from '../../types/nodeGraph';
import { flattenNodePipeline, serializeNodePipeline } from '../../utils/nodeGraph';
import { useNodeGraphStore } from '../../store/useNodeGraphStore';
import { useEditorStore } from '../../store/useEditorStore';

/**
 * Throttle window for IPC-triggering commits while sliders move or nodes are
 * rewired, preventing invoke flooding of the Rust preview worker (~33 fps).
 */
const COMMIT_THROTTLE_MS = 30;

interface OpNodeData {
  graphNode: GraphNode;
  onValueChange: (id: string, key: string, value: number, dragging: boolean) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

type OpFlowNode = Node<OpNodeData, 'op'>;

function OpNode({ id, data }: NodeProps<OpFlowNode>) {
  const { graphNode, onValueChange, onToggle, onDelete } = data;
  const def = NODE_OP_DEFINITIONS[graphNode.op as NodeOpType];
  if (!def) return null;

  return (
    <div
      className={`rounded-md border text-xs shadow-md min-w-44 bg-bg-secondary ${
        graphNode.enabled ? 'border-accent/60' : 'border-white/10 opacity-60'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-white/10">
        <span className="font-medium text-text-primary">{def.label}</span>
        <div className="flex items-center gap-1">
          <button
            className={`nodrag p-0.5 rounded hover:bg-white/10 ${graphNode.enabled ? 'text-accent' : 'text-text-secondary'}`}
            onClick={() => onToggle(id, !graphNode.enabled)}
            title="Toggle node"
          >
            <Power size={12} />
          </button>
          <button
            className="nodrag p-0.5 rounded hover:bg-white/10 text-text-secondary hover:text-red-400"
            onClick={() => onDelete(id)}
            title="Delete node"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="px-2 py-1.5 flex flex-col gap-1">
        {def.params.map((param) => (
          <label key={param.key} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-text-secondary truncate">{param.label}</span>
            <input
              type="range"
              className="nodrag flex-1 h-1 accent-current text-accent"
              min={param.min}
              max={param.max}
              step={param.step}
              value={graphNode.values[param.key] ?? param.defaultValue}
              onPointerDown={() => onValueChange(id, param.key, graphNode.values[param.key] ?? param.defaultValue, true)}
              onChange={(e) => onValueChange(id, param.key, Number(e.target.value), true)}
              onPointerUp={(e) => onValueChange(id, param.key, Number((e.target as HTMLInputElement).value), false)}
              onKeyUp={(e) => onValueChange(id, param.key, Number((e.target as HTMLInputElement).value), false)}
              onBlur={(e) => onValueChange(id, param.key, Number(e.target.value), false)}
            />
            <span className="w-9 shrink-0 text-right text-text-primary tabular-nums">
              {(graphNode.values[param.key] ?? param.defaultValue).toFixed(param.step < 1 ? 2 : 0)}
            </span>
          </label>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

function TerminalNode({ data }: NodeProps<Node<{ label: string; kind: 'source' | 'output' }, 'terminal'>>) {
  return (
    <div className="rounded-full border border-accent/60 bg-bg-secondary px-4 py-2 text-xs font-medium text-text-primary shadow-md">
      {data.kind === 'output' && <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />}
      {data.label}
      {data.kind === 'source' && <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />}
    </div>
  );
}

const nodeTypes = { op: OpNode, terminal: TerminalNode };

interface NodeGraphEditorProps {
  setAdjustments: (value: Partial<Adjustments> | ((prev: Adjustments) => Adjustments)) => void;
}

export default function NodeGraphEditor({ setAdjustments }: NodeGraphEditorProps) {
  const nodes = useNodeGraphStore((s) => s.nodes);
  const edges = useNodeGraphStore((s) => s.edges);
  const setNodes = useNodeGraphStore((s) => s.setNodes);
  const setEdges = useNodeGraphStore((s) => s.setEdges);
  const addOpNode = useNodeGraphStore((s) => s.addOpNode);
  const removeNode = useNodeGraphStore((s) => s.removeNode);
  const updateNodeValues = useNodeGraphStore((s) => s.updateNodeValues);
  const setNodeEnabled = useNodeGraphStore((s) => s.setNodeEnabled);
  const connect = useNodeGraphStore((s) => s.connect);
  const setGraph = useNodeGraphStore((s) => s.setGraph);

  const setEditor = useEditorStore((s) => s.setEditor);
  const selectedImagePath = useEditorStore((s) => s.selectedImage?.path ?? null);
  const nodeGraphInAdjustments = useEditorStore((s) => s.adjustments?.nodeGraph ?? null);

  // Serializes the topologically sorted graph into the adjustments object.
  // `nodePipeline` drives the multi-pass GPU render; `nodeGraph` persists the
  // editor layout; the flattened values keep legacy consumers (thumbnails,
  // edited-detection, copy/paste) coherent with what the graph renders.
  const commitGraph = useCallback(() => {
    const { nodes: currentNodes, edges: currentEdges } = useNodeGraphStore.getState();
    const pipeline = serializeNodePipeline(currentNodes, currentEdges);
    setAdjustments((prev: Adjustments) => {
      const next: Adjustments = {
        ...prev,
        nodeGraph: { nodes: currentNodes, edges: currentEdges },
      };
      if (pipeline.length > 0) {
        Object.assign(next, flattenNodePipeline(pipeline));
        next.nodePipeline = pipeline;
      } else {
        delete next.nodePipeline;
      }
      return next;
    });
  }, [setAdjustments]);

  const throttledCommit = useMemo(
    () => throttle(commitGraph, COMMIT_THROTTLE_MS, { leading: true, trailing: true }),
    [commitGraph],
  );
  useEffect(() => () => throttledCommit.cancel(), [throttledCommit]);

  // Hydrate the graph store from the per-image adjustments (image switches,
  // undo/redo). Committing writes the identical structure back, so the
  // stringify comparison breaks the loop.
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    const { nodes: storeNodes, edges: storeEdges } = useNodeGraphStore.getState();
    const current = JSON.stringify({ nodes: storeNodes, edges: storeEdges });
    if (nodeGraphInAdjustments) {
      const incoming = JSON.stringify(nodeGraphInAdjustments);
      if (incoming !== current && incoming !== hydratedRef.current) {
        hydratedRef.current = incoming;
        setGraph(nodeGraphInAdjustments);
      }
    } else {
      hydratedRef.current = null;
      useNodeGraphStore.getState().reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImagePath, nodeGraphInAdjustments, setGraph]);

  const handleValueChange = useCallback(
    (id: string, key: string, value: number, dragging: boolean) => {
      updateNodeValues(id, { [key]: value });
      setEditor({ isSliderDragging: dragging });
      throttledCommit();
      if (!dragging) throttledCommit.flush();
    },
    [updateNodeValues, setEditor, throttledCommit],
  );

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      setNodeEnabled(id, enabled);
      commitGraph();
    },
    [setNodeEnabled, commitGraph],
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeNode(id);
      commitGraph();
    },
    [removeNode, commitGraph],
  );

  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => {
        if (n.op === 'source' || n.op === 'output') {
          return {
            id: n.id,
            type: 'terminal',
            position: n.position,
            deletable: false,
            data: { label: n.op === 'source' ? 'Source' : 'Output', kind: n.op },
          } satisfies Node;
        }
        return {
          id: n.id,
          type: 'op',
          position: n.position,
          data: {
            graphNode: n,
            onValueChange: handleValueChange,
            onToggle: handleToggle,
            onDelete: handleDelete,
          },
        } satisfies Node;
      }),
    [nodes, handleValueChange, handleToggle, handleDelete],
  );

  const flowEdges = useMemo<Edge[]>(
    () => edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })),
    [edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Only react to changes that mutate our domain model. React Flow also
      // emits `dimensions`/`select` changes on every measure; acting on those
      // (recreating node objects) would re-render the flow, which re-measures,
      // producing a ResizeObserver feedback loop and parking fitView off-screen.
      const removals = changes
        .filter((c) => c.type === 'remove')
        .map((c) => c.id)
        .filter((id) => id !== SOURCE_NODE_ID && id !== OUTPUT_NODE_ID);
      removals.forEach((id) => removeNode(id));

      const positionChanges = changes.filter(
        (c): c is Extract<NodeChange, { type: 'position' }> => c.type === 'position' && !!c.position,
      );
      if (positionChanges.length > 0) {
        const posMap = new Map(positionChanges.map((c) => [c.id, c.position!]));
        const { nodes: storeNodes } = useNodeGraphStore.getState();
        setNodes(storeNodes.map((n) => (posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n)));
      }

      if (removals.length > 0) commitGraph();
      else if (positionChanges.length > 0) throttledCommit();
    },
    [setNodes, removeNode, commitGraph, throttledCommit],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    // Fit after the browser has laid out the pane; fitting synchronously on
    // init can run against a not-yet-sized container and strand the viewport.
    requestAnimationFrame(() => instance.fitView({ padding: 0.25, duration: 0 }));
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updated = applyEdgeChanges(changes, flowEdges);
      setEdges(updated.map((e) => ({ id: e.id, source: e.source, target: e.target }) satisfies GraphEdge));
      if (changes.some((c) => c.type === 'remove')) commitGraph();
    },
    [flowEdges, setEdges, commitGraph],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connect(connection.source, connection.target)) {
        commitGraph();
      }
    },
    [connect, commitGraph],
  );

  const handleAddNode = useCallback(
    (op: NodeOpType) => {
      const node = addOpNode(op);
      // Auto-splice the new node into the chain before the output node.
      const { edges: currentEdges } = useNodeGraphStore.getState();
      const intoOutput = currentEdges.filter((e) => e.target === OUTPUT_NODE_ID);
      if (intoOutput.length === 1) {
        const prev = intoOutput[0];
        useNodeGraphStore.getState().disconnect(prev.id);
        connect(prev.source, node.id);
        connect(node.id, OUTPUT_NODE_ID);
      } else if (intoOutput.length === 0) {
        connect(SOURCE_NODE_ID, node.id);
        connect(node.id, OUTPUT_NODE_ID);
      }
      commitGraph();
    },
    [addOpNode, connect, commitGraph],
  );

  return (
    <div className="w-full h-full flex flex-col bg-bg-secondary text-text-primary">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Node Pipeline</span>
        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {NODE_OP_TYPES.map((op) => (
            <button
              key={op}
              onClick={() => handleAddNode(op)}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 hover:bg-accent/30 text-text-secondary hover:text-text-primary transition-colors"
              title={`Add ${NODE_OP_DEFINITIONS[op].label} node`}
            >
              <Plus size={10} />
              {NODE_OP_DEFINITIONS[op].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            defaultViewport={{ x: 40, y: 20, zoom: 0.85 }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
