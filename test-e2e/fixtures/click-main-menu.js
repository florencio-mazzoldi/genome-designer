var clickmainmenu = function(browser, menuIndex, menuItemIndex) {
  browser
    // open the given menu
    .click('.menu-dropdown:nth-of-type(' + menuIndex + ')')
    .waitForElementPresent('.menu-header-open', 5000, 'expected an open menu')
    // click the given menu item
    .pause(250)
    .click('.menu-dropdown:nth-of-type(' + menuIndex + ') .menu-item:nth-of-type(' + menuItemIndex + ')')
    .waitForElementNotPresent('.menu-header-open', 5000, 'expected a closed menu')
};

module.exports = clickmainmenu;
