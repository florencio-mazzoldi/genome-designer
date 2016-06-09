import * as ActionTypes from '../../constants/ActionTypes';
import { LOCATION_CHANGE } from 'react-router-redux';

export const initialState = {
  detailViewVisible: false,
  authenticationForm: 'none',
  showDNAImport: false,
  orderId: null,
  showAbout: false,
  gruntMessage: null,
  showGenBankImport: false,
  userWidgetVisible: true,
};

export default function modals(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.UI_SHOW_AUTHENTICATION_FORM:
    const { authenticationForm } = action;
    return Object.assign({}, state, { authenticationForm });

  case ActionTypes.UI_SHOW_GENBANK_IMPORT:
    const { showGenBankImport } = action;
    return Object.assign({}, state, { showGenBankImport });

  case ActionTypes.UI_SHOW_DNAIMPORT:
    const { showDNAImport } = action;
    return Object.assign({}, state, { showDNAImport });

  case ActionTypes.UI_SHOW_ORDER_FORM:
    const { showOrderForm, orderId } = action;
    return Object.assign({}, state, { showOrderForm, orderId });

  case ActionTypes.UI_SHOW_ABOUT:
    const { showAbout } = action;
    return Object.assign({}, state, { showAbout });

  case ActionTypes.DETAIL_VIEW_TOGGLE_VISIBILITY :
    const { nextState } = action;
    return Object.assign({}, state, { detailViewVisible: nextState });

  case ActionTypes.UI_SHOW_USER_WIDGET :
    const { userWidgetVisible } = action;
    return Object.assign({}, state, { userWidgetVisible });

  case ActionTypes.UI_SET_GRUNT :
    const { gruntMessage } = action;
    return Object.assign({}, state, { gruntMessage });

  case LOCATION_CHANGE :
    const toKeep = ['gruntMessage'].reduce((acc, field) => Object.assign(acc, { [field]: state[field] }), {});
    return Object.assign({}, initialState, toKeep);

  default :
    return state;
  }
}
