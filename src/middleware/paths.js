//fetch only supports absolute paths
//include a check for tests, hardcode for now
export const serverRoot = (global.location && (/http/gi).test(global.location.protocol)) ?
  `${global.location.protocol}//${global.location.host}/` :
  'http://localhost:3000/';

export const authPath = (path) => serverRoot + 'auth/' + path;
export const dataApiPath = (path) => serverRoot + 'data/' + path;
export const orderApiPath = (path) => serverRoot + 'order/' + path;
export const extensionsPath = (id) => serverRoot + 'extensions/' + id;
export const fileApiPath = (path) => serverRoot + 'file/' + path;
export const importPath = (path) => serverRoot + 'import/' + path;
export const exportPath = (path) => serverRoot + 'export/' + path;
