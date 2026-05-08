import { saveIosScreenshot } from './tests-mobile/ios/support/mobileEvidence';

process.env.DEVELOPER_DIR = process.env.DEVELOPER_DIR ?? '/Applications/Xcode.app/Contents/Developer';

const contactsBundleId = process.env.IOS_CONTACTS_BUNDLE_ID ?? 'com.apple.MobileAddressBook';
const deviceName = process.env.IOS_DEVICE_NAME ?? 'iPhone Air';
const platformVersion = process.env.IOS_PLATFORM_VERSION ?? '26.4';
const udid = process.env.IOS_UDID;

type TestMetadata = {
  title?: string;
};

type TestResult = {
  passed: boolean;
};

export const config = {
  runner: 'local',
  specs: ['./tests-mobile/ios/specs/**/*.spec.ts'],
  maxInstances: 1,
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: [
    'spec',
    ['junit', {
      outputDir: './reports/junit',
      outputFileFormat: () => 'results-mobile-ios.xml',
      suiteNameFormat: /[^a-zA-Z0-9]+/,
    }]
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 90_000
  },
  async afterTest(test: TestMetadata, _context: unknown, result: TestResult) {
    if (!result.passed) {
      const testName = test.title ?? 'ios-test';
      await saveIosScreenshot(`${testName} - falha`);
    }
  },
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          relaxedSecurity: true
        }
      }
    ]
  ],
  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': deviceName,
      'appium:platformVersion': platformVersion,
      'appium:udid': udid,
      'appium:bundleId': contactsBundleId,
      'appium:noReset': true,
      'appium:newCommandTimeout': 120
    }
  ]
};
