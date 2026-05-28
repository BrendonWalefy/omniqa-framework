import path from 'node:path';
import { homedir } from 'node:os';
import { saveMobileScreenshot } from './targets/demo/mobile/android/support/mobileEvidence';

const defaultAndroidSdk = path.join(homedir(), 'Library/Android/sdk');
const androidSdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? defaultAndroidSdk;

process.env.ANDROID_HOME = androidSdkRoot;
process.env.ANDROID_SDK_ROOT = androidSdkRoot;
process.env.PATH = [
  path.join(androidSdkRoot, 'platform-tools'),
  path.join(androidSdkRoot, 'emulator'),
  process.env.PATH
].filter(Boolean).join(path.delimiter);

const contactsPackage = process.env.ANDROID_CONTACTS_PACKAGE ?? 'com.android.contacts';
const contactsActivity = process.env.ANDROID_CONTACTS_ACTIVITY ?? '.activities.PeopleActivity';
const deviceName = process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator';

type TestMetadata = {
  title?: string;
};

type TestResult = {
  passed: boolean;
};

export const config = {
  runner: 'local',
  specs: ['./targets/demo/mobile/android/specs/**/*.spec.ts'],
  maxInstances: 1,
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: [
    'spec',
    ['junit', {
      outputDir: './reports/junit',
      outputFileFormat: () => 'results-mobile-android.xml',
      suiteNameFormat: /[^a-zA-Z0-9]+/,
    }]
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000
  },
  async afterTest(test: TestMetadata, _context: unknown, result: TestResult) {
    if (!result.passed) {
      const testName = test.title ?? 'mobile-test';
      await saveMobileScreenshot(`${testName} - falha`);
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
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': deviceName,
      'appium:appPackage': contactsPackage,
      'appium:appActivity': contactsActivity,
      'appium:noReset': true,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 120
    }
  ]
};
