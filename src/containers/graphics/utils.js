import * as validators from '../../schemas/fields/validators';
import safeValidate from '../../schemas/fields/safeValidate';

export const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export const rad2deg = (rad) => {
  return rad * (180 / Math.PI);
};

export const isRealNumber = safeValidate.bind(null, validators.number({reals: true}), false);

/**
 * true if ~1
 * @param  {number} val
 * @return {boolean}
 */
export const isOne = (val) => {
  return Math.abs(1 - val) <= 1e-6;
};

/**
 * index of child in parent
 * @param  {[type]} node [description]
 * @return {[type]}      [description]
 */
export const nodeIndex = (node) => {
  if (!node.parentNode) {
    return -1;
  }
  let i = 0;
  while (i < node.parentNode.children.length) {
    if (node.parentNode.children[i] == node) {
      return i;
    }
    i += 1;
  }
};

/**
 * true if ~0
 * @param  {number} val
 * @return {boolean}
 */
export const isZero = (val) => {
  return Math.abs(val) <= 1e-6;
};

/**
 * true if the number v is very close to K
 * @param  {number} v1
 * @param  {number} v2
 * @return {boolean}
 */
export const nearly = (v1, v2) => {
  return Math.abs(v1 - v2) < 1e-6;
};
