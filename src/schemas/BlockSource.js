import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';

const BlockSourceDefinition = new SchemaDefinition({
  source: [
    fields.string(),
    `key of foundry the Order has been submitted to`,
  ],

  id: [
    fields.string(),
    `ID at remote foundry`,
  ],
});

export default BlockSourceDefinition;
