import invariant from 'invariant';
import path from 'path';
import merge from 'lodash.merge';
import { errorDoesNotExist, errorAlreadyExists, errorInvalidModel, errorVersioningSystem } from '../utils/errors';
import { validateBlock, validateProject, validateOrder } from '../utils/validation';
import * as filePaths from './../utils/filePaths';
import * as versioning from './versioning';
import * as commitMessages from './commitMessages';
import { fileExists, fileRead, fileWrite, fileDelete, directoryMake, directoryDelete } from '../utils/fileSystem';
import * as permissions from './permissions';

/*********
 Helpers
 *********/

// EXISTENCE

const _projectExists = (projectId, sha) => {
  const manifestPath = filePaths.createProjectManifestPath(projectId);
  const projectDataPath = filePaths.createProjectDataPath(projectId);

  if (!sha) {
    return fileExists(manifestPath);
  }
  return versioning.versionExists(projectDataPath, sha);
};

const _blockExists = (blockId, projectId, sha) => {
  const manifestPath = filePaths.createBlockManifestPath(blockId, projectId);
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const relativePath = path.relative(projectDataPath, manifestPath);

  if (!sha) {
    return fileExists(manifestPath);
  }
  return versioning.versionExists(projectDataPath, sha, relativePath);
};

const _orderExists = (orderId, projectId) => {
  const manifestPath = filePaths.createOrderManifestPath(orderId, projectId);
  return fileExists(manifestPath);
};

// READING

const _projectRead = (projectId, sha) => {
  const manifestPath = filePaths.createProjectManifestPath(projectId);
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const relativePath = path.relative(projectDataPath, manifestPath);

  if (!sha) {
    return fileRead(manifestPath);
  }

  return versioning.checkout(projectDataPath, relativePath, sha)
    .then(string => JSON.parse(string));
};

const _blockRead = (blockId, projectId, sha) => {
  const manifestPath = filePaths.createBlockManifestPath(blockId, projectId);
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const relativePath = path.relative(projectDataPath, manifestPath);

  if (!sha) {
    return fileRead(manifestPath);
  }

  return versioning.checkout(projectDataPath, relativePath, sha)
    .then(string => JSON.parse(string));
};

export const _orderRead = (orderId, projectId) => {
  const manifestPath = filePaths.createOrderManifestPath(orderId, projectId);
  return fileRead(manifestPath);
};

// SETUP

const _projectSetup = (projectId, userId) => {
  const projectPath = filePaths.createProjectPath(projectId);
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const orderDirectory = filePaths.createOrderDirectoryPath(projectId);
  const blockDirectory = filePaths.createBlockDirectoryPath(projectId);

  return directoryMake(projectPath)
    .then(() => directoryMake(projectDataPath))
    .then(() => directoryMake(orderDirectory))
    .then(() => directoryMake(blockDirectory))
    .then(() => permissions.createProjectPermissions(projectId, userId))
    .then(() => versioning.initialize(projectDataPath));
};

const _blockSetup = (blockId, projectId) => {
  const blockPath = filePaths.createBlockPath(blockId, projectId);
  return directoryMake(blockPath);
};

// WRITING

const _projectWrite = (projectId, project = {}) => {
  const manifestPath = filePaths.createProjectManifestPath(projectId);
  return fileWrite(manifestPath, project);
};

const _blockWrite = (blockId, block = {}, projectId) => {
  const manifestPath = filePaths.createBlockManifestPath(blockId, projectId);
  return fileWrite(manifestPath, block);
};

const _orderWrite = (orderId, order = {}, projectId) => {
  const manifestPath = filePaths.createOrderManifestPath(orderId, projectId);
  return fileWrite(manifestPath, order);
};

// COMMITS

//expects a well-formed commit message from commitMessages.js
const _projectCommit = (projectId, message) => {
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const commitMessage = !message ? commitMessages.messageProject(projectId) : message;
  return versioning.commit(projectDataPath, commitMessage)
    .then(sha => versioning.getCommit(projectDataPath, sha));
};

