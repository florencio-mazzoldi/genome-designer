import * as ActionTypes from '../../constants/ActionTypes';
import { LOCATION_CHANGE } from 'react-router-redux';
import { getItem, setItem } from '../../middleware/localStorageCache';

export const initialState = {
  isVisible: getItem('inspectorVisibility') ? getItem('inspectorVisibility') === 'true' : false,
};

export default function inspector(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.INSPECTOR_TOGGLE_VISIBILITY :
    const { nextState } = action;
    setItem('inspectorVisibility', nextState.toString());
    return Object.assign({}, state, { isVisible: nextState });

  default :
    return state;
  }
}
