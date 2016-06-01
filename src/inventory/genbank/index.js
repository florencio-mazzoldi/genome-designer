/*
 Genbank refers to files that we have parsed on our server, and source files are expected to have been saved on our server as well.
 This is (not yet) a search mechanism - NCBI is probably what youre looking for to search for genbank files
 */

import { importPath } from '../../middleware/paths';

export const name = 'Genbank';

export const sourceUrl = ({ url, id }) => {
  return url || importPath(`genbank/file/${id}`);
};
