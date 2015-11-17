import * as ActionTypes from '../constants/ActionTypes';
import makeActionCreator from './makeActionCreator';

export const inventorySearch = makeActionCreator(ActionTypes.INVENTORY_SEARCH, 'searchTerm');
export const inventoryToggleVisiblity = makeActionCreator(ActionTypes.INVENTORY_TOGGLE_VISIBILITY, 'forceState');
