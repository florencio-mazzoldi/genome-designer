import { directoryMake } from '../server/utils/fileSystem';
import { createStorageUrl } from '../server/utils/filePaths';

import copyToStorage from '../data/egf_parts/copyToStorage';

async function setup() {
  await Promise.all([
    directoryMake(createStorageUrl()),

    //paths dependent on whether testing or not
    directoryMake(createStorageUrl('projects')),
    directoryMake(createStorageUrl('sequence')),
    directoryMake(createStorageUrl('file')),
    directoryMake(createStorageUrl('temp')),
    directoryMake(createStorageUrl('genbank')),
    directoryMake(createStorageUrl('csv')),
    directoryMake(createStorageUrl('trash')),
  ]);

  await copyToStorage();
}

export default setup;
