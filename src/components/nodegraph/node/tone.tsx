import SliderControls from './SliderControls';
import { NodeBodyProps, NodeDefinition, param } from './types';

const params = [
  param('highlights', 'Highlights'),
  param('shadows', 'Shadows'),
  param('whites', 'Whites'),
  param('blacks', 'Blacks'),
];

function ToneBody({ node, onValueChange }: NodeBodyProps) {
  return <SliderControls node={node} params={params} onValueChange={onValueChange} />;
}

const definition: NodeDefinition = {
  op: 'tone',
  label: 'Tone',
  params,
  Body: ToneBody,
};

export default definition;
