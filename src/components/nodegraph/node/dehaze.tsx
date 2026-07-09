import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [param('dehaze', 'Dehaze')];

function DehazeBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'dehaze',
  label: 'Dehaze',
  params,
  Body: DehazeBody,
};

export default definition;
