var signout = function(browser, credentials) {
  browser
    // sign back in with previous credentials
    .waitForElementPresent('a.signed-out', 5000, 'expected a sign out button')
    .click('a.signed-out')
    .waitForElementPresent('#auth-signin', 5000, 'Expected sign in dialog to become visible')
    // try submitting with no credentials
    .submitForm('#auth-signin')
    // expect 1 error, missing credentials
    .waitForElementPresent('.error.visible', 5000, 'expect error to become visible')
    .assert.countelements('.error.visible', 1)
    // try with bad credentials
    .clearValue('#auth-signin input:nth-of-type(1)')
    .setValue('#auth-signin input:nth-of-type(1)', 'billgates@microsoft.com')
    .clearValue('#auth-signin input:nth-of-type(2)')
    .setValue('#auth-signin input:nth-of-type(2)', credentials.password)
    .submitForm('#auth-signin')
    // expect 1 error, bad credentials
    .waitForElementPresent('.error.visible', 5000, 'expect error to appear')
    .assert.countelements('.error.visible', 1)
    // try correct credentials
    .clearValue('#auth-signin input:nth-of-type(1)')
    .setValue('#auth-signin input:nth-of-type(1)', credentials.email)
    .submitForm('#auth-signin')
    .waitForElementPresent('div.signed-in', 5000, 'expected to be signed in');
};

module.exports = signout;
