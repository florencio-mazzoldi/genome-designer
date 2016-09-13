const TRAVIS_JOB_NUMBER = process.env.TRAVIS_JOB_NUMBER;

module.exports = {
  src_folders: ['test-e2e/tests'],
  output_folder: 'e2ereports',
  custom_commands_path: '',
  custom_assertions_path: './test-e2e/custom-assertions/',
  page_objects_path: '',
  globals_path: '',

  selenium: {
    start_process: true,
    server_path: './node_modules/selenium-standalone/.selenium/selenium-server/2.50.1-server.jar',
    log_path: '',
    host: '127.0.0.1',
    port: 4444,
    cli_args: {
      'webdriver.chrome.driver': './node_modules/selenium-standalone/.selenium/chromedriver/2.21-x64-chromedriver',
      'webdriver.ie.driver': '',
    },
  },

  test_settings: {
    local: {
      launch_url: 'http://localhost:3001/',
      selenium_port: 4444,
      selenium_host: 'localhost',
      silent: true,
      screenshots: {
        enabled: true,
        path: './test-e2e/screenshots',
      },
      desiredCapabilities: {
        browserName: 'chrome',
        javascriptEnabled: true,
        acceptSslCerts: true,
      },
    },

    default: {
      launch_url: 'http://localhost:3000',
      selenium_port: 80,
      selenium_host: 'ondemand.saucelabs.com',
      desiredCapabilities: {
        build: `build-${TRAVIS_JOB_NUMBER}`,
        'tunnel-identifier': TRAVIS_JOB_NUMBER,
      },
      silent: true,
      username: 'autodesk-bionano',
      access_key: process.env.SAUCE_ACCESS_KEY,
      screenshots: {
        enabled: false,
        path: '',
      },
      globals: {
        waitForConditionTimeout: 10000,
      },
    },

    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
        javascriptEnabled: true,
        acceptSslCerts: true,
        chromeOptions: {
          args: ['incognito'],
        },
      },
    },

    ie11: {
      desiredCapabilities: {
        browserName: 'internet explorer',
        platform: 'Windows 10',
        version: '11.0',
        javascriptEnabled: true,
        acceptSslCerts: true,
        'ie.ensureCleanSession': true,
      },
    },
  },
};
