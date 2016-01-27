import uuid from 'node-uuid';
import 'isomorphic-fetch';
import invariant from 'invariant';
import ProjectDefinition from '../schemas/Project';
import BlockDefinition from '../schemas/Block';

/*************************
 Utils
 *************************/

//fetch only supports absolute paths
//include a check for tests, hardcode for now
const serverRoot = (/http/gi).test(window.location.protocol) ?
  `${window.location.protocol}//${window.location.host}/` :
  'http://localhost:3000/';

//paths related to extensions
export const computePath = (id) => serverRoot + 'compute/' + id;
export const importPath = (id) => serverRoot + 'import/' + id;
export const exportPath = (id) => serverRoot + 'export/' + id;
export const searchPath = (id) => serverRoot + 'search/' + id;

//main API
export const apiPath = (path) => serverRoot + 'api/' + path;

//hack - set testing stub from start for now so all requests work
let sessionKey = 'testingStub';

export const getSessionKey = () => {
  return sessionKey;
};

const headersGet = () => ({
  method: 'GET',
  headers: {
    sessionkey: sessionKey,
  },
});

const headersPost = (body, mimeType = 'application/json') => ({
  method: 'POST',
  headers: {
    'Content-Type': mimeType,
    sessionkey: sessionKey,
  },
  body,
});

const headersPut = (body, mimeType = 'application/json') => ({
  method: 'PUT',
  headers: {
    'Content-Type': mimeType,
    sessionkey: sessionKey,
  },
  body,
});

const headersDelete = () => ({
  method: 'DELETE',
  headers: {
    sessionkey: sessionKey,
  },
});

/*************************
 Server Communication
 *************************/

export const login = (user, password) => {
  return fetch(serverRoot + `login?user=${user}&password=${password}`, headersGet())
    .then(resp => resp.json())
    .then(json => {
      sessionKey = json.sessionkey;
      return sessionKey;
    });
};

export const createBlock = (block) => {
  invariant(BlockDefinition.validate(block), 'Block does not pass validation: ' + block);
  try {
    const stringified = JSON.stringify(block);
    return fetch(apiPath(`block/`), headersPost(stringified));
  } catch (err) {
    return Promise.reject('error stringifying block');
  }
};

export const retrieveBlock = (id) => {
  return fetch(apiPath(`block/${id}`), headersGet())
    .then(resp => resp.json());
};

export const saveBlock = (block) => {
  invariant(BlockDefinition.validate(block), 'Block does not pass validation: ' + block);
  try {
    const stringified = JSON.stringify(block);
    return fetch(apiPath(`block/${block.id}`), headersPut(stringified));
  } catch (err) {
    return Promise.reject('error stringifying block');
  }
};

export const saveProject = (project) => {
  invariant(ProjectDefinition.validate(project), 'Project does not pass validation: ' + project);
  try {
    const stringified = JSON.stringify(project);
    return fetch(apiPath(`project/${project.id}`), headersPut(stringified));
  } catch (err) {
    return Promise.reject('error stringifying project');
  }
};

//returns a fetch object, for you to parse yourself (doesnt automatically convert to json)
export const readFile = (fileName) => {
  return fetch(apiPath(`file/${fileName}`), headersGet());
};

// if contents === null, then the file is deleted
// Set contents to '' to empty the file
export const writeFile = (fileName = uuid.v4(), contents) => {
  const filePath = apiPath(`file/${fileName}`);

  if (contents === null) {
    return fetch(filePath, headersDelete());
  }

  return fetch(filePath, headersPost(contents));
};

/**************************
Running extensions
**************************/

export const computeWorkflow = (id, inputs) => {
  try {
    const stringified = JSON.stringify(inputs);
    return fetch(computePath(`${id}`), headersPost(stringified));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const exportBlock = (id, inputs) => {
  try {
    const stringified = JSON.stringify(inputs);
    return fetch(exportPath(`block/${id}`), headersPost(stringified));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const exportProject = (id, inputs) => {
  try {
    const stringified = JSON.stringify(inputs);
    return fetch(exportPath(`project/${id}`), headersPost(stringified));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const importBlock = (id, input) => {
  try {
    return fetch(importPath(`block/${id}`), headersPost(JSON.stringify({ text: input })));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const importProject = (id, input) => {
  try {
    return fetch(importPath(`project/${id}`), headersPost(JSON.stringify({ text: input })));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const search = (id, inputs) => {
  try {
    const stringified = JSON.stringify(inputs);
    return fetch(searchPath(`${id}`), headersPost(stringified));
  } catch (err) {
    return Promise.reject('error stringifying input object');
  }
};

export const getManifests = (id) => {
  try {
    return fetch(serverRoot + id + '/manifests', headersGet());
  } catch (err) {
    return Promise.reject('no such extension category: ' + id);
  }
};
