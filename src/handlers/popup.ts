import { ConfigService } from '../core/config';
import { TabService } from '../services/tab';
import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';

export class PopupController {
  private configService: ConfigService;
  private tabService: TabService;
  private messageService: MessageService;
  private errorService: ErrorService;

  private fromLangSelect: HTMLSelectElement;
  private toLangSelect: HTMLSelectElement;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.tabService = TabService.getInstance();
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();

    this.fromLangSelect = document.getElementById(
      'from-lang'
    ) as HTMLSelectElement;
    this.toLangSelect = document.getElementById('to-lang') as HTMLSelectElement;
  }

  async initialize(): Promise<void> {
    await this.loadStoredPreferences();
    this.setupEventListeners();
    await this.validateAndSaveInitialSelections();
  }

  private async loadStoredPreferences(): Promise<void> {
    try {
      const preferences = await this.configService.getPreferences();

      if (preferences.fromLanguage) {
        this.fromLangSelect.value = preferences.fromLanguage;
      }

      if (preferences.toLanguage) {
        this.toLangSelect.value = preferences.toLanguage;
      } else {
        const defaultLang = this.getValidTargetLanguage();
        this.toLangSelect.value = defaultLang;
      }

      if (this.toLangSelect.value === 'auto-detect') {
        const defaultLang = this.getValidTargetLanguage();
        this.toLangSelect.value = defaultLang;
      }
    } catch (error) {
      this.errorService.handleError(
        error,
        'PopupController.loadStoredPreferences'
      );
    }
  }

  private getValidTargetLanguage(): string {
    const browserLang = navigator.language || 'en-US';
    
    if (this.isValidSelectOption(this.toLangSelect, browserLang)) {
      return browserLang;
    }
    
    const baseLang = browserLang.split('-')[0];
    const availableOptions = Array.from(this.toLangSelect.options).map(option => option.value);
    
    const matchingOption = availableOptions.find(option => option.startsWith(baseLang + '-'));
    if (matchingOption) {
      return matchingOption;
    }
    
    // fallback to English
    return 'en-US';
  }

  private isValidSelectOption(selectElement: HTMLSelectElement, value: string): boolean {
    return Array.from(selectElement.options).some(option => option.value === value);
  }

  private setupEventListeners(): void {
    this.fromLangSelect.addEventListener('change', () => {
      this.handleLanguageChange('from');
    });

    this.toLangSelect.addEventListener('change', () => {
      this.handleLanguageChange('to');
    });

    this.setupButtonListeners();
  }

  private setupButtonListeners(): void {
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.handleRunTranslation());
    }

    const shortcutsBtn = document.getElementById('shortcuts-btn');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => this.handleOpenShortcuts());
    }

    const githubBtn = document.getElementById('github-btn');
    if (githubBtn) {
      githubBtn.addEventListener('click', (e) => this.handleOpenGithub(e));
    }
  }

  private async handleLanguageChange(type: 'from' | 'to'): Promise<void> {
    try {
      const value =
        type === 'from' ? this.fromLangSelect.value : this.toLangSelect.value;

      if (type === 'from') {
        await this.configService.setPreferences({ fromLanguage: value });
      } else {
        await this.configService.setPreferences({ toLanguage: value });
      }
    } catch (error) {
      console.log('[handleLanguageChange] Error dawg');
      this.errorService.handleError(
        error,
        'PopupController.handleLanguageChange'
      );

      if (type === 'from') {
        this.fromLangSelect.value = 'auto-detect';
        await this.configService.setPreferences({
          fromLanguage: 'auto-detect',
        });
      } else {
        const defaultLang = this.getValidTargetLanguage();
        this.toLangSelect.value = defaultLang;
        await this.configService.setPreferences({ toLanguage: defaultLang });
      }
    }
  }

  private async handleRunTranslation(): Promise<void> {
    try {
      const message = {
        type: 'run-translation' as const,
        payload: {
          fromLanguage: this.fromLangSelect.value,
          toLanguage: this.toLangSelect.value,
        },
      };

      await this.messageService.sendToBackground(message);
      window.close();
    } catch (error) {
      this.errorService.handleError(
        error,
        'PopupController.handleRunTranslation'
      );
    }
  }

  private async handleOpenShortcuts(): Promise<void> {
    try {
      await this.tabService.openExtensionShortcuts();
    } catch (error) {
      this.errorService.handleError(
        error,
        'PopupController.handleOpenShortcuts'
      );
    }
  }

  private async handleOpenGithub(e: Event): Promise<void> {
    e.preventDefault();
    try {
      const browserAdapter = (
        await import('../adapters/browser')
      ).BrowserAdapter.getInstance();
      await browserAdapter.tabs.create({ url: 'https://github.com/apirJS' });
    } catch (error) {
      this.errorService.handleError(error, 'PopupController.handleOpenGithub');
    }
  }

  private async validateAndSaveInitialSelections(): Promise<void> {
    if (this.toLangSelect.value === 'auto-detect' || this.toLangSelect.value === '') {
      const defaultLang = this.getValidTargetLanguage();
      this.toLangSelect.value = defaultLang;
    }
    
    await this.handleLanguageChange('from');
    await this.handleLanguageChange('to');
  }
}
