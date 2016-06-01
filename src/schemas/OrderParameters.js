import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';

const OrderParametersDefinition = new SchemaDefinition({
  method: [
    fields.string(),
    `Assembly method to be used`,
  ],

  onePot: [
    fields.bool(),
    'Reaction is combinatorial and all parts will be combined in one tube, resulting in many combinatorial assemblies mixed together.',
    { scaffold: () => true },
  ],
});

export default OrderParametersDefinition;
