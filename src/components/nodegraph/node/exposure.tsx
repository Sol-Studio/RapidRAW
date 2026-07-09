import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('exposure', 'Exposure', -5, 5, 0.01)];

function ExposureBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'exposure',
  label: 'Exposure',
  params,
  Body: ExposureBody,
};

export default definition;
