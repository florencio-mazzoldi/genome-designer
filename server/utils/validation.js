import Block from '../../src/models/Block';
import Project from '../../src/models/Project';
import Order from '../../src/models/Order';
import * as validators from '../../src/schemas/fields/validators';

import { errorNoIdProvided, errorIdInvalid } from './errors';

export const validateBlock = (instance) => {
  return Block.validate(instance, false);
};

export const validateProject = (instance) => {
  return Project.validate(instance, false);
};

export const validateOrder = instance => {
  return Order.validate(instance, false);
};

//throws on error
const idValidator = validators.id();

/**
 * @description validates an ID. callback called with error if has one, otherwise without any arguments
 * @param {uuid} id
 * @param {function} callback
 */
export const assertValidId = (id, callback = () => {}) => {
  if (!id || typeof id !== 'string') {
    callback(errorNoIdProvided);
  }
  try {
    idValidator(id);
    callback();
  } catch (err) {
    callback(errorIdInvalid);
  }
};
