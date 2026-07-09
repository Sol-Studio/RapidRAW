import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [
  param('vignetteAmount', 'Vignette'),
  param('grainAmount', 'Grain', 0, 100),
  param('glowAmount', 'Glow', 0, 100),
  param('halationAmount', 'Halation', 0, 100),
  param('flareAmount', 'Flare', 0, 100),
];

function EffectsBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'effects',
  label: 'Effects',
  params,
  Body: EffectsBody,
};

export default definition;
