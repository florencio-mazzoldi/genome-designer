import uuid from 'node-uuid';
import { set as pathSet, unset as pathUnset, cloneDeep, merge } from 'lodash';
import invariant from 'invariant';
import InstanceSchema from '../schemas/Instance';
import safeValidate from '../schemas/fields/safeValidate';
import { version } from '../schemas/fields/validators';

const versionValidator = (ver, required = false) => safeValidate(version(), required, ver);

/**
 * @description
 * you can pass as argument to the constructor either:
 *  - an object, which will extend the created instance
 */
export default class Instance {
  constructor(input = {}, subclassBase, moreFields) {
    invariant(typeof input === 'object', 'must pass an object (or leave undefined) to model constructor');

    merge(this,
      InstanceSchema.scaffold(),
      subclassBase,
      moreFields,
      input,
    );

    if (process.env.NODE_ENV !== 'production') {
      require('deep-freeze')(this);
    }
  }

  //use cloneDeep and perform mutation prior to calling constructor because constructor may freeze object

  // returns a new instance
  // uses lodash _.set() for path, e.g. 'a.b[0].c'
  mutate(path, value) {
    const base = cloneDeep(this);
    pathSet(base, path, value);
    return new this.constructor(base);
  }

  // returns a new instance
  // deep merge using _.merge
  merge(obj) {
    const base = cloneDeep(this);
    merge(base, obj);
    return new this.constructor(base);
  }

  //clone can accept just an ID (e.g. project), but likely want to pass an object (e.g. block, which also has field projectId in parent)
  clone(parentInfo = {}, overwrites = {}) {
    const cloned = cloneDeep(this);
    const inputObject = (typeof parentInfo === 'string') ?
    { version: parentInfo } :
      parentInfo;

    const parentObject = Object.assign({
      id: cloned.id,
      version: cloned.version,
    }, inputObject);

    invariant(versionValidator(parentObject.version), 'must pass a valid version (SHA), got ' + parentObject.version);

    const clone = merge(cloned, overwrites, {
      parents: [parentObject].concat(cloned.parents),
    });
    delete clone.id;
    return new this.constructor(clone);
  }
}
