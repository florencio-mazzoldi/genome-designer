import * as ActionTypes from '../../constants/ActionTypes';
import { LOCATION_CHANGE } from 'react-router-redux';
import { getItem, setItem } from '../../middleware/localStorageCache';

export const initialState = {
  isVisible: getItem('inventoryVisibility') ? getItem('inventoryVisibility') === 'true' : false,
  currentTab: getItem('inventoryTab'),
};

export default function inventory(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.INVENTORY_TOGGLE_VISIBILITY :
    const { nextState } = action;
    setItem('inventoryVisibility', nextState.toString());
    return Object.assign({}, state, { isVisible: nextState });

  case ActionTypes.INVENTORY_SELECT_TAB :
    const { tab } = action;
    setItem('inventoryTab', tab);
    return Object.assign({}, state, { currentTab: tab });

  default :
    return state;
  }
}
