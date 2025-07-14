import * as browser from 'webextension-polyfill';

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeColors {
  backgroundColor: string;
  color: string;
  border: string;
  dividerColor: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
}

export class ThemeManager {
  private static readonly STORAGE_KEY = 'themeMode';
  private static readonly themes = {
    dark: {
      backgroundColor: 'rgba(22, 22, 22, 1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      dividerColor: 'rgba(255, 255, 255, 0.2)',
    },
    light: {
      backgroundColor: 'rgba(245, 245, 245, 1)',
      color: '#333',
      border: '1px solid rgba(0, 0, 0, 0.3)',
      dividerColor: 'rgba(0, 0, 0, 0.1)',
    },
  };

  static getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  static async getStoredThemeMode(): Promise<ThemeMode> {
    try {
      const result = await browser.storage.sync.get([this.STORAGE_KEY]);
      return (result[this.STORAGE_KEY] as ThemeMode) || 'auto';
    } catch (error) {
      console.warn('Failed to get stored theme mode:', error);
      return 'auto';
    }
  }

  static async setStoredThemeMode(mode: ThemeMode): Promise<void> {
    try {
      await browser.storage.sync.set({ [this.STORAGE_KEY]: mode });
    } catch (error) {
      console.warn('Failed to store theme mode:', error);
    }
  }

  static resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'auto') {
      return this.getSystemTheme();
    }
    return mode;
  }

  static async getThemeConfig(): Promise<ThemeConfig> {
    const mode = await this.getStoredThemeMode();
    const resolvedTheme = this.resolveThemeMode(mode);
    
    return {
      mode,
      colors: this.themes[resolvedTheme],
    };
  }

  static getThemeColors(): ThemeColors {
    const systemTheme = this.getSystemTheme();
    return this.themes[systemTheme];
  }

  static applyThemeToDocument(theme: 'light' | 'dark'): void {
    const root = document.documentElement;
    
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    
    const colors = this.themes[theme];
    root.style.setProperty('--theme-bg', colors.backgroundColor);
    root.style.setProperty('--theme-color', colors.color);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-divider', colors.dividerColor);
  }

  static async initializeTheme(): Promise<ThemeConfig> {
    const config = await this.getThemeConfig();
    const resolvedTheme = this.resolveThemeMode(config.mode);
    
    this.applyThemeToDocument(resolvedTheme);
    return config;
  }
}

export class ThemeToggler {
  private button: HTMLButtonElement;
  private container: HTMLElement;
  private icon: HTMLSpanElement;
  private label: HTMLSpanElement;
  private onThemeChange?: (config: ThemeConfig) => void;

  constructor(onThemeChange?: (config: ThemeConfig) => void) {
    this.onThemeChange = onThemeChange;
    this.container = this.createContainer();
    this.button = this.createButton();
    this.icon = this.createIcon();
    this.label = this.createLabel();
    
    this.setupButton();
    this.setupEventListeners();
    this.updateButton();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'theme-toggler';
    return container;
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'theme-toggle-btn';
    button.setAttribute('aria-label', 'Toggle theme');
    button.title = 'Change theme (Auto/Light/Dark)';
    return button;
  }

  private createIcon(): HTMLSpanElement {
    const icon = document.createElement('span');
    icon.className = 'theme-icon';
    return icon;
  }

  private createLabel(): HTMLSpanElement {
    const label = document.createElement('span');
    label.className = 'theme-label';
    return label;
  }

  private setupButton(): void {
    this.button.appendChild(this.icon);
    this.button.appendChild(this.label);
    this.container.appendChild(this.button);
  }

  private setupEventListeners(): void {
    this.button.addEventListener('click', () => this.handleToggle());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => this.handleSystemThemeChange());
  }

  private async handleToggle(): Promise<void> {
    const currentMode = await ThemeManager.getStoredThemeMode();
    const nextMode = this.getNextTheme(currentMode);
    
    await ThemeManager.setStoredThemeMode(nextMode);
    const config = await ThemeManager.getThemeConfig();
    const resolvedTheme = ThemeManager.resolveThemeMode(config.mode);
    
    ThemeManager.applyThemeToDocument(resolvedTheme);
    await this.updateButton();
    
    if (this.onThemeChange) {
      this.onThemeChange(config);
    }
    
    try {
      await browser.runtime.sendMessage({
        type: 'theme-changed',
        payload: { mode: nextMode, theme: resolvedTheme }
      });
    } catch (error) {
      // Ignore errors if no content scripts are listening
    }
  }

  private getNextTheme(currentMode: ThemeMode): ThemeMode {
    switch (currentMode) {
      case 'auto': return 'light';
      case 'light': return 'dark';
      case 'dark': return 'auto';
      default: return 'auto';
    }
  }

  private async handleSystemThemeChange(): Promise<void> {
    const mode = await ThemeManager.getStoredThemeMode();
    if (mode === 'auto') {
      const config = await ThemeManager.getThemeConfig();
      const resolvedTheme = ThemeManager.resolveThemeMode(config.mode);
      ThemeManager.applyThemeToDocument(resolvedTheme);
      
      if (this.onThemeChange) {
        this.onThemeChange(config);
      }
    }
  }

  private async updateButton(): Promise<void> {
    const config = await ThemeManager.getThemeConfig();
    const resolvedTheme = ThemeManager.resolveThemeMode(config.mode);
    
    const iconMap = {
      auto: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="m12 2 7.07 7.07L12 16.14 4.93 9.07 12 2z"/>
      </svg>`,
      light: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>`,
      dark: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>`
    };

    const labelMap = {
      auto: 'Auto',
      light: 'Light',
      dark: 'Dark'
    };

    this.icon.innerHTML = iconMap[config.mode];
    this.label.textContent = labelMap[config.mode];
    this.button.setAttribute('data-theme', config.mode);
    this.button.setAttribute('data-resolved-theme', resolvedTheme);
  }

  getElement(): HTMLElement {
    return this.container;
  }
}

// Legacy exports for backward compatibility
export const THEME_STORAGE_KEY = 'themeMode';
export const getSystemTheme = ThemeManager.getSystemTheme.bind(ThemeManager);
export const getStoredThemeMode = ThemeManager.getStoredThemeMode.bind(ThemeManager);
export const setStoredThemeMode = ThemeManager.setStoredThemeMode.bind(ThemeManager);
export const resolveThemeMode = ThemeManager.resolveThemeMode.bind(ThemeManager);
export const getThemeConfig = ThemeManager.getThemeConfig.bind(ThemeManager);
export const getThemeColors = ThemeManager.getThemeColors.bind(ThemeManager);
export const applyThemeToDocument = ThemeManager.applyThemeToDocument.bind(ThemeManager);
export const initializeTheme = ThemeManager.initializeTheme.bind(ThemeManager);

export function createThemeToggler(onThemeChange?: (config: ThemeConfig) => void): HTMLElement {
  const toggler = new ThemeToggler(onThemeChange);
  return toggler.getElement();
}