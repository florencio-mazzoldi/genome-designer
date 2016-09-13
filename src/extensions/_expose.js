import register from './register';
import { isRegistered, onRegister, validRegion } from './clientRegistry';
import { callExtensionApi as api } from '../middleware/extensions';
import { readProjectFile as read, writeProjectFile as write, listProjectFiles as list } from '../middleware/projectFile';

/**
 * `window.constructor.extensions`
 *
 * API Section for extensions
 * @module extensions
 * @memberOf module:constructor
 */
export default {
  register,
  api,
  files: {
    read,
    write,
    list,
  },
  isRegistered,
  onRegister,
  validRegion,
};
