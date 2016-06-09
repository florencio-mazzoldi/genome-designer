import fields from './fields/index';
import Schema from './SchemaClass';

import ParentSchema from './Parent';
import MetadataSchema from './Metadata';

const instanceFields = {
  id: [
    fields.id().required,
    'ID of the instance',
  ],
  parents: [
    fields.arrayOf(ParentSchema.validate.bind(ParentSchema)).required,
    'Ancestral parents from which object is derived, with newest first',
  ],
  metadata: [
    MetadataSchema,
    'Metadata for the object',
  ],
};

export class InstanceSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, instanceFields, fieldDefinitions));
  }
}

export default new InstanceSchemaClass();
