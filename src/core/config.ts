import { BrowserAdapter } from '../adapters/browser';
import { safeParseStoragePreferences, type StoragePreferences, validateSourceLanguageCode, validateTargetLanguageCode } from '../lib/types';

export class ConfigService {
  private static instance: ConfigService;
  private cachedPreferences: StoragePreferences | null = null;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async getPreferences(): Promise<StoragePreferences> {
    if (this.cachedPreferences) {
      return this.cachedPreferences;
    }

    const result = await this.browserAdapter.storage.sync.get(['fromLanguage', 'toLanguage', 'themeMode']);
    const validatedPreferences = safeParseStoragePreferences(result);
    
    if (validatedPreferences.success) {
      this.cachedPreferences = validatedPreferences.data;
      return validatedPreferences.data;
    }

    const defaultPreferences: StoragePreferences = {
      fromLanguage: 'auto-detect',
      toLanguage: this.browserAdapter.i18n.getUILanguage() || 'en-US',
      themeMode: 'auto'
    };

    await this.setPreferences(defaultPreferences);
    return defaultPreferences;
  }

  async setPreferences(preferences: Partial<StoragePreferences>): Promise<void> {
    const currentPreferences = await this.getPreferences();
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    await this.browserAdapter.storage.sync.set(updatedPreferences);
    this.cachedPreferences = updatedPreferences;
    
    try {
      await this.browserAdapter.runtime.sendMessage({
        type: 'preferences-changed',
        payload: updatedPreferences
      });
    } catch (error) {
      console.log('[ConfigService.setPreferences] Could not notify background script of preference changes:', error);
    }
  }

  async setLanguages(fromLanguage: string, toLanguage: string): Promise<void> {
    const validatedFromLang = validateSourceLanguageCode(fromLanguage);
    const validatedToLang = validateTargetLanguageCode(toLanguage);
    
    await this.setPreferences({
      fromLanguage: validatedFromLang,
      toLanguage: validatedToLang
    });
  }

  async getLanguages(): Promise<{ fromLanguage: string; toLanguage: string }> {
    const preferences = await this.getPreferences();
    return {
      fromLanguage: preferences.fromLanguage || 'auto-detect',
      toLanguage: preferences.toLanguage || this.browserAdapter.i18n.getUILanguage() || 'en-US'
    };
  }

  clearCache(): void {
    this.cachedPreferences = null;
  }

  handlePreferencesChanged(newPreferences: StoragePreferences): void {
    this.cachedPreferences = newPreferences;
  }

  async refreshPreferences(): Promise<StoragePreferences> {
    this.cachedPreferences = null;
    return await this.getPreferences();
  }
}
