import invariant from 'invariant';
import { errorInvalidModel, errorDoesNotExist } from '../utils/errors';
import * as persistence from './persistence';
import { validateBlock, validateProject } from '../utils/validation';
import { findProjectFromBlock, getAllBlockIdsInProject, getAllBlocksInProject } from './querying';

export const createRollup = (project, ...blocks) => ({
  project,
  blocks: [...new Set(blocks)],
});

export const getProjectRollup = (projectId) => {
  //dont use Promise.all so we can handle errors of project not existing better
  return persistence.projectGet(projectId)
    .then(project => {
      return getAllBlocksInProject(projectId)
        .then(blocks => {
          return {
            project,
            blocks,
          };
        });
    });
};

export const writeProjectRollup = (projectId, rollup, userId) => {
  const { project, blocks } = rollup;
  const newBlockIds = blocks.map(block => block.id);

  if (projectId !== project.id) {
    return Promise.reject('rollup project ID does not match');
  }

  return persistence.projectExists(projectId)
    .catch(err => {
      //if the project doesn't exist, let's make it
      if (err === errorDoesNotExist) {
        invariant(typeof userId !== 'undefined', 'userID is necessary to create a project from rollup');

        return persistence.projectCreate(projectId, project, userId);
      }
      return Promise.reject(err);
    })
    .then(() => {
      //validate all the blocks and project before we save
      const projectValid = validateProject(project);
      const blocksValid = blocks.every(block => validateBlock(block));
      if (!projectValid || !blocksValid) {
        return Promise.reject(errorInvalidModel);
      }
    })
    .then(() => getAllBlockIdsInProject(projectId))
    .then(extantBlockIds => {
      const differenceIds = extantBlockIds.filter(blockId => newBlockIds.indexOf(blockId) < 0);
      return Promise.all([
        ...differenceIds.map(blockId => persistence.blockDelete(blockId, projectId)),
      ]);
    })
    .then(() => Promise.all([
      persistence.projectWrite(projectId, project),
      ...blocks.map(block => persistence.blockWrite(block.id, block, projectId)),
    ]))
    .then(() => rollup);
};

//helper
const getBlockInRollById = (id, roll) => roll.blocks.find(block => block.id === id);

//given block ID and rollup, gets all options
const getOptionsGivenRollup = (id, roll) => {
  const block = getBlockInRollById(id, roll);
  const { options } = block;
  return Object.keys(options).map(optionId => getBlockInRollById(id, roll));
};

//given a rollup and rootId, recursively gets components of root block (and root block itself)
const getComponentsRecursivelyGivenRollup = (rootId, projectRollup, acc = {}) => {
  const root = getBlockInRollById(rootId, projectRollup);
  acc[rootId] = root;

  //recurse
  root.components.forEach(compId => getComponentsRecursivelyGivenRollup(compId, projectRollup, acc));

  return acc;
};

export const getContents = (rootId, forceProjectId) => {
  const projectIdPromise = forceProjectId ?
    Promise.resolve(forceProjectId) :
    findProjectFromBlock(rootId);

  return projectIdPromise
    .then(projectId => getProjectRollup(projectId))
    .then(rollup => {
      const components = getComponentsRecursivelyGivenRollup(rootId, rollup);

      const options = Object.keys(components)
        .map(compId => components[compId])
        .filter(comp => comp.rules.list === true)
        .reduce((acc, component) => acc.concat(getOptionsGivenRollup(component.id, rollup)), []);

      return {
        components,
        options,
      };
    });
};

/**
 * @description Recursively get children of a block (and returns block itself)
 * @param rootId {ID} root to get components of
 * @param forceProjectId {ID=} Id of project, internal use (or force one)
 * @returns {object} with keys of blocks
 */
export const getComponents = (rootId, forceProjectId) => {
  return getContents(rootId, forceProjectId)
    .then(({components}) => components);
};

/**
 * @description Recursively get all options of a block and its components. Does not include block itself
 * @param rootId {ID} root to get components of
 * @param forceProjectId {ID=} Id of project, internal use (or force one)
 * @returns {object} with keys of blocks
 */
export const getOptions = (rootId, forceProjectId) => {
  return getContents(rootId, forceProjectId)
    .then(({options}) => options);
};

//future - function which only returns the components of a project, not the list options? not sure what use case is though....
