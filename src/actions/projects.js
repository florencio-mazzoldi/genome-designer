/*
Copyright 2016 Autodesk,Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * @module Actions_Projects
 * @memberOf module:Actions
 */
import invariant from 'invariant';
import * as ActionTypes from '../constants/ActionTypes';
import { saveProject, loadProject, snapshot, listProjects, deleteProject } from '../middleware/data';
import * as projectSelectors from '../selectors/projects';
import * as undoActions from '../store/undo/actions';
import { push } from 'react-router-redux';

import * as instanceMap from '../store/instanceMap';
import Block from '../models/Block';
import Project from '../models/Project';
import emptyProjectWithConstruct from '../../data/emptyProject/index';
import { pauseAction, resumeAction } from '../store/pausableStore';

import { getItem, setItem } from '../middleware/localStorageCache';
const recentProjectKey = 'mostRecentProject';
const saveMessageKey = 'projectSaveMessage';

const rollupDefined = (roll) => roll && roll.project && roll.blocks;

//this is a backup for performing arbitrary mutations
export const projectMerge = (projectId, toMerge) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.merge(toMerge);
    dispatch({
      type: ActionTypes.PROJECT_MERGE,
      undoable: true,
      project,
    });
    return project;
  };
};

/**
 * List manifests of all of a user's projects
 * @function
 * @returns {Promise}
 * @resolve {Array.<Project>}
 * @reject {Response}
 */
export const projectList = () => {
  return (dispatch, getState) => {
    return listProjects()
      .then(projectManifests => {
        const projects = projectManifests.map(manifest => new Project(manifest));

        dispatch({
          type: ActionTypes.PROJECT_LIST,
          projects,
        });

        return projects;
      });
  };
};

/**
 * Delete a project. THIS CANNOT BE UNDONE.
 * @function
 * @param {UUID} projectId
 * @returns {UUID} project ID deleted
 */
export const projectDelete = (projectId) => {
  return (dispatch, getState) => {
    return deleteProject(projectId)
    //catch deleting a project that is not saved (will 404)
      .catch(resp => {
        if (resp.status === 404) {
          return null;
        }
        return Promise.reject(resp);
      })
      .then(() => {
        //don't delete the blocks, as they may be shared between projects (or, could delete and then force loading for next / current project)
        dispatch({
          type: ActionTypes.PROJECT_DELETE,
          projectId,
        });
        return projectId;
      });
  };
};

/**
 * Save the project, e.g. for autosave.
 * @function
 * @param {UUID} [inputProjectId] Omit to save the current project
 * @param {boolean} [forceSave=false] Force saving, even if the project has not changed since last save
 * @returns {Promise}
 * @resolve {sha|null} SHA of save, or null if save was unnecessary
 * @reject {string|Response} Error message
 */
export const projectSave = (inputProjectId, forceSave = false) => {
  return (dispatch, getState) => {
    const currentProjectId = dispatch(projectSelectors.projectGetCurrentId());
    const projectId = !!inputProjectId ? inputProjectId : currentProjectId;
    if (!projectId) {
      return Promise.resolve(null);
    }

    const roll = dispatch(projectSelectors.projectCreateRollup(projectId));
    if (!rollupDefined(roll)) {
      return Promise.reject('attempting to save project which is not loaded');
    }

    //check if project is new, and save only if it is (or forcing the save)
    if (!instanceMap.isRollupNew(roll) && forceSave !== true) {
      return Promise.resolve(null);
    }

    instanceMap.saveRollup(roll);

    return saveProject(projectId, roll)
      .then(commitInfo => {
        setItem(recentProjectKey, projectId);

        //if no version => first time saving, show a grunt
        if (!getItem(saveMessageKey)) {
          dispatch({
            type: ActionTypes.UI_SET_GRUNT,
            gruntMessage: 'Project Saved. Changes will continue to be saved automatically as you work.',
          });
          setItem(saveMessageKey, 'true');
        }

        const { sha, time } = commitInfo;
        dispatch({
          type: ActionTypes.PROJECT_SAVE,
          projectId,
          sha,
          time,
        });
        return sha;
      });
  };
};

/**
 * Snapshots are saves of the project at an important point, creating an explicit commit with a user-specified message.
 * @function
 * @param {UUID} projectId
 * @param {string} message Commit message
 * @param {boolean} [withRollup=true] Save the current version of the project
 * @returns {Promise}
 * @resolve {sha} SHA of snapshot
 * @reject {string|Response} Error message
 */
