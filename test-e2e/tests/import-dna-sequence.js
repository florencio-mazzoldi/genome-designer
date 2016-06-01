var homepageRegister = require('../fixtures/homepage-register');
var signout = require('../fixtures/signout');
var signin = require('../fixtures/signin');
var dragFromTo = require('../fixtures/dragfromto');
var newProject = require('../fixtures/newproject');
var newConstruct = require('../fixtures/newconstruct');
var openNthBlockContextMenu = require('../fixtures/open-nth-block-contextmenu');
var clickNthContextMenuItem = require('../fixtures/click-popmenu-nth-item');
var importDNAFromMainMenu = require('../fixtures/importdnaform-from-main-menu');

module.exports = {
  'Import a DNA sequence into a sketch block' : function (browser) {

    // maximize for graphical tests
    browser.windowSize('current', 1200, 900);

    // register via fixture
    var credentials = homepageRegister(browser);

    // now we can go to the project page
    browser
      // wait for inventory and inspector to be present
      .waitForElementPresent('.SidePanel.Inventory', 5000, 'Expected Inventory Groups')
      .waitForElementPresent('.SidePanel.Inspector', 5000, 'Expected Inspector');


    // start with a fresh project
    newProject(browser);
    browser
      // open inventory
      .click('.Inventory-trigger')
      .waitForElementPresent('.SidePanel.Inventory.visible', 5000, 'Expected inventory to be visible')
      // open the sketch blocks
      .click('.InventoryGroup:nth-of-type(4) .InventoryGroup-heading');


    // double check there are no construct viewers present
    browser.assert.countelements('.construct-viewer', 1);

    // add block to construct
    dragFromTo(browser, '.InventoryItemRole:nth-of-type(1)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 30, 30);

    browser
      // expect one construct view and one block
      .assert.countelements('.construct-viewer', 1)
      .assert.countelements('.role-glyph', 1);


    var blockBounds = openNthBlockContextMenu(browser, '.sceneGraph', 0);
    clickNthContextMenuItem(browser, 3);

    // wait for the import DNA modal window
    browser
      .waitForElementPresent('.importdnaform', 5000, 'expected the import form')
      // it should contain a text area if there was a selected block
      .waitForElementPresent('.importdnaform textarea', 5000, 'expected a text area')
      // enter a BAD sequence
      .setValue('.importdnaform textarea', 'XXXX')
      // expect to get a zero length sequence
      .assert.containsText('.importdnaform label:nth-of-type(1)', 'Length: 0')
      // set a valid sequence with white space and newlines
      .clearValue('.importdnaform textarea')
      .setValue('.importdnaform textarea', 'acgtu\n ryswk mbdhv n.-')
      // expect a message about a valid 18 character sequence ( with white space etc removed )
      .assert.containsText('.importdnaform label:nth-of-type(1)', 'Length: 18')
      // submit the form with the valid sequence
      .submitForm('.importdnaform')
      // wait for the grunt ribbon to confirm,
      .waitForElementPresent('.ribbongrunt', 5000, 'expected a grunt')
      .assert.containsText('.ribbongrunt', 'Sequence was successfully inserted.');

    // now start a new project and ensure the dialog is no operational with no block selected
    // start with a fresh project
    newProject(browser);

    // open import DNA from main edit menu
    importDNAFromMainMenu(browser);

    browser
      .assert.containsText('.ribbongrunt', 'Sequence data must be added to or before a selected block. Please select a block and try again.')
      .end();
  }
};
