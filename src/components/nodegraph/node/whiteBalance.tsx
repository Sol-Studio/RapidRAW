import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('temperature', 'Temperature'), param('tint', 'Tint')];

function WhiteBalanceBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'whiteBalance',
  label: 'White Balance',
  params,
  Body: WhiteBalanceBody,
};

export default definition;
