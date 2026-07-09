import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [
  param('sharpness', 'Sharpness'),
  param('clarity', 'Clarity'),
  param('structure', 'Structure'),
  param('lumaNoiseReduction', 'Luma NR', 0, 100),
  param('colorNoiseReduction', 'Color NR', 0, 100),
];

function DetailsBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'details',
  label: 'Details',
  params,
  Body: DetailsBody,
};

export default definition;
