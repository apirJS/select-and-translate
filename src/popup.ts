import * as browser from 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async () => {
  const fromLangSelect = document.getElementById(
    'from-lang'
  ) as HTMLSelectElement;
  const toLangSelect = document.getElementById('to-lang') as HTMLSelectElement;

  const result = await browser.storage.sync.get(['fromLanguage', 'toLanguage']);

  if (result.fromLanguage && typeof result.fromLanguage === 'string') {
    fromLangSelect.value = result.fromLanguage;
  }

  if (result.toLanguage && typeof result.toLanguage === 'string') {
    toLangSelect.value = result.toLanguage;
  }

  if (!result.toLanguage || toLangSelect.value === 'auto-detect') {
    toLangSelect.value =
      browser.i18n.getUILanguage() || navigator.language || 'en-US';
  }

  fromLangSelect.addEventListener('change', () => {
    browser.storage.sync.set({ fromLanguage: fromLangSelect.value });
  });

  toLangSelect.addEventListener('change', () => {
    browser.storage.sync.set({ toLanguage: toLangSelect.value });
  });

  browser.storage.sync.set({ fromLanguage: fromLangSelect.value });
  browser.storage.sync.set({ toLanguage: toLangSelect.value });

  const runBtn = document.getElementById('run-btn');
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      try {
        await browser.runtime.sendMessage({
          type: 'run-translation',
          payload: {
            fromLanguage: fromLangSelect.value,
            toLanguage: toLangSelect.value,
          },
        });
        window.close();
      } catch (err) {
        console.error('Failed to initiate translation command:', err);
      }
    });
  }

  const shortcutsBtn = document.getElementById('shortcuts-btn');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', async () => {
      try {
        if (navigator.userAgent.includes('Chrome')) {
          await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
        } else if (navigator.userAgent.includes('Firefox')) {
          await browser.tabs.create({ url: 'about:addons' });
        } else if (navigator.userAgent.includes('Edge')) {
          await browser.tabs.create({ url: 'edge://extensions/shortcuts' });
        } else if (navigator.userAgent.includes('Opera')) {
          await browser.tabs.create({ url: 'opera://extensions/shortcuts' });
        }
      } catch (err) {
        console.error('Failed to open shortcuts page:', err);
      }
    });
  }

  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await browser.tabs.create({ url: 'https://github.com/apirJS' });
      } catch (err) {
        console.error('Failed to open GitHub link:', err);
      }
    });
  }
});
