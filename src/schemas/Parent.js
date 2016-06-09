import fields from './fields/index';
import Schema from './SchemaClass';

const fieldDefs = {
  id: [
    fields.id().required,
    'ID of parent instance',
  ],
  projectId: [
    fields.id({ prefix: 'project' }),
    'ID of project of parent (if not a project)',
  ],
  version: [
    fields.version(),
    'Version of project, git SHA',
  ],
};

export class ParentSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, fieldDefs, fieldDefinitions));
  }
}

export default new ParentSchemaClass();
