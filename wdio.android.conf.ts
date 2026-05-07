const calculatorPackage = process.env.ANDROID_CALCULATOR_PACKAGE ?? 'com.google.android.calculator';
const calculatorActivity = process.env.ANDROID_CALCULATOR_ACTIVITY ?? 'com.android.calculator2.Calculator';
const deviceName = process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator';

export const config = {
  runner: 'local',
  specs: ['./tests-mobile/android/specs/**/*.spec.ts'],
  maxInstances: 1,
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000
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
      'appium:appPackage': calculatorPackage,
      'appium:appActivity': calculatorActivity,
      'appium:noReset': true,
      'appium:newCommandTimeout': 120
    }
  ]
};
