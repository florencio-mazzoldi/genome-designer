var dragFromTo = require('./dragfromto');
var newproject = function(browser) {
  browser
    // make sure inventory is present
    .waitForElementPresent('.SidePanel.Inventory', 5000, 'Expected Inventory Groups')
    // open the file menu and add new constructs
    .click('.menu-dropdown:nth-of-type(1)')
    .waitForElementPresent('.menu-header-open', 5000, 'expected an open menu')
    // click new construct menu item
    .pause(250)
    .click('.menu-dropdown:nth-of-type(1) .menu-item:nth-of-type(6)')
    .waitForElementNotPresent('.menu-header-open', 5000, 'expected a closed menu')
    .waitForElementPresent('.construct-viewer', 5000, 'expect a construct for the new project')
    // click the second inventory group 'EGF Parts' to open it
    .click('.InventoryGroup:nth-of-type(2) .InventoryGroup-heading')
    // expect at least one inventory item and one block to drop on
    .waitForElementPresent('.InventoryItem', 5000, 'expected an inventory item');

  // drag 3 egf parts into construct
  dragFromTo(browser, '.InventoryItemBlock:nth-of-type(1)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);
  dragFromTo(browser, '.InventoryItemBlock:nth-of-type(2)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);
  dragFromTo(browser, '.InventoryItemBlock:nth-of-type(3)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);

  browser
    .click('.InventoryGroup:nth-of-type(4) .InventoryGroup-heading')
    .pause(500)
    .waitForElementPresent('.InventoryItem', 5000, 'expected an inventory item');

  // drag 3 role symbols into construct
  dragFromTo(browser, '.InventoryItemRole:nth-of-type(1)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);
  dragFromTo(browser, '.InventoryItemRole:nth-of-type(2)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);
  dragFromTo(browser, '.InventoryItemRole:nth-of-type(3)', 10, 10, '.construct-viewer:nth-of-type(1) .sceneGraph', 700, 30);

  browser
    .pause(250)
    .assert.countelements('.role-glyph', 6);
};

module.exports = newproject;
