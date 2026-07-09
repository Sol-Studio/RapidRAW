import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('vibrance', 'Vibrance')];

function VibranceBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'vibrance',
  label: 'Vibrance',
  params,
  Body: VibranceBody,
};

export default definition;
