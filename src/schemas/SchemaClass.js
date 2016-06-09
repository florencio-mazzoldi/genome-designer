import mapValues from '../utils/object/mapValues';

/**
 * @class Schema
 * @param fieldDefinitions {Object} dictionary of field names to definitions. Definitions take the form:
 * [
 *   parameterizedFieldType {function} Parameterized field type (e.g. fields.id().required)
 *   description {string} description of the field in this schema
 *   additional {Object} object to assign to the field
 * ]
 * @returns {Schema} Schema instance, which can validate(), describe(), etc.
 * @example

 import fields from './fields';
 import Schema from './Schema';

 const simpleFields = {
   id : [
     fields.id().required,
     'the ID for the Simple Instance',
     {additionalField : 'yada'}
   ]
 };

 class SimpleSchemaClass extends Schema {
   constructor(fieldDefinitions) {
     super(merge({}, fieldDefinitions, simpleFields));
   }
 }

 const SimpleSchema = new SimpleSchemaClass();
 export default SimpleSchema;

 */
export default class Schema {
  constructor(fieldDefinitions) {
    this.definitions = fieldDefinitions;
    this.fields = createFields(fieldDefinitions);
    this.type = this.constructor.name; //to mirror fields, in validation
  }

  extend(childDefinitions) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('it is recommedned you extend Schemas using ES6 classes, not the extend() method');
    }

    return new Schema(Object.assign({},
      this.definitions,
      childDefinitions
    ));
  }

  clone() {
    return new this.constructor(this.definitions);
  }

  validateFields(instance = {}, shouldThrow) {
    return Object.keys(this.fields).every(fieldName => {
      const instanceFieldValue = instance[fieldName];
      const field = this.fields[fieldName];

      //check for improperly bound fields
      if (process.env.NODE_ENV !== 'production' && !field.validate) {
        console.error(field);
      }

      //need to bind field in case it's a schema
      const validator = field.validate.bind(field);

      //note - should not error using our validators. Might want to try-catch though, e.g. if we allow custom validator functions
      const isValid = validator(instanceFieldValue);

      if (!isValid) {
        const errorMessage = `Invalid: Field ${field.name} of type ${field.type}. Got ${instanceFieldValue} (${typeof instanceFieldValue}). [${field.description || field.typeDescription}]`;

        if (shouldThrow) {
          throw Error(errorMessage);
        } else if (process.env.NODE_ENV !== 'production') {
          console.error(errorMessage); //eslint-disable-line
        }
      }

      return isValid;
    });
  }

  //may want to extend this function in your class for instance-wide validation, not just of fields
  validate(instance, shouldThrow) {
    return this.validateFields(instance, shouldThrow);
  }

  describe() {
    return mapValues(this.fields, field => (
      field.description ||
      field.typeDescription ||
      '<no description>'
    ));
  }

  scaffold(onlyRequiredFields = false) {
    const defaultScaffoldValue = null;

    return Object.keys(this.fields).reduce((scaffold, fieldName) => {
      const field = this.fields[fieldName];
      const fieldRequired = (field instanceof Schema) || field.fieldRequired;

      if (onlyRequiredFields && !fieldRequired) {
        return scaffold;
      }

      //can opt out of scaffolding a field - note will not be valid if required
      if (field.avoidScaffold === true) {
        if (fieldRequired && process.env.DEBUGMODE) {
          console.warn(`not scaffolding required field ${fieldName}`, field, scaffold); //eslint-disable-line
        }

        return scaffold;
      }

      const fieldValue = (typeof field.scaffold === 'function') ?
        field.scaffold(field.params) :
        defaultScaffoldValue;
      return Object.assign(scaffold, { [fieldName]: fieldValue });
    }, {});
  }
}

function createFields(fieldDefinitions) {
  return mapValues(fieldDefinitions,
    (fieldDefinition, fieldName) => {
      //note - assign to field to maintain prototype, i.e. validate() function if instanceof Schema
      return Object.assign(
        createSchemaField(...fieldDefinition),
        { name: fieldName }
      );
    }
  );
}

function createSchemaField(inputField, description = '', additional) {
  //todo - can probably handle this more intelligently...
  //because each field is a new FieldType instance (since it is parameterized), we can overwrite it
  //However, if its a Schema, we dont want to assign to it, so clone it
  let field;
  if (inputField instanceof Schema) {
    field = inputField.clone();
  } else {
    field = Object.assign({}, inputField);
  }

  //in case still here, created by createFieldType() and field is not required
  delete field.required;
  delete field.isRequired;

  return Object.assign(field,
    { description },
    additional
  );
}