export const projectSnapshot = (projectId, message, withRollup = true) => {
  return (dispatch, getState) => {
    const roll = withRollup ?
      dispatch(projectSelectors.projectCreateRollup(projectId)) :
    {};

    if (withRollup) {
      if (rollupDefined(roll)) {
        instanceMap.saveRollup(roll);
      } else {
        return Promise.reject('attempting to save project which is not loaded');
      }
    }

    return snapshot(projectId, message, roll)
      .then(commitInfo => {
        if (!commitInfo) {
          return null;
        }

        const { sha } = commitInfo;
        dispatch({
          type: ActionTypes.PROJECT_SNAPSHOT,
          projectId,
          sha,
        });
        return sha;
      });
  };
};

/**
 * Create a project
 * @function
 * @param {Object} initialModel Data to merge onto scaffold
 * @returns {Project} New project
 */
export const projectCreate = (initialModel) => {
  return (dispatch, getState) => {
    const project = new Project(initialModel);
    dispatch({
      type: ActionTypes.PROJECT_CREATE,
      project,
    });

    return project;
  };
};

/**
 * Internal method to load a project. Attempt to load another on failure. Used internally by projectLoad, can recursive in this verison.
 * @function
 * @private
 * @param projectId
 * @param {Array|boolean} [loadMoreOnFail=false] Pass array for list of IDs to ignore
 * @param dispatch Pass in the dispatch function for the store
 * @returns Promise
 * @resolve {Rollup} loaded Project + Block Map
 * @reject
 */
const _projectLoad = (projectId, loadMoreOnFail = false, dispatch) => {
  return loadProject(projectId)
    .then(rollup => {
      const { project, blocks } = rollup;
      const projectModel = new Project(project);
      const blockMap = Object.keys(blocks)
        .map(blockId => blocks[blockId])
        .map((blockObject) => new Block(blockObject))
        .reduce((acc, block) => Object.assign(acc, { [block.id]: block }), {});

      return {
        project: projectModel,
        blocks: blockMap,
      };
    })
    .catch(resp => {
      if ((resp === null || resp.status === 404) && loadMoreOnFail !== true && !Array.isArray(loadMoreOnFail)) {
        return Promise.reject(resp);
      }

      const ignores = Array.isArray(loadMoreOnFail) ? loadMoreOnFail : [];
      if (typeof projectId === 'string') {
        ignores.push(projectId);
      }

      return dispatch(projectList())
        .then(manifests => manifests
          .filter(manifest => !(ignores.indexOf(manifest.id) >= 0))
          //first sort descending by created date (i.e. if never saved) then descending by saved date (so it takes precedence)
          .sort((one, two) => two.metadata.created - one.metadata.created)
          .sort((one, two) => two.lastSaved - one.lastSaved)
        )
        .then(manifests => {
          if (manifests.length) {
            const nextId = manifests[0].id;
            //recurse, ignoring this projectId
            return _projectLoad(nextId, ignores, dispatch);
          }
          //if no manifests, create a new rollup
          //note - this shouldnt happen while users have sample projects
          //todo - may want to hit the server to re-setup the user's account
          return emptyProjectWithConstruct();
        });
    });
};

/**
 * Load a project and add it and its contents to the store
 * @function
 * @param projectId
 * @param {boolean} [avoidCache=false]
 * @param {Array|boolean} [loadMoreOnFail=false] False to only attempt to load single project ID. Pass array of IDs to ignore in case of failure
 * @returns {Promise}
 * @resolve {Project}
 * @reject null
 */
export const projectLoad = (projectId, avoidCache = false, loadMoreOnFail = false) => {
  return (dispatch, getState) => {
    const isCached = !!projectId && instanceMap.projectLoaded(projectId);
    const promise = (avoidCache !== true && isCached) ?
      Promise.resolve(instanceMap.getRollup(projectId)) :
      _projectLoad(projectId, loadMoreOnFail, dispatch);

    //rollup by this point has been converted to class instances
    return promise.then((rollup) => {
      instanceMap.saveRollup(rollup);

      dispatch(pauseAction());
      dispatch(undoActions.transact());

      dispatch({
        type: ActionTypes.BLOCK_STASH,
        blocks: Object.keys(rollup.blocks).map(blockId => rollup.blocks[blockId]),
      });

      dispatch({
        type: ActionTypes.PROJECT_LOAD,
        project: rollup.project,
      });

      dispatch(undoActions.commit());
      dispatch(resumeAction());

      return rollup.project;
    });
  };
};

