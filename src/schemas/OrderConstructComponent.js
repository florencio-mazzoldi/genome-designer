import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';
import BlockSourceDefinition from './BlockSource';

const OrderConstructComponentDefinition = new SchemaDefinition({
  componentId: [
    fields.id({ prefix: 'block' }).required,
    `ID of block for this component`,
  ],

  source: [
    BlockSourceDefinition,
    `Source of component`,
  ],
});

export default OrderConstructComponentDefinition;
