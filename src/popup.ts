import { initializeTheme, createThemeToggler } from './lib/dom/theme';
import { PopupController } from './handlers/popup';

class PopupScript {
  private popupController: PopupController;

  constructor() {
    this.popupController = new PopupController();
  }

  async initialize(): Promise<void> {
    await this.setupTheme();
    await this.popupController.initialize();
  }

  private async setupTheme(): Promise<void> {
    await initializeTheme();

    const themeToggleContainer = document.getElementById('theme-toggle-container');
    if (themeToggleContainer) {
      const themeToggler = createThemeToggler();
      themeToggleContainer.appendChild(themeToggler);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const popupScript = new PopupScript();
  await popupScript.initialize();
});
