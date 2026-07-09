import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('brightness', 'Brightness', -5, 5, 0.01)];

function BrightnessBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'brightness',
  label: 'Brightness',
  params,
  Body: BrightnessBody,
};

export default definition;
