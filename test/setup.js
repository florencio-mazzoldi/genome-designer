import { jsdom } from 'jsdom';
import mkpath from 'mkpath';
//import { login } from '../src/middleware/api';

//FILE SYSTEM SETUP

mkpath('storage/test/sequence');

//DOM SETUP

global.document = jsdom('<!doctype html><html><body></body></html>', {
  cookie: 'blah=demoCookie',
});
global.window = document.defaultView;
global.navigator = global.window.navigator;
window.console = global.console;

//hack - for history/lib/DOMStateStorage
global.localStorage = global.sessionStorage = window.localStorage = window.sessionStorage = {
  getItem: function getItem(key) {
    return this[key];
  },
  setItem: function setItem(key, value) {
    this[key] = value;
  },
};

// setup authentication
// used for middleware functions, which store the sessionKey manually

//file must be required (not imported), so that it runs here and is not part of the static build, as the middleware relies on the window being present, which is set up above
//const api = require('../src/middleware/api');
//api.login('', '');
