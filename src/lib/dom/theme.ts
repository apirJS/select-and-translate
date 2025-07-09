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

export const THEME_STORAGE_KEY = 'themeMode';

const themes = {
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

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const result = await browser.storage.sync.get([THEME_STORAGE_KEY]);
    return (result[THEME_STORAGE_KEY] as ThemeMode) || 'auto';
  } catch (error) {
    console.warn('Failed to get stored theme mode:', error);
    return 'auto';
  }
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await browser.storage.sync.set({ [THEME_STORAGE_KEY]: mode });
  } catch (error) {
    console.warn('Failed to store theme mode:', error);
  }
}

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
}

export async function getThemeConfig(): Promise<ThemeConfig> {
  const mode = await getStoredThemeMode();
  const resolvedTheme = resolveThemeMode(mode);
  
  return {
    mode,
    colors: themes[resolvedTheme],
  };
}

export function getThemeColors(): ThemeColors {
  const systemTheme = getSystemTheme();
  return themes[systemTheme];
}

export function applyThemeToDocument(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('theme-light', 'theme-dark');
  
  // Add new theme class
  root.classList.add(`theme-${theme}`);
  
  // Set CSS custom properties for dynamic theming
  const colors = themes[theme];
  root.style.setProperty('--theme-bg', colors.backgroundColor);
  root.style.setProperty('--theme-color', colors.color);
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-divider', colors.dividerColor);
}

export async function initializeTheme(): Promise<ThemeConfig> {
  const config = await getThemeConfig();
  const resolvedTheme = resolveThemeMode(config.mode);
  
  applyThemeToDocument(resolvedTheme);
  
  return config;
}

export function createThemeToggler(
  onThemeChange?: (config: ThemeConfig) => void
): HTMLElement {
  const togglerContainer = document.createElement('div');
  togglerContainer.className = 'theme-toggler';
  
  const button = document.createElement('button');
  button.className = 'theme-toggle-btn';
  button.setAttribute('aria-label', 'Toggle theme');
  button.title = 'Change theme (Auto/Light/Dark)';
  
  const icon = document.createElement('span');
  icon.className = 'theme-icon';
  button.appendChild(icon);
  
  const label = document.createElement('span');
  label.className = 'theme-label';
  button.appendChild(label);
  
  async function updateButton() {
    const config = await getThemeConfig();
    const resolvedTheme = resolveThemeMode(config.mode);
    
    // Update icon and label based on current mode
    switch (config.mode) {
      case 'auto':
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="m12 2 7.07 7.07L12 16.14 4.93 9.07 12 2z"/>
        </svg>`;
        label.textContent = 'Auto';
        break;
      case 'light':
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`;
        label.textContent = 'Light';
        break;
      case 'dark':
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`;
        label.textContent = 'Dark';
        break;
    }
    
    button.setAttribute('data-theme', config.mode);
    button.setAttribute('data-resolved-theme', resolvedTheme);
  }
  
  button.addEventListener('click', async () => {
    const currentMode = await getStoredThemeMode();
    
    // Cycle through themes: auto -> light -> dark -> auto
    let nextMode: ThemeMode;
    switch (currentMode) {
      case 'auto':
        nextMode = 'light';
        break;
      case 'light':
        nextMode = 'dark';
        break;
      case 'dark':
        nextMode = 'auto';
        break;
      default:
        nextMode = 'auto';
    }
    
    await setStoredThemeMode(nextMode);
    const config = await getThemeConfig();
    const resolvedTheme = resolveThemeMode(config.mode);
    
    applyThemeToDocument(resolvedTheme);
    await updateButton();
    
    // Notify other parts of the app about theme change
    if (onThemeChange) {
      onThemeChange(config);
    }
    
    // Broadcast theme change to content scripts
    try {
      await browser.runtime.sendMessage({
        type: 'theme-changed',
        payload: { mode: nextMode, theme: resolvedTheme }
      });
    } catch (error) {
      // Ignore errors if no content scripts are listening
    }
  });
  
  togglerContainer.appendChild(button);
  
  // Initialize button state
  updateButton();
  
  // Listen for system theme changes when in auto mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', async () => {
    const mode = await getStoredThemeMode();
    if (mode === 'auto') {
      const config = await getThemeConfig();
      const resolvedTheme = resolveThemeMode(config.mode);
      applyThemeToDocument(resolvedTheme);
      
      if (onThemeChange) {
        onThemeChange(config);
      }
    }
  });
  
  return togglerContainer;
}