/**
 * Open a project, that has already been loaded using projectLoad()
 * @function
 * @param [inputProjectId] Defaults to most recently saved project
 * @param {boolean} [skipSave=false] By default, save the current project. Skip saving the current project before navigating e.g. if deleting it.
 * @returns {Promise}
 * @resolve {Project} Project that is opened
 * @reject {null}
 */
export const projectOpen = (inputProjectId, skipSave = false) => {
  return (dispatch, getState) => {
    const currentProjectId = dispatch(projectSelectors.projectGetCurrentId());
    const projectId = inputProjectId || getItem(recentProjectKey);

    //ignore if on a project, and passed the same one
    if (!!currentProjectId && currentProjectId === projectId) {
      return Promise.resolve();
    }

    const promise = (skipSave === true)
      ?
      Promise.resolve()
      :
      dispatch(projectSave(currentProjectId))
        .catch(err => {
          if (!!currentProjectId && currentProjectId !== null && currentProjectId !== 'null') {
            dispatch({
              type: ActionTypes.UI_SET_GRUNT,
              gruntMessage: `Project ${currentProjectId} couldn't be saved, but navigating anyway...`,
            });
          }
        });

    return promise.then(() => {
      /*
       future - clear the store of blocks from the old project.
       need to consider blocks in the inventory - loaded projects, search results, shown in onion etc. Probably means committing to using the instanceMap for mapping state to props in inventory.

       const blockIds = dispatch(projectSelectors.projectListAllBlocks(currentProjectId)).map(block => block.id);

       // pause action e.g. so dont get accidental redraws with blocks missing
       dispatch(pauseAction());

       //remove prior projects blocks from the store
       dispatch({
       type: ActionTypes.BLOCK_DETACH,
       blockIds,
       });

       //projectPage will load the project + its blocks
       //change the route
       dispatch(push(`/project/${projectId}`));

       //dispatch(resumeAction());
       */

      //projectPage will load the project + its blocks
      //change the route
      dispatch(push(`/project/${projectId}`));
      dispatch({
        type: ActionTypes.PROJECT_OPEN,
        projectId,
      });
      return projectId;
    });
  };
};

/**
 * Rename a project
 * @function
 * @param {UUID} projectId
 * @param {string} newName
 * @returns {Project}
 */
export const projectRename = (projectId, newName) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.mutate('metadata.name', newName);
    dispatch({
      type: ActionTypes.PROJECT_RENAME,
      undoable: true,
      project,
    });
    return project;
  };
};

/**
 * Adds a construct to a project. Does not create the construct. Use a Block Action.
 * The added construct should have the project ID of the current project.
 * @function
 * @param {UUID} projectId
 * @param {UUID} componentId
 * @param {boolean} [forceProjectId=false]
 * @returns {Project}
 */
export const projectAddConstruct = (projectId, componentId, forceProjectId = false) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const component = getState().blocks[componentId];

    const componentProjectId = component.projectId;

    dispatch(pauseAction());
    dispatch(undoActions.transact());

    if (componentProjectId !== projectId) {
      invariant(!componentProjectId || forceProjectId === true, 'cannot add component with different projectId! set forceProjectId = true to overwrite.');

      const updatedComponent = component.setProjectId(projectId);
      dispatch({
        type: ActionTypes.BLOCK_STASH,
        block: updatedComponent,
      });
    }

    //todo - should better check + force removal from previous component / project
    //would want to check across other projects as well (but you would for constructs too)

    const project = oldProject.addComponents(componentId);
    dispatch({
      type: ActionTypes.PROJECT_ADD_CONSTRUCT,
      undoable: true,
      project,
    });

    dispatch(undoActions.commit());
    dispatch(resumeAction());

    return project;
  };
};

/**
 * Removes a construct from a project.
 * @function
 * @param {UUID} projectId
 * @param {UUID} componentId
 * @returns {Project}
 */
export const projectRemoveConstruct = (projectId, componentId) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.removeComponents(componentId);
    dispatch({
      type: ActionTypes.PROJECT_REMOVE_CONSTRUCT,
      undoable: true,
      project,
    });
    return project;
  };
};
