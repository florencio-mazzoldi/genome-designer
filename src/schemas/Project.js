import fields from './fields/index';
import * as validators from './fields/validators';
import InstanceDefinition from './Instance';

/**
 @name ProjectDefinition
 @description
 Project is the container for a body of work. It consists primarily of constructs

*/

const ProjectDefinition = InstanceDefinition.extend({
  id: [
    fields.id({prefix: 'project'}).required,
    'Project UUID',
  ],

  components: [
    fields.arrayOf(validators.id()).required,
    `Constructs associated with this project`,
  ],
  settings: [
    fields.object().required,
    `Settings associated with this project`,
  ],
});

export default ProjectDefinition;
