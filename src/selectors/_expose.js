/**
 * Expose selectors on the window, so they are accessible by 3rd party consumers
 */

import * as blocks from './blocks';
import * as inspector from './inspector';
import * as inventory from './inventory';
import * as projects from './projects';
import * as focus from './focus';
import * as orders from './orders';
import * as ui from './ui';
import * as clipboard from './clipboard';

const exposed = {
  blocks,
  inspector,
  focus,
  inventory,
  projects,
  ui,
  clipboard,
  orders,
};

export default exposed;
