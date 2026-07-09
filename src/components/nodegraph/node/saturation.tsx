import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('saturation', 'Saturation')];

function SaturationBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'saturation',
  label: 'Saturation',
  params,
  Body: SaturationBody,
};

export default definition;
