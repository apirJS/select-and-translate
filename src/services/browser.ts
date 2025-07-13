import { Commands } from 'webextension-polyfill';
import { BrowserAdapter } from '../adapters';

export class BrowserService {
  private static instance: BrowserService;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
  }

  static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }

    return BrowserService.instance;
  }

  async getMainCommandShortcutKeys(): Promise<string[]> {
    const shortcut = (await this.getCommands()).find(
      (command) => command.name === 'select_and_translate'
    )?.shortcut;

    return shortcut ? shortcut.split('+') : ['Ctrl', 'Shift', 'Space'];
  }

  private async getCommands(): Promise<Commands.Command[]> {
    return await this.browserAdapter.commands.getAll();
  }

  async isCommandShortcut(event: KeyboardEvent): Promise<boolean> {
    const parts = await this.getMainCommandShortcutKeys();
    const key = parts.pop();
    if (!key) {
      return false;
    }

    const normalizedEventKey = this.normalizeKeyForComparison(event.key);
    const normalizedShortcutKey = this.normalizeKeyForComparison(key);

    if (normalizedEventKey !== normalizedShortcutKey) {
      return false;
    }

    const altPressed = event.altKey;
    const ctrlPressed = event.ctrlKey;
    const shiftPressed = event.shiftKey;
    const metaPressed = event.metaKey;

    const requiredAlt = parts.includes('Alt');
    const requiredCtrl = parts.includes('Ctrl');
    const requiredShift = parts.includes('Shift');
    const requiredMeta = parts.includes('Command');

    return (
      altPressed === requiredAlt &&
      ctrlPressed === requiredCtrl &&
      shiftPressed === requiredShift &&
      metaPressed === requiredMeta
    );
  }

  normalizeKeyForComparison(key: string): string {
    key = key.toLowerCase();

    // Map special keys
    const keyMap: Record<string, string> = {
      ' ': 'space',
      spacebar: 'space',
      escape: 'esc',
      return: 'enter',
    };

    return keyMap[key] || key;
  }
}
