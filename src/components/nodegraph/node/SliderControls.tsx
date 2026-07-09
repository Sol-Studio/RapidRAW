import { GraphNode, NodeParamSpec } from '../../../types/nodeGraph';

interface SliderControlsProps {
  node: GraphNode;
  params: NodeParamSpec[];
  onValueChange: (key: string, value: number, dragging: boolean) => void;
}

/**
 * Renders a labelled slider per parameter. This is the default body for the
 * numeric adjustment nodes; a node type that needs something richer (curve,
 * color wheel, gradient) simply renders its own JSX instead of using this.
 */
export default function SliderControls({ node, params, onValueChange }: SliderControlsProps) {
  return (
    <div className="px-2 py-1.5 flex flex-col gap-1">
      {params.map((param) => {
        const value = (node.values[param.key] as number | undefined) ?? param.defaultValue;
        return (
          <label key={param.key} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-text-secondary truncate">{param.label}</span>
            <input
              type="range"
              className="nodrag flex-1 h-1 accent-current text-accent"
              min={param.min}
              max={param.max}
              step={param.step}
              value={value}
              onPointerDown={() => onValueChange(param.key, value, true)}
              onChange={(e) => onValueChange(param.key, Number(e.target.value), true)}
              onPointerUp={(e) => onValueChange(param.key, Number((e.target as HTMLInputElement).value), false)}
              onKeyUp={(e) => onValueChange(param.key, Number((e.target as HTMLInputElement).value), false)}
              onBlur={(e) => onValueChange(param.key, Number(e.target.value), false)}
            />
            <span className="w-9 shrink-0 text-right text-text-primary tabular-nums">
              {value.toFixed(param.step < 1 ? 2 : 0)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
