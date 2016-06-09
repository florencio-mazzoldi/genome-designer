import * as ActionTypes from '../constants/ActionTypes';
import invariant from 'invariant';

export const inspectorToggleVisibility = (forceState) => {
  return (dispatch, getState) => {
    const currentState = getState().ui.inspector.isVisible;
    const nextState = (forceState !== undefined) ? !!forceState : !currentState;
    dispatch({
      type: ActionTypes.INSPECTOR_TOGGLE_VISIBILITY,
      nextState,
    });

    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);

    return nextState;
  };
};

export const inventoryToggleVisibility = (forceState) => {
  return (dispatch, getState) => {
    const currentState = getState().ui.inventory.isVisible;
    const nextState = (forceState !== undefined) ? !!forceState : !currentState;
    dispatch({
      type: ActionTypes.INVENTORY_TOGGLE_VISIBILITY,
      nextState,
    });

    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);

    return nextState;
  };
};

export const inventorySelectTab = (tab) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.INVENTORY_SELECT_TAB,
      tab,
    });
    return tab;
  };
};

/* detail view */

export const uiToggleDetailView = (forceState) => {
  return (dispatch, getState) => {
    const currentState = getState().ui.detailView.isVisible;
    const nextState = (forceState !== undefined) ? !!forceState : !currentState;
    dispatch({
      type: ActionTypes.DETAIL_VIEW_TOGGLE_VISIBILITY,
      nextState,
    });
    return nextState;
  };
};

export const detailViewSelectExtension = (manifest) => {
  return (dispatch, getState) => {
    invariant(manifest === null || (manifest.name && typeof manifest.render === 'function'), 'improper formed manifest');
    dispatch({
      type: ActionTypes.DETAIL_VIEW_SELECT_EXTENSION,
      manifest,
    });
    return manifest;
  };
};

/* modals */

export const uiShowAuthenticationForm = (name) => {
  return (dispatch, getState) => {
    invariant(['signin', 'signup', 'forgot', 'reset', 'account', 'none'].indexOf(name) >= 0, 'attempting to show invalid form name');
    dispatch({
      type: ActionTypes.UI_SHOW_AUTHENTICATION_FORM,
      authenticationForm: name,
    });
    return name;
  };
};

export const uiShowGenBankImport = (bool) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SHOW_GENBANK_IMPORT,
      showGenBankImport: bool,
    });
    return bool;
  };
};

export const uiShowDNAImport = (bool) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SHOW_DNAIMPORT,
      showDNAImport: bool,
    });
    return bool;
  };
};

export const uiShowOrderForm = (bool, orderId) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SHOW_ORDER_FORM,
      showOrderForm: bool,
      orderId,
    });
    return bool;
  };
};

export const uiShowAbout = (bool) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SHOW_ABOUT,
      showAbout: bool,
    });
    return bool;
  };
};

export const uiShowUserWidget = (userWidgetVisible) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SHOW_USER_WIDGET,
      userWidgetVisible,
    });
    return userWidgetVisible;
  };
};

export const uiSetGrunt = (gruntMessage) => {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UI_SET_GRUNT,
      gruntMessage,
    });
    return gruntMessage;
  };
};
