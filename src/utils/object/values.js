
/**
 * return all the values in an object
 */
export default function objectValues(obj) {
  return obj ? Object.keys(obj).map(key => obj[key]) : [];
}
