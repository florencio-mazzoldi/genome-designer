var homepageRegister = require('../fixtures/homepage-register');
var signout = require('../fixtures/signout');
var signin = require('../fixtures/signin');
var dragFromTo = require('../fixtures/dragfromto');
var newProject = require('../fixtures/newproject');
var newConstruct = require('../fixtures/newconstruct');
var testProject = require('../fixtures/testproject');
var openNthBlockContextMenu = require('../fixtures/open-nth-block-contextmenu');
var clickNthContextMenuItem = require('../fixtures/click-popmenu-nth-item');
var size = require('../fixtures/size');

module.exports = {
  'Test that you can delete blocks from the block context menu.' : function (browser) {
    size(browser);

    // register via fixture
    var credentials = homepageRegister(browser);

    // now we can go to the project page
    testProject(browser);

    // delete block from second construct viewer
    var blockBounds = openNthBlockContextMenu(browser, '.construct-viewer:nth-of-type(2) .sceneGraph', 0);
    clickNthContextMenuItem(browser, 2);

    // NOTE: The last item add will be selected. Clicking the first item will group select all blocks

    // expect all blocks to be deleted
    browser
      .pause(250)
      .assert.countelements('[data-nodetype="block"]', 0)
      .end();
  }
};
