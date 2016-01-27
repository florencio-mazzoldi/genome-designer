import safeValidate from './safeValidate';
import urlRegex from 'url-regex';
import semverRegex from 'semver-regex';

/**
 * note that everything exported in this file is tested - so only export real validators
 *
 * @description
 * these validators are used by fields/index.js
 * when defining a SchemaDefinition you should use the fieldType objects exported from that file instead of these directly. However, you may want to use these when just running validation. Note that they expect parameters.
 *
 * @example
 * let validator = number({min:5});
 * validator(4); //false
 * validator(40); //true
 */

export const id = params => input => {
  //todo - real validation
  const regex = /^(\w+-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!regex.test(input)) {
    return new Error(`${input} is not a RFC4122-compliant UUID`);
  }
};

export const string = params => input => {
  if (!isString(input)) {
    return new Error(`${input} is not a string`);
  }
};

export const number = params => input => {
  if (!isNumber(input)) {
    return new Error(`input ${input} is not a number`);
  }

  if (isRealObject(params)) {
    if (params.reals && !isRealNumber(input)) {
      return new Error(`input ${input} is not a real number`);
    }

    if (params.min && input < params.min) {
      return new Error(`input ${input} is less than minimum ${params.min}`);
    }

    if (params.max && input > params.max) {
      return new Error(`input ${input} is greater than maximum ${params.max}`);
    }
  }
};

export const func = params => input => {
  if (!isFunction(input)) {
    return new Error(`${input} is not a function`);
  }
};

export const array = params => input => {
  if (!Array.isArray(input)) {
    return new Error(`${input} is not an array`);
  }
};

export const object = params => input => {
  if (!isRealObject(input)) {
    return new Error(`${input} is not an object`);
  }
};

export const bool = params => input => {
  if (!(input === true || input === false)) {
    return new Error(`${input} is not a boolean`);
  }
};

export const undef = params => input => {
  if (input !== undefined) {
    return new Error(`${input} is not undefined`);
  }
};

/*******
 string subtypes
 *******/

//todo - should support all IUPAC with option to limit
export const sequence = params => input => {
  if (!isString(input)) {
    return new Error(`${input} is not a string`);
  }

  const sequenceRegex = /^[acgt]*$/ig;

  if (!sequenceRegex.test(input)) {
    return new Error(`${input} is not a valid sequence`);
  }
};

//todo - get a robust one, i just hacked this together
export const email = params => input => {
  if (!isString(input)) {
    return new Error(`${input} is not a string`);
  }

  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  if (!emailRegex.test(input)) {
    return new Error(`${input} is not a valid email`);
  }
};

//remove package if you remove this test
export const version = params => input => {
  if (!isString(input)) {
    return new Error(`${input} is not a string`);
  }

  if (!semverRegex().test(input)) {
    return new Error(`${input} is not a valid version`);
  }
};

//remove package if you remove this test
export const url = params => input => {
  if (!isString(input)) {
    return new Error(`${input} is not a string`);
  }

  if (!urlRegex({exact: true}).test(input)) {
    return new Error(`${input} is not a valid url`);
  }
};

export const date = params => input => {
  if (!isDate(input)) {
    return new Error(`${input} is not a valid date`);
  }
};

/*******
 complex
 *******/

export const instanceOf = type => input => {
  if (!input instanceof type) {
    return new Error(`${input} is not an instance of ${type}`);
  }
};

//reference check only. Might want another one for deep equality check
export const equal = checker => input => {
  if (!Object.is(checker, input)) {
    return new Error(`${input} does not equal ${checker}`);
  }
};

export const shape = (fields, {required = false} = {}) => input => {
  if (!isRealObject(fields)) {
    return new Error(`shape ${fields} is not an object`);
  }

  const checker = (key) => {
    return safeValidate(fields[key], required, input[key]);
  };

  if (!Object.keys(fields).every(checker)) {
    return new Error(`input ${input} passed to shape did not pass validation`);
  }
};

export const oneOf = possible => input => {
  if (!Array.isArray(possible)) {
    return new Error(`possible values ${possible} for oneOf not an array`);
  }

  if (possible.indexOf(input) < 0) {
    return new Error(input + ' not found in ' + possible.join(','));
  }
};

//can pass either function to validate, or an object to check instanceof
export const oneOfType = (types, {required = false} = {}) => input => {
  if (!Array.isArray(types)) {
    return new Error(`possible types ${types} for oneOfType not an array`);
  }

  const checker = type => {
    return isFunction(type) ?
      safeValidate(type, required, input) :
      input instanceof type;
  };

  if (!types.some(checker)) {
    return new Error(`input ${input} passed to oneOfType not found in ${types}`);
  }
};

export const arrayOf = (validator, {required = false} = {}) => input => {
  if (!isFunction(validator)) {
    return new Error(`validator ${validator} passed to arrayOf is not a function`);
  }

  if (!Array.isArray(input)) {
    return new Error(`input ${input} passed to arrayOf is not an array`);
  }

  if (required && !input.length) {
    return new Error(`this arrayOf requires values, but got an empty array: ${input}`);
  }

  if (!input.every(item => safeValidate(validator, required, item))) {
    return new Error(`input ${input} passed to arrayOf did not pass validation`);
  }
};

//utils

function isString(input) {
  return getPropType(input) === 'string' || input instanceof String;
}

function isRealObject(input) {
  return input !== null && getPropType(input) === 'object';
}

function isNumber(input) {
  return getPropType(input) === 'number';
}

function isRealNumber(input) {
  return getPropType(input) === 'number' && !isNaN(input) && isFinite(input);
}

function isFunction(input) {
  return getPropType(input) === 'function';
}

function isDate(input) {
  return getPreciseType(input) === 'date';
}

// Equivalent of `typeof` but with special handling for array and regexp.
function getPropType(propValue) {
  const propType = typeof propValue;
  if (Array.isArray(propValue)) {
    return 'array';
  }

  if (propValue instanceof RegExp) {
    // Old webkits (at least until Android 4.0) return 'function' rather than
    // 'object' for typeof a RegExp.
    return 'object';
  }

  return propType;
}

// This handles more types than `getPropType`, e.g. Date and regexp
function getPreciseType(propValue) {
  const propType = getPropType(propValue);
  if (propType === 'object') {
    if (propValue instanceof Date) {
      return 'date';
    } else if (propValue instanceof RegExp) {
      return 'regexp';
    }
  }

  return propType;
}
