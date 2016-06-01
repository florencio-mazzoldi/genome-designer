var importdna = function(browser) {
  browser
    // open the file menu and add a couple of new constructs
    .click('.menu-dropdown:nth-of-type(2)')
    .waitForElementPresent('.menu-header-open', 5000, 'expected an open menu')
    // click import DNA
    .pause(250)
    .click('.menu-dropdown:nth-of-type(2) .menu-item:nth-of-type(7)')
    .waitForElementNotPresent('.menu-header-open', 5000, 'expected a closed menu')
    // forms have a transition, wait for it to complete
    .pause(1000)
};

module.exports = importdna;
