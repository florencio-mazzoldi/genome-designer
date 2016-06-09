import fields from './fields/index';
import Schema from './SchemaClass';
import BlockSourceSchema from './BlockSource';

const fieldDefs = {
  componentId: [
    fields.id({ prefix: 'block' }).required,
    `ID of block for this component`,
  ],

  source: [
    BlockSourceSchema,
    `Source of component`,
  ],
};

export class OrderConstructComponentSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, fieldDefs, fieldDefinitions));
  }
}

export default new OrderConstructComponentSchemaClass();

