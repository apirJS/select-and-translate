import * as browser from 'webextension-polyfill';

export class BrowserAdapter {
  private static instance: BrowserAdapter;

  private constructor() {}

  static getInstance(): BrowserAdapter {
    if (!BrowserAdapter.instance) {
      BrowserAdapter.instance = new BrowserAdapter();
    }
    return BrowserAdapter.instance;
  }

  get storage() {
    return browser.storage;
  }

  get tabs() {
    return browser.tabs;
  }

  get runtime() {
    return browser.runtime;
  }

  get notifications() {
    return browser.notifications;
  }

  get scripting() {
    return browser.scripting;
  }

  get i18n() {
    return browser.i18n;
  }

  get commands() {
    return browser.commands;
  }

  onCommand(callback: (command: string) => void): void {
    browser.commands.onCommand.addListener(callback);
  }

  onMessage(callback: (message: unknown) => Promise<unknown>): void {
    browser.runtime.onMessage.addListener(callback);
  }

  onTabRemoved(callback: (tabId: number) => void): void {
    browser.tabs.onRemoved.addListener(callback);
  }

  onTabUpdated(callback: (tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) => void): void {
    browser.tabs.onUpdated.addListener(callback);
  }
}
