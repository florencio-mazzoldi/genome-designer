import * as ActionTypes from '../constants/ActionTypes';
import makeActionCreator from './makeActionCreator';

export const uiAddCurrent = makeActionCreator(ActionTypes.UI_ADD_CURRENT, 'blocks');
export const uiSetCurrent = makeActionCreator(ActionTypes.UI_SET_CURRENT, 'blocks');
export const uiSetCurrentConstruct = makeActionCreator(ActionTypes.UI_SET_CURRENT_CONSTRUCT, 'constructId', 'blocks');
export const uiToggleCurrent = makeActionCreator(ActionTypes.UI_TOGGLE_CURRENT, 'blocks');
export const uiToggleDetailView = makeActionCreator(ActionTypes.UI_TOGGLE_DETAIL_VIEW, 'forceState');