//expects a well-formed commit message from commitMessages.js
const _blockCommit = (blockId, projectId, message) => {
  const projectDataPath = filePaths.createProjectDataPath(projectId);
  const commitMessage = !message ? commitMessages.messageBlock(blockId) : message;
  return versioning.commit(projectDataPath, commitMessage)
    .then(sha => versioning.getCommit(path, sha));
};

/*********
 API
 *********/

//SAVE

//e.g. autosave
export const projectSave = (projectId, messageAddition) => {
  const message = commitMessages.messageSave(projectId, messageAddition);
  return _projectCommit(projectId, message);
};

//explicit save aka 'snapshot'
export const projectSnapshot = (projectId, messageAddition) => {
  const message = commitMessages.messageSnapshot(projectId, messageAddition);
  return _projectCommit(projectId, message);
};

//EXISTS

export const projectExists = (projectId, sha) => {
  return _projectExists(projectId, sha);
};

export const blockExists = (blockId, projectId, sha) => {
  return _blockExists(blockId, projectId, sha);
};

export const orderExists = (orderId, projectId) => {
  return _orderExists(orderId, projectId);
};

const projectAssertNew = (projectId) => {
  return projectExists(projectId)
    .then(() => Promise.reject(errorAlreadyExists))
    .catch((err) => {
      if (err === errorDoesNotExist) {
        return Promise.resolve(projectId);
      }
      return Promise.reject(err);
    });
};

const blockAssertNew = (blockId, projectId) => {
  return blockExists(blockId, projectId)
    .then(() => Promise.reject(errorAlreadyExists))
    .catch((err) => {
      if (err === errorDoesNotExist) {
        return Promise.resolve(blockId);
      }
      return Promise.reject(err);
    });
};

const orderAssertNew = (orderId, projectId) => {
  return orderExists(orderId, projectId)
    .then(() => Promise.reject(errorAlreadyExists))
    .catch((err) => {
      if (err === errorDoesNotExist) {
        return Promise.resolve(orderId);
      }
      return Promise.reject(err);
    });
};

//GET
//resolve with null if does not exist

export const projectGet = (projectId, sha) => {
  return _projectRead(projectId, sha)
    .catch(err => {
      console.log('error reading project ' + projectId, err);
      if (err === errorDoesNotExist && !sha) {
        return Promise.resolve(null);
      }
      //let the versioning error fall through, or uncaught error
      return Promise.reject(err);
    });
};

export const blockGet = (blockId, projectId, sha) => {
  return _blockRead(blockId, projectId, sha)
    .catch(err => {
      if (err === errorDoesNotExist) {
        return Promise.resolve(null);
      }
      return Promise.reject(err);
    });
};

export const orderGet = (orderId, projectId) => {
  return _orderRead(orderId, projectId)
    .catch(err => {
      if (err === errorDoesNotExist) {
        return Promise.resolve(null);
      }
      return Promise.reject(err);
    });
};

//CREATE

export const projectCreate = (projectId, project, userId) => {
  invariant(typeof userId !== 'undefined', 'user id is required');

  return projectAssertNew(projectId)
    .then(() => _projectSetup(projectId, userId))
    .then(() => _projectWrite(projectId, project))
    //MAY keep this initial commit message, even when not auto-commiting for all atomic operations
    //since create is a different operation than just called projectWrite / projectMerge
    //.then(() => _projectCommit(projectId, commitMessages.messageCreateProject(projectId)))
    .then(() => project);
};

export const blockCreate = (blockId, block, projectId) => {
  return blockAssertNew(blockId, projectId)
    .then(() => _blockSetup(blockId, projectId))
    .then(() => _blockWrite(blockId, block, projectId))
    //.then(() => _blockCommit(blockId, projectId, commitMessages.messageCreateBlock(blockId)))
    .then(() => block);
};

//SET (WRITE + MERGE)

export const projectWrite = (projectId, project, userId) => {
  const idedProject = Object.assign({}, project, { id: projectId });

  if (!validateProject(idedProject)) {
    return Promise.reject(errorInvalidModel);
  }

  //create directory etc. if doesn't exist
  return projectExists(projectId)
    .catch(() => _projectSetup(projectId, userId))
    .then(() => _projectWrite(projectId, idedProject))
    //.then(() => _projectCommit(projectId))
    .then(() => idedProject);
};

