import fields from './fields/index';
import Schema from './SchemaClass';

const blockSourceFields = {
  source: [
    fields.string(),
    `key of foundry the Order has been submitted to`,
  ],

  id: [
    fields.string(),
    `ID at remote foundry`,
  ],
};

export class BlockSourceSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, blockSourceFields, fieldDefinitions));
  }
}

export default new BlockSourceSchemaClass();
