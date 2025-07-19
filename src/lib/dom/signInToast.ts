import { injectComponentStyles } from './styleManager';
import { MessageService } from '../../services/message';

export class SignInToast {
  private toastElement: HTMLDivElement | null = null;
  private timeoutId: number | null = null;
  private static instance: SignInToast;
  private messageService: MessageService;

  constructor() {
    injectComponentStyles('signin-toast');
    this.messageService = MessageService.getInstance();
  }

  static getInstance(): SignInToast {
    if (!SignInToast.instance) {
      SignInToast.instance = new SignInToast();
    }
    return SignInToast.instance;
  }

  show(): void {
    if (this.toastElement) {
      return;
    }

    this.create();
    this.applyCurrentTheme();
    this.animate();
    this.setupAutoHide();
  }

  hide(): void {
    if (!this.toastElement) {
      return;
    }

    this.toastElement.classList.remove('toast-visible');
    this.toastElement.classList.add('toast-hidden');

    setTimeout(() => {
      this.cleanup();
    }, 300);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  updateTheme(theme: 'light' | 'dark'): void {
    if (!this.toastElement) {
      return;
    }
    
    this.toastElement.classList.remove('theme-light', 'theme-dark');
    this.toastElement.classList.add(`theme-${theme}`);
  }

  private applyCurrentTheme(): void {
    if (!this.toastElement) {
      return;
    }

    const documentElement = document.documentElement;
    if (documentElement.classList.contains('theme-light')) {
      this.toastElement.classList.add('theme-light');
    } else if (documentElement.classList.contains('theme-dark')) {
      this.toastElement.classList.add('theme-dark');
    } else {
      this.toastElement.classList.add('theme-light');
    }
  }

  private create(): void {
    this.toastElement = document.createElement('div');
    this.toastElement.className = 'signin-toast';
    
    this.toastElement.innerHTML = `
      <div class="signin-toast__header">
        <div class="signin-toast__message">Sign in to use this extension</div>
        <button class="signin-toast__close-btn" title="Close">×</button>
      </div>
      <button class="signin-toast__google-btn">
        <svg class="signin-toast__google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    `;

    const closeBtn = this.toastElement.querySelector('.signin-toast__close-btn');
    const googleBtn = this.toastElement.querySelector('.signin-toast__google-btn');

    closeBtn?.addEventListener('click', () => this.hide());
    
    googleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[SignInToast] Google button clicked - starting OAuth');
      this.handleSignIn().catch(error => {
        console.error('[SignInToast] OAuth handler failed:', error);
      });
    });

    document.body.appendChild(this.toastElement);
  }

  private animate(): void {
    if (!this.toastElement) return;

    requestAnimationFrame(() => {
      this.toastElement?.classList.add('toast-visible');
    });
  }

  private setupAutoHide(): void {
    this.timeoutId = window.setTimeout(() => {
      this.hide();
    }, 5000);
  }

  private async handleSignIn(): Promise<void> {
    try {
      console.log('[SignInToast] Starting OAuth process');
      
      const googleBtn = this.toastElement?.querySelector('.signin-toast__google-btn') as HTMLButtonElement;
      if (!googleBtn) {
        console.error('[SignInToast] Google button not found');
        return;
      }

      const originalHTML = googleBtn.innerHTML;
      googleBtn.disabled = true;
      
      googleBtn.innerHTML = `
        <svg class="signin-toast__google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Signing in...
      `;

      try {
        console.log('[SignInToast] Sending OAuth request to background');
        
        const response = await this.messageService.sendToBackground({
          type: 'request-oauth' as const,
          payload: {}
        });
        
        console.log('[SignInToast] Received OAuth response:', response);
        
        if (response && typeof response === 'object' && 'success' in response && (response as any).success) {
          console.log('[SignInToast] OAuth successful - hiding toast');
          this.hide();
          return;
        } else {
          console.error('[SignInToast] OAuth failed:', (response as any)?.error);
        }
      } catch (error) {
        console.error('[SignInToast] OAuth request failed:', error);
      }
      
      googleBtn.disabled = false;
      googleBtn.innerHTML = originalHTML;
      
    } catch (error) {
      console.error('[SignInToast] Sign in process failed:', error);
    }
  }

  private cleanup(): void {
    if (this.toastElement) {
      this.toastElement.remove();
      this.toastElement = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
