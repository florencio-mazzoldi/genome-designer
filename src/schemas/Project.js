import fields from './fields/index';
import * as validators from './fields/validators';
import { InstanceSchemaClass } from './Instance';

/**
 @name ProjectSchema
 @description
 Project is the container for a body of work. It consists primarily of constructs, but also orders, settings, etc.
 */

const projectFields = {
  id: [
    fields.id({ prefix: 'project' }).required,
    'Project UUID',
  ],

  version: [
    fields.version(),
    'SHA1 version of project',
    { avoidScaffold: true },
  ],

  components: [
    fields.arrayOf(validators.id()).required,
    `Constructs associated with this project`,
  ],

  settings: [
    fields.object().required,
    `Settings associated with this project`,
  ],
};

export class ProjectSchemaClass extends InstanceSchemaClass {
  constructor(fieldDefinitions) {
    super(Object.assign({}, projectFields, fieldDefinitions));
  }
}

export default new ProjectSchemaClass();
