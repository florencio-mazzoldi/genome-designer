import * as ActionTypes from '../constants/ActionTypes';
import * as instanceMap from '../store/instanceMap';
import { project as testProject } from './testProject';
import { project as combiProject } from './testCombinatorial';

const initialState = {};

//testing = combinatorial
Object.assign(initialState, {
  combinatorial: combiProject,
});
instanceMap.saveProject(combiProject);

if (process.env.NODE_ENV === 'test') {
  Object.assign(initialState, {
    test: testProject,
  });
}

export default function projects(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.PROJECT_CREATE :
  case ActionTypes.PROJECT_LOAD :
  case ActionTypes.PROJECT_MERGE :
  case ActionTypes.PROJECT_RENAME :
  case ActionTypes.PROJECT_REMOVE_CONSTRUCT:
  case ActionTypes.PROJECT_ADD_CONSTRUCT :
    const { project } = action;
    instanceMap.saveProject(project);
    return Object.assign({}, state, { [project.id]: project });

  case ActionTypes.PROJECT_SNAPSHOT :
  case ActionTypes.PROJECT_SAVE :
    const { projectId, sha } = action;
    const gotProject = state[projectId];
    const updatedProject = gotProject.updateVersion(sha);
    instanceMap.saveProject(updatedProject);
    return Object.assign({}, state, { [projectId]: updatedProject });

  case ActionTypes.PROJECT_LIST :
    const { projects } = action;
    instanceMap.saveProject(...projects);
    const zippedProjects = projects.reduce((acc, project) => Object.assign(acc, { [project.id]: project }), {});
    //prefer state versions to zipped versions
    return Object.assign({}, zippedProjects, state);

  case ActionTypes.PROJECT_DELETE : {
    const { projectId } = action;
    const nextState = Object.assign({}, state);
    delete nextState[projectId];
    return nextState;
  }

  default :
    return state;
  }
}
