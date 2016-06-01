import path from 'path';
import invariant from 'invariant';

const makePath = (...paths) => {
  if (process.env.BUILD) {
    return path.resolve(__dirname, '../storage/', ...paths);
  }
  return path.resolve(__dirname, '../../storage/', ...paths);
};

export const filePath = 'file';
export const sequencePath = 'sequence';
export const blockPath = 'blocks';
export const projectPath = 'projects';
export const projectDataPath = 'data';
export const orderPath = 'orders';

export const permissionsFilename = 'permissions.json';
export const manifestFilename = 'manifest.json';

//All files are put in the storage folder (until platform comes along)
export const createStorageUrl = (...urls) => {
  const dev = ((process.env.NODE_ENV === 'test') ? 'test/' : '');
  return makePath(dev, ...urls);
};

/***** files *****/

export const createFilePath = (path) => {
  return createStorageUrl(filePath, path);
};

/***** data *****/

//PROJECTS

export const createProjectsDirectoryPath = () => createStorageUrl(projectPath);

export const createProjectPath = (projectId, ...rest) => {
  invariant(projectId, 'Project ID required');
  return createStorageUrl(projectPath, projectId, ...rest);
};

export const createProjectDataPath = (projectId, ...rest) => {
  return createProjectPath(projectId, projectDataPath, ...rest);
};

export const createProjectPermissionsPath = (projectId) => {
  return createProjectPath(projectId, permissionsFilename);
};

export const createProjectManifestPath = (projectId) => {
  return createProjectDataPath(projectId, manifestFilename);
};

//BLOCKS

export const createBlockDirectoryPath = (projectId, ...rest) => {
  return createProjectDataPath(projectId, blockPath, ...rest);
};

export const createBlockPath = (blockId, projectId, ...rest) => {
  invariant(blockId, 'Block ID required');
  //future, may automatically fetch projectId somehow
  invariant(projectId, 'Project ID required');

  return createBlockDirectoryPath(projectId, blockId, ...rest);
};

export const createBlockManifestPath = (blockId, projectId) => {
  return createBlockPath(blockId, projectId, manifestFilename);
};

//ORDERS

export const createOrderDirectoryPath = (projectId, ...rest) => {
  return createProjectPath(projectId, orderPath, ...rest);
};

//orders dont have their own directory, they are just files named by orderId
export const createOrderManifestPath = (orderId, projectId) => {
  invariant(orderId, 'Order ID required');
  invariant(projectId, 'Project ID required');

  return createOrderDirectoryPath(projectId, `${orderId}.json`);
};

//SEQUENCE

export const createSequencePath = (md5) => {
  return createStorageUrl(sequencePath, md5);
};
