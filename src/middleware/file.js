import rejectingFetch from './rejectingFetch';
import invariant from 'invariant';
import { headersGet, headersPost, headersDelete } from './headers';
import { fileApiPath } from './paths';

const contentTypeTextHeader = { headers: { 'Content-Type': 'text/plain' } };

//returns a fetch object, for you to parse yourself (doesnt automatically convert to json / text)
export const readFile = (fileName) => {
  return rejectingFetch(fileApiPath(fileName), headersGet(contentTypeTextHeader));
};

// if contents === null, then the file is deleted
// Set contents to '' to empty the file
export const writeFile = (fileName, contents) => {
  invariant(fileName, 'file name is required');

  const filePath = fileApiPath(fileName);

  if (contents === null) {
    return rejectingFetch(filePath, headersDelete());
  }

  return rejectingFetch(filePath, headersPost(contents, contentTypeTextHeader));
};
