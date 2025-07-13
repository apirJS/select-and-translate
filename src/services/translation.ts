import {
  TranslationApiRequestSchema,
  TranslationApiResponseSchema,
  type TranslationResult
} from '../lib/types';
import { ApplicationError } from '../lib/errors';
import { ConfigService } from '../core/config';

export class TranslationService {
  private static instance: TranslationService;
  private configService: ConfigService;
  private readonly maxRetries = 2;
  private readonly baseUrl = 'https://translate.apir.live/api/translate';

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  async translateImage(
    imageDataUrl: string,
    fromLang?: string,
    toLang?: string
  ): Promise<TranslationResult> {
    let retryCount = 0;

    while (retryCount <= this.maxRetries) {
      try {
        const languages = await this.getLanguages(fromLang, toLang);
        const base64Image = this.extractBase64FromDataUrl(imageDataUrl);
        const response = await this.makeTranslationRequest(base64Image, languages);
        
        return this.validateTranslationResponse(response);
      } catch (error) {
        if (this.shouldRetry(error, retryCount)) {
          retryCount++;
          await this.wait(1000 * retryCount);
          continue;
        }
        throw error;
      }
    }

    throw new ApplicationError('system', 'Translation failed after multiple attempts. Please try again later.', { 
      shouldNotify: true, 
      canRetry: false,
      technical: 'Maximum retries exceeded'
    });
  }

  private async getLanguages(fromLang?: string, toLang?: string) {
    if (fromLang && toLang) {
      return { fromLanguage: fromLang, toLanguage: toLang };
    }

    return await this.configService.getLanguages();
  }

  private extractBase64FromDataUrl(imageDataUrl: string): string {
    return imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
  }

  private async makeTranslationRequest(
    base64Image: string,
    languages: { fromLanguage: string; toLanguage: string }
  ): Promise<TranslationResult> {
    const requestPayload = TranslationApiRequestSchema.parse({ 
      image: base64Image 
    });

    const url = `${this.baseUrl}?from=${languages.fromLanguage}&to=${languages.toLanguage}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new ApplicationError(
        'network',
        `Connection failed (${response.status})`,
        { technical: `HTTP error! Status: ${response.status}`, canRetry: true }
      );
    }

    return await response.json();
  }

  private validateTranslationResponse(responseData: unknown): TranslationResult {
    const parseResult = TranslationApiResponseSchema.safeParse(responseData);
    if (!parseResult.success) {
      throw new ApplicationError(
        'system',
        'Translation service temporarily unavailable',
        { 
          technical: `Invalid API response format: ${parseResult.error.message}`,
          shouldNotify: false, // Don't notify - this is a service issue, not user error
          canRetry: true
        }
      );
    }

    const result = parseResult.data;
    if (result.originalText === null && result.translatedText === null) {
      throw new ApplicationError(
        'validation',
        'No text detected in the selected area',
        { shouldNotify: true } // This one we should notify - it's actionable for the user
      );
    }

    return result;
  }

  private shouldRetry(error: unknown, retryCount: number): boolean {
    return error instanceof ApplicationError &&
           error.category === 'network' &&
           error.canRetry &&
           retryCount < this.maxRetries;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