export const projectMerge = (projectId, project, userId) => {
  return projectGet(projectId)
    .then(oldProject => {
      const merged = merge({}, oldProject, project, { id: projectId });
      return projectWrite(projectId, merged, userId);
    });
};

export const blockWrite = (blockId, block, projectId) => {
  const idedBlock = Object.assign({}, block, {
    projectId,
    id: blockId,
  });

  if (!validateBlock(idedBlock)) {
    return Promise.reject(errorInvalidModel);
  }

  //create directory etc. if doesn't exist
  return blockExists(blockId, projectId)
    .catch(() => _blockSetup(blockId, projectId))
    .then(() => _blockWrite(blockId, idedBlock, projectId))
    //.then(() => _blockCommit(blockId, projectId))
    .then(() => idedBlock);
};

export const blockMerge = (blockId, block, projectId) => {
  return blockGet(blockId, projectId)
    .then(oldBlock => {
      const merged = merge({}, oldBlock, block, {
        projectId,
        id: blockId,
      });
      return blockWrite(blockId, merged, projectId);
    });
};

export const orderWrite = (orderId, order, projectId) => {
  const idedOrder = Object.assign({}, order, {
    projectId,
    id: orderId,
  });

  if (!validateOrder(idedOrder)) {
    return Promise.reject(errorInvalidModel);
  }

  return orderAssertNew(orderId, projectId)
    .then(() => _orderWrite(orderId, idedOrder, projectId))
    .then(() => idedOrder);
};

//DELETE

export const projectDelete = (projectId) => {
  return projectExists(projectId)
    .then(() => {
      //const projectPath = filePaths.createProjectPath(projectId);
      //return directoryDelete(projectPath);

      //dont want to actually delete it.. just delete the permissions (move to a new file)
      const projectPermissionsPath = filePaths.createProjectPermissionsPath(projectId);
      const deletedOwnerPath = filePaths.createProjectPath(projectId, 'priorOwner.json');
      return fileRead(projectPermissionsPath)
        .then(contents => {
          return fileDelete(projectPermissionsPath)
          //but also should track somewhere who used to own it...
            .then(() => fileWrite(deletedOwnerPath, contents));
        });
    })
    //no need to commit... its deleted (and permissions out of scope of data folder)
    .then(() => projectId);
};

export const blockDelete = (blockId, projectId) => {
  const blockPath = filePaths.createBlockPath(blockId, projectId);
  return blockExists(blockId, projectId)
    .then(() => directoryDelete(blockPath))
    //.then(() => _projectCommit(projectId, commitMessages.messageDeleteBlock(blockId)))
    .then(() => blockId);
};

//not sure why you would do this...
export const orderDelete = (orderId, projectId) => {
  const orderPath = filePaths.createOrderManifestPath(orderId, projectId);
  return orderId(orderId, projectId)
    .then(() => fileDelete(orderPath))
    .then(() => orderId);
};

//sequence

export const sequenceExists = (md5) => {
  const sequencePath = filePaths.createSequencePath(md5);
  return fileExists(sequencePath)
    .then(() => sequencePath);
};

export const sequenceGet = (md5) => {
  return sequenceExists(md5)
    .then(path => fileRead(path, false));
};

//blockId and projectId optional, will create commit if provided
export const sequenceWrite = (md5, sequence, blockId, projectId) => {
  const sequencePath = filePaths.createSequencePath(md5);
  return fileWrite(sequencePath, sequence, false)
  //.then(() => {
  //  if (blockId && projectId) {
  //    return _blockCommit(blockId, projectId, commitMessages.messageSequenceUpdate(blockId, sequence));
  //  }
  //})
    .then(() => sequence);
};

//unassociate sequence, commit block
export const sequenceRemove = (blockId, projectId) => {
  return _blockCommit(blockId, projectId, commitMessages.messageSequenceUpdate(blockId, false));
};

//probably dont want to let people do this, since sequence may be referenced by multiple blocks...
export const sequenceDelete = (md5) => {
  return sequenceExists(md5)
    .then(path => fileDelete(path));
};

