import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { ReduxRouter } from 'redux-router';
import * as actionTypes from './constants/ActionTypes';
import actions from './actions/_expose';
import store, { lastAction } from './store/index';
import * as api from './middleware/api';
import { registerExtension } from './extensions/index';

render(
  <Provider store={store}>
    <ReduxRouter />
  </Provider>,
  document.getElementById('root')
);

// login on app start by default for all subsequent API requests...
// need to handle this much better. this is so lame.
// really, this isnt necessary yet, as there is a testingStub Key in middleware/api.js for now
api.login();

//expose various things on the window, e.g. for extensions
const exposed = global.gd = {};
Object.assign(exposed, {
  registerExtension,
  actionTypes,
  actions,
  store: {
    dispatch: store.dispatch,
    getState: store.getState,
    lastAction: lastAction,
    subscribe: (callback) => {
      return store.subscribe(() => {
        callback(store.getState(), lastAction());
      });
    },
  },
  api,
});

//testing - how do we async trigger this?
require('./onionExtension.js');
