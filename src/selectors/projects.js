import invariant from 'invariant';
import * as blockSelectors from './blocks';

const _getProjectFromStore = (projectId, store) => {
  if (!projectId) {
    return null;
  }
  return store.projects[projectId];
};

export const projectGet = (projectId) => {
  return (dispatch, getState) => {
    return _getProjectFromStore(projectId, getState());
  };
};

//expects focus section of store, and projectPage to have set it
//alternatively, support we could query react-router directly
export const projectGetCurrentId = () => {
  return (dispatch, getState) => {
    const { focus } = getState();
    return !!focus ? focus.projectId : null;
  };
};

export const projectGetVersion = (projectId) => {
  return (dispatch, getState) => {
    const project = _getProjectFromStore(projectId, getState());
    return !!project ? project.version : null;
  };
};

//note - does not include options
export const projectListAllComponents = (projectId) => {
  return (dispatch, getState) => {
    const project = _getProjectFromStore(projectId, getState());

    return project.components.reduce((acc, componentId) => {
      acc.push(dispatch(blockSelectors.blockGet(componentId)));
      const constructChildren = dispatch(blockSelectors.blockGetComponentsRecursive(componentId));
      acc.push(...constructChildren);
      return acc;
    }, []);
  };
};

//note - does not include components
export const projectListAllOptions = (projectId) => {
  return (dispatch, getState) => {
    const components = dispatch(projectListAllComponents(projectId));
    const optionIds = components.reduce((acc, comp) => acc.concat(Object.keys(comp.options)), []);
    return optionIds.map(id => dispatch(blockSelectors.blockGet(id)));
  };
};

//all contents
export const projectListAllBlocks = (projectId) => {
  return (dispatch, getState) => {
    const components = dispatch(projectListAllComponents(projectId));
    const options = dispatch(projectListAllOptions(projectId));
    return components.concat(options);
  };
};

export const projectHasComponent = (projectId, blockId) => {
  return (dispatch, getState) => {
    const components = dispatch(projectListAllComponents(projectId));
    return components.map(comp => comp.id).includes(blockId);
  };
};

export const projectHasOption = (projectId, blockId) => {
  return (dispatch, getState) => {
    const options = dispatch(projectListAllOptions(projectId));
    return options.map(option => option.id).includes(blockId);
  };
};

//check if a block with { source: { source: sourceKey, id: sourceId } } is present in the project (e.g. so dont clone it in more than once)
//only checks options, since if its a component we should clone it
//returns block if exists, or null
export const projectGetOptionWithSource = (projectId, sourceKey, sourceId) => {
  return (dispatch, getState) => {
    invariant(sourceKey && sourceId, 'source key and ID are required');
    const options = dispatch(projectListAllOptions(projectId));
    return options.find(option => option.source.source === sourceKey && option.source.id === sourceId) || null;
  };
};

export const projectCreateRollup = (projectId) => {
  return (dispatch, getState) => {
    const project = _getProjectFromStore(projectId, getState());
    const blocks = dispatch(projectListAllBlocks(projectId));

    return {
      project,
      blocks,
    };
  };
};
