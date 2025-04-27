import * as browser from 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async () => {
  const langSelect = document.getElementById('lang') as HTMLSelectElement;

  const result = await browser.storage.sync.get('targetLanguage');
  if (result.targetLanguage && typeof result.targetLanguage === 'string') {
    langSelect.value = result.targetLanguage;
  }

  langSelect.addEventListener('change', () => {
    browser.storage.sync.set({
      targetLanguage: langSelect.value,
    });
  });

  const runBtn = document.getElementById('run-btn');
  runBtn?.addEventListener('click', async () => {
    try {
      await browser.runtime.sendMessage({
        type: 'run-translation',
      });

      window.close();
    } catch (err) {
      console.error('Failed to initiate translation command:', err);
    }
  });

  const shortcutsBtn = document.getElementById('shortcuts-btn');

  shortcutsBtn?.addEventListener('click', async () => {
    try {
      if (navigator.userAgent.includes('Chrome')) {
        // For Chrome, we can open the shortcuts page directly
        await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
      } else if (navigator.userAgent.includes('Firefox')) {
        // For Firefox
        await browser.tabs.create({ url: 'about:addons' });
      } else if (navigator.userAgent.includes('Edge')) {
        // For Microsoft Edge
        await browser.tabs.create({ url: 'edge://extensions/shortcuts' });
      } else if (navigator.userAgent.includes('Opera')) {
        // For Opera
        await browser.tabs.create({ url: 'opera://extensions/shortcuts' });
      }
    } catch (err) {
      console.error('Failed to open shortcuts page:', err);
    }
  });

  const githubBtn = document.getElementById('github-btn');
  const donateBtn = document.getElementById('donate-btn');

  githubBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await browser.tabs.create({ url: 'https://github.com/apirJS' });
    } catch (err) {
      console.error('Failed to open GitHub link:', err);
    }
  });

  donateBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await browser.tabs.create({ url: 'https://saweria.co/aprApr' });
    } catch (err) {
      console.error('Failed to open donation link:', err);
    }
  });
});
