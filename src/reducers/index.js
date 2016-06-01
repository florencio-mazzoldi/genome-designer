import { routerReducer as router, LOCATION_CHANGE } from 'react-router-redux';
import { USER_SET_USER } from '../constants/ActionTypes';
import { combineReducers } from 'redux';
import { undoReducer, undoReducerEnhancerCreator } from '../store/undo/reducerEnhancer';
import { autosaveReducerEnhancer } from '../store/autosave/autosaveInstance';

//all the reducers

import blocks from './blocks';
import projects from './projects';
import inventory from './inventory';
import inspector from './inspector';
import ui from './ui';
import focus from './focus';
import orders from './orders';
import user from './user';
import clipboard from './clipboard';

//undo

const purgingEvents = [LOCATION_CHANGE, USER_SET_USER];

const undoReducerEnhancer = undoReducerEnhancerCreator({
  debug: false,
  purgeOn: (action) => purgingEvents.some(type => type === action.type),
});

//combined reducers

export const rootReducer = combineReducers({
  blocks: autosaveReducerEnhancer(undoReducerEnhancer(blocks, 'blocks')),
  projects: autosaveReducerEnhancer(undoReducerEnhancer(projects, 'projects')),
  router,
  inventory,
  inspector,
  ui,
  clipboard,
  focus,
  user,
  orders,
  undo: undoReducer,
});

export default rootReducer;
