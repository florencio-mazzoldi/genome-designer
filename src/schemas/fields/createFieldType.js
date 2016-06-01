import safeValidate from './safeValidate';

/**
 * Takes a basic field definition, returns a function which takes parameters, which subsequently returns a fully defined field.
 *
 * @param baseFieldDefinition {Object} Object which minimally contains the following keys:
 *
 * baseValidator {Function} validation function which accepts a set of parameters (see validators.js), and returns a function which accepts an input, and subsequently returns:
 *   1) returns nothing if valid
 *   2) returns an error for invalid with relevant message
 *
 * and likely should include the following keys
 *
 * typeDescription {String}
 *
 * @param type {String} the field type (e.g. 'id')
 *
 * @return {Function} returns a function expecting an input value of parameters to the baseValidator, and which has the additional field .require if the field is required. The return of this function is a fully defined field:
 *
 * {
 *   type: {String} Field type
 *   validate: {Function}
 *   isRequired: {Boolean} is the field required
 *   description: {String} description of specific field
 *   typeDescription: {String} description of field type
 *   baseValidator:  {Function} base validation function, pre-parameterized
 * }
 */
export default function createFieldType(baseFieldDefinition, type) {
  const fieldDef = Object.assign({
    type,
  }, baseFieldDefinition);

  return function validatorAwaitingParams(validationParams) {
    const { baseValidator } = fieldDef;

    const opt = createFieldFromValidator(fieldDef, baseValidator, validationParams, false);
    opt.required = createFieldFromValidator(fieldDef, baseValidator, validationParams, true);

    //catch these in case you declare a schema improperly, hard to catch otherwise
    if (process.env.NODE_ENV !== 'production') {
      opt.isRequired = {
        validate: () => { throw new Error('use required, not isRequired'); },
      };
    }

    return opt;
  };
}

function createFieldFromValidator(fieldDefinition, baseValidator, params, required) {
  const definedValidator = baseValidator(params);
  return Object.assign({},
    fieldDefinition,
    {
      params,
      validate: wrapValidator(definedValidator, required),
      isRequired: required,
    }
  );
}

function wrapValidator(validator, required = false) {
  return safeValidate.bind(null, validator, required);
}
