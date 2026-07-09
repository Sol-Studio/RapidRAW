import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('hue', 'Hue', -180, 180)];

function HueBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'hue',
  label: 'Hue',
  params,
  Body: HueBody,
};

export default definition;
