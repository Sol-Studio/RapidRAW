import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('contrast', 'Contrast')];

function ContrastBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'contrast',
  label: 'Contrast',
  params,
  Body: ContrastBody,
};

export default definition;
