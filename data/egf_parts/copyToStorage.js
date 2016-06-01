import * as filePaths from '../../server/utils/filePaths';
import * as fileSystem from '../../server/utils/fileSystem';

const pathSeqeunces = `${__dirname}/sequences`;

export default function copyToStorage() {
  return fileSystem.directoryContents(pathSeqeunces)
    .then(sequenceFiles => {
      return Promise.all(sequenceFiles.map(fileName => {
        const source = `${pathSeqeunces}/${fileName}`;
        const dest = filePaths.createSequencePath(fileName);
        return fileSystem.fileCopy(source, dest);
      }));
    });
}
