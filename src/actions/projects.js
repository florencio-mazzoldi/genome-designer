import invariant from 'invariant';
import * as ActionTypes from '../constants/ActionTypes';
import { saveProject, loadProject, snapshot, listProjects, deleteProject } from '../middleware/data';
import * as projectSelectors from '../selectors/projects';
import * as undoActions from '../store/undo/actions';
import { push } from 'react-router-redux';

import Block from '../models/Block';
import Project from '../models/Project';
import { pauseAction, resumeAction } from '../store/pausableStore';

import { getItem, setItem } from '../middleware/localStorageCache';
const recentProjectKey = 'mostRecentProject';

//Promise
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

//Promise
export const projectDelete = (projectId) => {
  return (dispatch, getState) => {
    return deleteProject(projectId)
      .then(() => {
        dispatch({
          type: ActionTypes.PROJECT_DELETE,
          projectId,
        });
        return projectId;
      });
  };
};

//Promise
//this is a background save (e.g. autosave)
export const projectSave = (inputProjectId) => {
  return (dispatch, getState) => {
    //if dont pass project id, get the currently viewed one
    const projectId = !!inputProjectId ? inputProjectId : getState().focus.projectId;
    if (!projectId) {
      return Promise.resolve(null);
    }

    const roll = dispatch(projectSelectors.projectCreateRollup(projectId));
    setItem(recentProjectKey, projectId);

    return saveProject(projectId, roll)
      .then(commitInfo => {
        if (!commitInfo) {
          return null;
        }

        const { sha } = commitInfo;
        dispatch({
          type: ActionTypes.PROJECT_SAVE,
          projectId,
          sha,
        });
        return sha;
      });
  };
};

//Promise
//explicit save e.g. an important point
export const projectSnapshot = (projectId, message, withRollup = true) => {
  return (dispatch, getState) => {
    const roll = withRollup ?
      dispatch(projectSelectors.projectCreateRollup(projectId)) :
    {};

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

//Promise
export const projectLoad = (projectId) => {
  return (dispatch, getState) => {
    return loadProject(projectId)
      .then(rollup => {
        const { project, blocks } = rollup;
        const projectModel = new Project(project);

        dispatch(pauseAction());
        dispatch(undoActions.transact());

        dispatch({
          type: ActionTypes.BLOCK_STASH,
          blocks: blocks.map((blockObject) => new Block(blockObject)),
        });

        dispatch({
          type: ActionTypes.PROJECT_LOAD,
          project: projectModel,
        });

        dispatch(undoActions.commit());
        dispatch(resumeAction());

        return project;
      });
  };
};

//Promise
//default to most recent project if falsy
export const projectOpen = (inputProjectId) => {
  return (dispatch, getState) => {
    //save the current project
    return dispatch(projectSave())
      .then(() => {
        //dont need to load the project, projectPage will handle that
        const projectId = !!inputProjectId ? inputProjectId : getItem(recentProjectKey);
        //alternatively, we can just call react-router's browserHistory.push() directly
        dispatch(push(`/project/${projectId}`));
      });
  };
};

//create a new project
export const projectCreate = (initialModel) => {
  return (dispatch, getState) => {
    const project = new Project(initialModel);
    dispatch({
      type: ActionTypes.PROJECT_CREATE,
      project,
    });

    //after we've created it, let's save it real quick so it persists + gets a version
    //we can do this in the background
    projectSave(project.id);

    return project;
  };
};

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

//Adds a construct to a project. Does not create the construct. Use blocks.js
export const projectAddConstruct = (projectId, componentId, forceProjectId = false) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const component = getState().blocks[componentId];

    const componentProjectId = component.getProjectId();

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

//Removes a construct from a project.
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
