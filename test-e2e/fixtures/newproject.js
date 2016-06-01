var newproject = function(browser) {
  browser
    // open the file menu and add a couple of new constructs
    .click('.menu-dropdown:nth-of-type(1)')
    .waitForElementPresent('.menu-header-open', 5000, 'expected an open menu')
    // click new construct menu item
    .pause(250)
    .click('.menu-dropdown:nth-of-type(1) .menu-item:nth-of-type(6)')
    .waitForElementNotPresent('.menu-header-open', 5000, 'expected a closed menu')
    .waitForElementPresent('.construct-viewer', 5000, 'expect a construct for the new project')
};

module.exports = newproject;
