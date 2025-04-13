const button = document.querySelector<HTMLButtonElement>('button');

if (button) {
  button.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && !tab.url?.startsWith('chrome')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            alert('Hello from Select and Translate');
          },
        });
      }
    });
  });
}
