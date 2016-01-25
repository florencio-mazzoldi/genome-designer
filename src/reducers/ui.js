import * as ActionTypes from '../constants/ActionTypes';

export const initialState = {
  currentBlocks: null,
  detailViewVisible: false,
  currentConstructId: null,
};

export default function inventory(state = initialState, action) {
  switch (action.type) {

  case ActionTypes.UI_SET_CURRENT_CONSTRUCT: {
    // action.blocks are all the blocks in the project. We use this to de-select
    // any selected block which is not part of the current construct
    const construct = action.blocks[action.constructId];
    // filter selections to including only children of the construct
    let selectedBlocks = [];
    if (state.currentBlocks && state.currentBlocks.length) {
      selectedBlocks = state.currentBlocks.filter(id => {
        if (construct.components) {
          return construct.components.includes(id);
        } else {
          return false;
        }
      });
    }

    return Object.assign({}, state, {
      currentConstructId: action.constructId,
      currentBlocks: selectedBlocks,
    });
  }

  case ActionTypes.UI_ADD_CURRENT : {
    const { blocks } = action;
    // merge new blocks with current blocks, ignoring duplicates
    const newBlocks = state.currentBlocks || [];
    (blocks || []).forEach(blockId => {
      if (!newBlocks.includes(blockId)) {
        newBlocks.push(blockId);
      }
    });

    return Object.assign({}, state, {currentBlocks: newBlocks});
  }
  case ActionTypes.UI_SET_CURRENT : {
    const { blocks } = action;
    return Object.assign({}, state, {currentBlocks: blocks});
  }

  case ActionTypes.UI_TOGGLE_CURRENT : {
    const { blocks } = action;
    const newCurrent = state.currentBlocks.slice(0);
    blocks.forEach(block => {
      const index = newCurrent.indexOf(block);
      if (index < 0) {
        newCurrent.push(block);
      } else {
        newCurrent.splice(index, 1);
      }
    })

    return Object.assign({}, state, {currentBlocks: newCurrent});
  }

  case ActionTypes.UI_TOGGLE_DETAIL_VIEW : {
    const { forceState } = action;
    const nextState = (forceState !== undefined) ? !!forceState : !state.detailViewVisible;
    return Object.assign({}, state, {detailViewVisible: nextState});
  }
  default : {
    return state;
  }
  }
}
