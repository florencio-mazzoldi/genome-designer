import * as validatorFunctions from './validators';
import createFieldType from './createFieldType';
import mapValues from '../../utils/object/mapValues';
import uuid from 'node-uuid';

/**
 * @name fields
 * @description
 * Exports a dictionary of field types to unparameterized fieldType functions. These are called with parameters passed to the baseValidator, and return a fully defined fieldType object.
 *
 * See createFieldType for what is output.
 *
 * @example
 * import fields from './fields';
 * import * as validatorFunctions from './validators';
 *
 * let myField = fields.id().required;
 *
 returns:
 {
  type: 'id'
  validate: {Parameterized validation function}
  scaffold: {function returning default value, intelligence ranging dep. on type}
  isRequired: true
  typeDescription: <from fields.js>
  baseValidator:  validatorFunctions.id
}
 */
const fields = mapValues({

  //primitives

  id: {
    baseValidator: validatorFunctions.id,
    typeDescription: 'A UUID',
    scaffold: (params) => {
      const prefix = '' + ((params && params.prefix) ? (params.prefix.toLowerCase() + '-') : '');
      return prefix + uuid.v4();
    },
  },
  string: {
    baseValidator: validatorFunctions.string,
    typeDescription: 'A string',
    scaffold: () => '',
  },
  number: {
    baseValidator: validatorFunctions.number,
    typeDescription: 'A number',
    scaffold: () => 0,
  },
  func: {
    baseValidator: validatorFunctions.func,
    typeDescription: 'A function',
    scaffold: () => { return () => {}; },
  },
  array: {
    baseValidator: validatorFunctions.array,
    typeDescription: 'An array, with any values',
    scaffold: () => [],
  },
  object: {
    baseValidator: validatorFunctions.object,
    typeDescription: 'An object, of any shape',
    scaffold: () => ({}),
  },
  bool: {
    baseValidator: validatorFunctions.bool,
    typeDescription: 'A boolean, strictly true or false',
    scaffold: () => false,
  },
  undef: {
    baseValidator: validatorFunctions.undef,
    typeDescription: 'the value undefined',
    scaffold: () => undefined,
  },

  //string subtypes

  sequence: {
    baseValidator: validatorFunctions.sequence,
    typeDescription: 'An IUPAC compliant sequence',
    scaffold: () => '',
  },
  email: {
    baseValidator: validatorFunctions.email,
    typeDescription: 'A valid email address',
    scaffold: () => '',
  },
  version: {
    baseValidator: validatorFunctions.version,
    typeDescription: 'String conforming to semantic versioning',
    scaffold: () => '1.0.0',
  },
  url: {
    baseValidator: validatorFunctions.url,
    typeDescription: 'A valid URL',
    scaffold: () => '',
  },

  //complex - functions + classes

  arrayOf: {
    baseValidator: validatorFunctions.arrayOf,
    typeDescription: 'An array, where each item passes the passed validation function',
    scaffold: () => [],
  },
  shape: {
    baseValidator: validatorFunctions.shape,
    typeDescription: 'An object with a defined fields and types',
    scaffold: () => ({}), //todo - ideally would take an input
  },
  equal: {
    baseValidator: validatorFunctions.equal,
    typeDescription: 'Equality check using Object.is()',
    scaffold: () => null, //todo - ideally would take an input
  },
  instanceOf: {
    baseValidator: validatorFunctions.instanceOf,
    typeDescription: 'Instance of another class',
    scaffold: () => null, //todo - ideally would take an input
  },
  oneOf: {
    baseValidator: validatorFunctions.oneOf,
    typeDescription: 'Input matches item in possible values',
    scaffold: () => null, //todo - ideally would take an input
  },
  oneOfType: {
    baseValidator: validatorFunctions.oneOfType,
    typeDescription: 'Value matches at least one possibility, which may be (1) an object (instanceof), or (2) validation function',
    scaffold: () => null, //todo - ideally would take an input
  },
}, createFieldType);

export const fieldNames = Object.keys(fields);
export const fieldDescriptions = mapValues(fields, val => val.typeDescription);

export default fields;
