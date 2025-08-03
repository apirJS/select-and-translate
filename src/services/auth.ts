import { BrowserAdapter } from '../adapters';
import { StorageService } from './storage';
import { ApplicationError } from '../lib/errors';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const CLIENT_ID =
  '664583959686-fhvksj46jkd9j5v96vsmvs406jgndmic.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/generative-language.retriever';

export class AuthService {
  private static instance: AuthService;
  private static readonly ACCESS_TOKEN_KEY = 'access_token';

  private _isAuthenticated = false;
  private _currentState: string | null = null;
  private _accessToken: string | null = null;
  private _initPromise: Promise<void> | null = null;

  private readonly browserAdapter: BrowserAdapter;
  private readonly storageService: StorageService;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
    this.storageService = StorageService.getInstance();
    this._initPromise = this.initializeAuthState();
    this.setupStorageListener();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async ensureInitialized(): Promise<void> {
    if (this._initPromise) {
      await this._initPromise;
    }
  }

  private async initializeAuthState(): Promise<void> {
    try {
      const storedToken = await this.storageService.getItem<string>(
        AuthService.ACCESS_TOKEN_KEY,
        { area: 'local' }
      );

      if (storedToken) {
        this._accessToken = storedToken;
        this._isAuthenticated = true;
        return;
      }

      this._isAuthenticated = false;
      this._accessToken = null;
    } catch (error) {
      console.warn('[AuthService] Failed to initialize auth state:', error);
      this._isAuthenticated = false;
      this._accessToken = null;
    }
  }

  async getOAuthToken(): Promise<string> {
    try {
      if (typeof __FORCE_AUTHENTICATED__ !== 'undefined' && __FORCE_AUTHENTICATED__) {
        return this.simulateMockOAuthFlow();
      }

      if (this._accessToken) {
        return this._accessToken;
      }

      const oauthURL = this.constructOAuthURL();
      const redirectURL = await this.browserAdapter.identity.launchWebAuthFlow({
        interactive: true,
        url: oauthURL,
      });

      if (!redirectURL) {
        throw new ApplicationError('user_cancelled', "OAuth process cancelled");
      }

      const url = new URL(redirectURL);
      const params = new URLSearchParams(url.hash.substring(1));

      const state = params.get('state');
      const accessToken = params.get('access_token');

      if (!state) {
        throw new ApplicationError(
          'validation',
          'State is missing from the returned URL at OAuth process'
        );
      }

      if (state !== this.currentState) {
        throw new ApplicationError(
          'validation',
          'Invalid state parameter. Possible CSRF attack.'
        );
      }

      if (!accessToken) {
        throw new ApplicationError(
          'validation',
          '`access_token` is missing from the returned URL at OAuth process'
        );
      }

      await this.storeAccessToken(accessToken);
      this._isAuthenticated = true;
      this._accessToken = accessToken;
      
      return accessToken;
    } catch (error) {
      throw ApplicationError.from(error);
    }
  }

  private async storeAccessToken(token: string): Promise<void> {
    try {
      await this.storageService.setItem(
        AuthService.ACCESS_TOKEN_KEY,
        token,
        { area: 'local' }
      );
    } catch (error) {
      throw new ApplicationError(
        'system',
        'Failed to store authentication token. Please try signing in again.'
      );
    }
  }

  async clearAccessToken(): Promise<void> {
    try {
      await this.storageService.removeItem(
        AuthService.ACCESS_TOKEN_KEY,
        { area: 'local' }
      );
      this._accessToken = null;
      this._isAuthenticated = false;
    } catch (error) {
      // Silent error handling for clearing tokens
    }
  }

  get accessToken(): string | null {
    return this._accessToken;
  }

  async signOut(): Promise<void> {
    try {
      await this.clearAccessToken();
      this.currentState = this.generateCryptoRandomState();
    } catch (error) {
      throw new ApplicationError(
        'system',
        'Failed to sign out. Please try again.'
      );
    }
  }

  get currentState(): string {
    if (this._currentState === null) {
      this._currentState = this.generateCryptoRandomState();
    }
    return this._currentState;
  }

  set currentState(state: string) {
    this._currentState = state;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  private async simulateMockOAuthFlow(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockAccessToken = `mock_dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.storeAccessToken(mockAccessToken);
    this._isAuthenticated = true;
    this._accessToken = mockAccessToken;
    
    return mockAccessToken;
  }

  private setupStorageListener(): void {
    this.storageService.onChanged((changes, areaName) => {
      if (areaName === 'local' && changes[AuthService.ACCESS_TOKEN_KEY]) {
        const change = changes[AuthService.ACCESS_TOKEN_KEY];
        if (change.newValue) {
          this._accessToken = change.newValue;
          this._isAuthenticated = true;
        } else if (change.oldValue && !change.newValue) {
          this._accessToken = null;
          this._isAuthenticated = false;
        }
      }
    }, 'local');
  }

  private generateCryptoRandomState(): string {
    const randomBytes = new Uint8Array(32);
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : crypto;
    cryptoObj.getRandomValues(randomBytes);

    const binaryString = String.fromCharCode.apply(
      null,
      Array.from(randomBytes)
    );
    const base64 = btoa(binaryString);

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private constructOAuthURL(): string {
    const redirectURL = this.browserAdapter.identity.getRedirectURL();
    const state = this.currentState;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'token',
      redirect_uri: redirectURL,
      scope: SCOPE,
      state: state,
    });

    const fullURL = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
    
    return fullURL;
  }
}
