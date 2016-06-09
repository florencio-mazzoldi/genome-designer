import fields from './fields/index';
import * as validators from './fields/validators';
import Schema from './SchemaClass';

/**
 @name UserSchema
 @description A user account
*/

const fieldDefs = {
  id: [
    fields.id({prefix: 'user'}).required,
    `ID of the User`,
  ],
  email: [
    fields.email().required,
    `User's Email Address`,
  ],
  firstName: [
    fields.string(),
    `First name of user`,
  ],
  lastName: [
    fields.string(),
    `Last name of user`,
  ],
  description: [
    fields.string(),
    `Short biography of the user`,
  ],
  homepage: [
    fields.url(),
    `URL of personal page`,
  ],
  social: [
    fields.arrayOf(validators.shape({
      provider: validators.string(),
      username: validators.string(),
    })),
    `List of social media accounts`,
  ],
};

export class UserSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, fieldDefs, fieldDefinitions));
  }
}

export default new UserSchemaClass();

