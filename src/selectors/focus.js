import * as BlockSelector from './blocks';

//primary way to get focused things for the inspector
//todo - should share code there
export const focusGetFocused = (defaultToConstruct = true) => {
  return (dispatch, getState) => {
    const state = getState();
    const { level, forceProject, forceBlocks, projectId, constructId, blockIds } = state.focus;
    let focused;
    let readOnly = false;

    if (level === 'project') {
      if (forceProject) {
        focused = forceProject;
        readOnly = true;
      } else {
        focused = state.projects[projectId];
      }
    } else if (level === 'construct' || (defaultToConstruct === true && !forceBlocks.length && !blockIds.length)) {
      focused = state.blocks[constructId];
    } else {
      if (forceBlocks.length) {
        focused = forceBlocks;
        readOnly = true;
      } else {
        focused = blockIds.map(blockId => state.blocks[blockId]);
        readOnly = focused.some(instance => instance.isFrozen());
      }
    }

    return {
      type: level,
      readOnly,
      focused,
    };
  };
};

export const focusGetProject = () => {
  return (dispatch, getState) => {
    const { forceProject, projectId } = getState().focus;
    if (forceProject) {
      return forceProject;
    }
    return getState().projects[projectId];
  };
};

export const focusGetConstruct = () => {
  return (dispatch, getState) => {
    const state = getState();
    return state.blocks[state.focus.constructId];
  };
};

export const focusGetBlocks = (defaultToConstruct = true) => {
  return (dispatch, getState) => {
    const state = getState();
    const { forceBlocks, blockIds, constructId } = state.focus;
    if (forceBlocks.length) {
      return forceBlocks;
    }
    if (!blockIds.length && defaultToConstruct === true) {
      return [state.blocks[constructId]];
    }
    return blockIds.map(blockId => state.blocks[blockId]);
  };
};

export const focusGetBlockRange = () => {
  return (dispatch, getState) => {
    const focusedBlocks = dispatch(focusGetBlocks(false));
    const focusedConstruct = dispatch(focusGetConstruct());

    if (!focusedBlocks.length) {
      if (focusedConstruct) {
        return [focusedConstruct];
      }
      return [];
    }

    //dispatch just in case other construct is in focus for some reason... also assumes that all focused blocks are within the same construct
    const focusedIds = focusedBlocks.map(block => block.id);
    return dispatch(BlockSelector.blockGetRange(...focusedIds));
  };
};

//if focused blocks / construct have components
//e.g. whether can open sequence detail view
export const focusDetailsExist = () => {
  return (dispatch, getState) => {
    const state = getState();
    const { forceBlocks, blockIds, constructId } = state.focus;
    const construct = state.blocks[constructId];
    return !!forceBlocks.length || !!blockIds.length || (construct && !!construct.components.length);
  };
};
