import rejectingFetch from './rejectingFetch';
import invariant from 'invariant';
import { headersGet, headersPost, headersPut, headersDelete } from './headers';
import { importPath, exportPath } from './paths';

const contentTypeTextHeader = { headers: { 'Content-Type': 'text/plain' } };

/**
 * import a genbank or CSV file into the given project or into a new project.
 * project ID is returned and should be reloaded if the current project or opened if a new project.
 * Promise resolves with projectId on success and rejects with statusText of xhr
 */
//todo - this should use fetch...
export const importGenbankOrCSV = (file, projectId) => {
  invariant(file && file.name, 'expected a file object of the type that can be added to FormData');
  const formData = new FormData();
  formData.append('data', file, file.name);
  const isCSV = file.name.toLowerCase().endsWith('.csv');
  const uri = `/import/${isCSV ? 'csv' : 'genbank'}${projectId ? '/' + projectId : ''}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uri, true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.response);
        invariant(json && json.ProjectId, 'expect a project ID');
        resolve(json.ProjectId);
      } else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = () => {
      reject(xhr.statusText);
    };
    xhr.send(formData);
  });
};

export const exportBlock = (pluginId, inputs) => {
  const stringified = JSON.stringify(inputs);
  return rejectingFetch(exportPath(`block/${pluginId}`), headersPost(stringified))
    .then(resp => resp.json());
};

export const exportProject = (pluginId, inputs) => {
  const stringified = JSON.stringify(inputs);
  return rejectingFetch(exportPath(`project/${pluginId}`), headersPost(stringified))
    .then(resp => resp.json());
};

export const importConstruct = (pluginId, input, projectId) => {
  return rejectingFetch(importPath(`${pluginId}/${projectId}`), headersPost(input, contentTypeTextHeader))
    .then(resp => resp.json());
};

export const importProject = (pluginId, input) => {
  return rejectingFetch(importPath(`${pluginId}`), headersPost(input, contentTypeTextHeader))
    .then(resp => resp.json());
};

//convert without creating a project
export const convertGenbank = (genbank) => {
  return rejectingFetch(importPath(`genbank/convert`), headersPost(genbank, contentTypeTextHeader))
    .then(resp => resp.json());
};
