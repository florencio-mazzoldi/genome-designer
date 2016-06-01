import * as filePaths from '../../server/utils/filePaths';
import * as fileSystem from '../../server/utils/fileSystem';

import parts from '../../src/inventory/andrea';

const md5s = parts.map(part => part.sequence.md5);

export default function copyFromStorage() {
  return Promise.all(md5s.map(md5 => {
    const source = filePaths.createSequencePath(md5);
    const dest = `${__dirname}/sequences/${md5}`;
    return fileSystem.fileCopy(source, dest);
  }));
}
