import { directoryMake } from '../server/utils/fileSystem';
import { createStorageUrl } from '../server/utils/filePaths';

import copyToStorage from '../data/egf_parts/copyToStorage';

async function setup() {
  await Promise.all([
    directoryMake(createStorageUrl()),
    directoryMake(createStorageUrl('projects')),
    directoryMake(createStorageUrl('sequence')),
    directoryMake(createStorageUrl('file')),
    directoryMake(createStorageUrl('temp')),
    directoryMake(createStorageUrl('genbank')),
    directoryMake(createStorageUrl('csv')),
  ]);

  await copyToStorage();
}

export default setup;
