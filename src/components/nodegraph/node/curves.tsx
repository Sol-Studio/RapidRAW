import { useRef, useState } from 'react';
import { ActiveChannel, Coord, Curves, getDefaultCurves } from '../../../utils/adjustments';
import { NodeBodyProps, NodeDefinition } from './types';
import { getCurvePath } from './curveMath';

const CHANNELS: Array<{ key: ActiveChannel; label: string; color: string }> = [
  { key: ActiveChannel.Luma, label: 'L', color: 'var(--color-accent)' },
  { key: ActiveChannel.Red, label: 'R', color: '#FF6B6B' },
  { key: ActiveChannel.Green, label: 'G', color: '#6BCB77' },
  { key: ActiveChannel.Blue, label: 'B', color: '#4D96FF' },
];

const DEFAULT_CHANNEL: Array<Coord> = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function CurvesBody({ node, onValuesChange }: NodeBodyProps) {
  const [channel, setChannel] = useState<ActiveChannel>(ActiveChannel.Luma);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localPoints, setLocalPoints] = useState<Array<Coord> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const curves: Curves = (node.values.curves as Curves) ?? getDefaultCurves();
  const points = localPoints ?? curves[channel] ?? DEFAULT_CHANNEL;
  const color = CHANNELS.find((c) => c.key === channel)!.color;

  const commit = (nextPoints: Array<Coord>, dragging: boolean) => {
    onValuesChange({ curves: { ...curves, [channel]: nextPoints }, curveMode: 'point' }, dragging);
  };

  const toGraph = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 255, 0, 255);
    const y = clamp(255 - ((clientY - rect.top) / rect.height) * 255, 0, 255);
    return { x, y };
  };

  const startDrag = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    setLocalPoints(points);
    setDragIndex(index);
  };

  const handleBackgroundDown = (e: React.PointerEvent) => {
    if ((e.target as Element).tagName === 'circle') return;
    e.stopPropagation();
    const { x, y } = toGraph(e.clientX, e.clientY);
    const next = [...points, { x, y }].sort((a, b) => a.x - b.x);
    const index = next.findIndex((p) => p.x === x && p.y === y);
    svgRef.current?.setPointerCapture(e.pointerId);
    setLocalPoints(next);
    setDragIndex(index);
    commit(next, true);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (dragIndex === null) return;
    e.stopPropagation();
    const { x: rawX, y } = toGraph(e.clientX, e.clientY);
    const prevX = dragIndex > 0 ? points[dragIndex - 1].x : 0;
    const nextX = dragIndex < points.length - 1 ? points[dragIndex + 1].x : 255;
    const minX = dragIndex === 0 ? 0 : prevX + 0.01;
    const maxX = dragIndex === points.length - 1 ? 255 : nextX - 0.01;
    const next = points.map((p, i) => (i === dragIndex ? { x: clamp(rawX, minX, maxX), y } : p));
    setLocalPoints(next);
    commit(next, true);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragIndex === null) return;
    e.stopPropagation();
    svgRef.current?.releasePointerCapture(e.pointerId);
    commit(points, false);
    setDragIndex(null);
    setLocalPoints(null);
  };

  const removePoint = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (index <= 0 || index >= points.length - 1) return;
    commit(points.filter((_, i) => i !== index), false);
  };

  const resetChannel = () => commit(DEFAULT_CHANNEL, false);

  return (
    <div className="px-2 py-1.5 flex flex-col gap-1.5 w-44">
      <div className="flex items-center gap-1 justify-center">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            className={`nodrag w-5 h-5 rounded text-[10px] font-bold transition-colors ${
              channel === c.key ? 'text-text-primary ring-1 ring-accent' : 'text-text-secondary bg-white/5'
            }`}
            style={{ color: channel === c.key ? c.color : undefined }}
            onClick={() => {
              setLocalPoints(null);
              setDragIndex(null);
              setChannel(c.key);
            }}
            title={`${c.label} channel`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 255 255"
        className="nodrag nowheel w-full aspect-square bg-black/30 rounded touch-none cursor-crosshair"
        onPointerDown={handleBackgroundDown}
        onPointerMove={handleMove}
        onPointerUp={endDrag}
        onDoubleClick={resetChannel}
      >
        <path
          d="M 63.75,0 V 255 M 127.5,0 V 255 M 191.25,0 V 255 M 0,63.75 H 255 M 0,127.5 H 255 M 0,191.25 H 255"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <line x1="0" y1="255" x2="255" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={getCurvePath(points)} fill="none" stroke={color} strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={255 - p.y}
            r="7"
            fill={color}
            stroke="#1e1e1e"
            strokeWidth="2"
            className="cursor-pointer"
            onPointerDown={(e) => startDrag(e, i)}
            onContextMenu={(e) => removePoint(e, i)}
          />
        ))}
      </svg>
    </div>
  );
}

const definition: NodeDefinition = {
  op: 'curves',
  label: 'Tone Curve',
  params: [],
  Body: CurvesBody,
  initialValues: () => ({ curves: getDefaultCurves(), curveMode: 'point' }),
};

export default definition;
