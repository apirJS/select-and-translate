import { z } from 'zod';

export const ExtensionConfigSchema = z.object({
  version: z.string(),
  apiEndpoint: z.url(),
  defaultLanguages: z.object({
    from: z.string().default('auto-detect'),
    to: z.string().default('en-US'),
  }),
  retryConfig: z.object({
    maxRetries: z.number().int().min(0).max(5).default(2),
    retryDelayMs: z.number().int().min(100).max(10000).default(1000),
  }),
  timeouts: z.object({
    translationRequestMs: z.number().int().min(1000).max(60000).default(30000),
    contentScriptInjectionMs: z.number().int().min(100).max(5000).default(1000),
  }),
});
export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

export const defaultConfig: ExtensionConfig = {
  version: '1.0.0',
  apiEndpoint: 'https://translate.apir.live/api/translate',
  defaultLanguages: {
    from: 'auto-detect',
    to: 'en-US',
  },
  retryConfig: {
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  timeouts: {
    translationRequestMs: 30000,
    contentScriptInjectionMs: 1000,
  },
};

export const TabSchema = z.object({
  id: z.number().int().positive().optional(),
  url: z.url().optional(),
  title: z.string().optional(),
  active: z.boolean().optional(),
  windowId: z.number().int().optional(),
});

export const BrowserStorageItemSchema = z.record(z.string(), z.unknown());
export const ContentScriptStateSchema = z.enum(['loading', 'ready', 'error']);
export type ContentScriptState = z.infer<typeof ContentScriptStateSchema>;

export function validateTab(tab: unknown) {
  return TabSchema.parse(tab);
}

export function validateStorageResult(result: unknown) {
  return BrowserStorageItemSchema.parse(result);
}

export const EnvironmentSchema = z.object({
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
  extensionId: z.string().optional(),
  manifestVersion: z.number().int().min(2).max(3),
});

export function getValidatedEnvironment(): z.infer<typeof EnvironmentSchema> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return EnvironmentSchema.parse({
    isDevelopment,
    isProduction: !isDevelopment,
    extensionId: (globalThis as any)?.chrome?.runtime?.id,
  });
}

export const PerformanceMetricSchema = z.object({
  name: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

export const ErrorReportSchema = z.object({
  errorType: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  timestamp: z.number(),
  userAgent: z.string().optional(),
  extensionVersion: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorReport = z.infer<typeof ErrorReportSchema>;

export class ExtensionValidator {
  private static config: ExtensionConfig = defaultConfig;

  static setConfig(config: ExtensionConfig) {
    this.config = ExtensionConfigSchema.parse(config);
  }

  static getConfig(): ExtensionConfig {
    return this.config;
  }

  static validateApiEndpoint(url: string): string {
    return z.url().parse(url);
  }

  static validateTimeout(timeout: number): number {
    return z.number().int().min(1000).max(60000).parse(timeout);
  }

  static validateRetryCount(retries: number): number {
    return z.number().int().min(0).max(5).parse(retries);
  }

  static createPerformanceMetric(
    name: string,
    startTime: number,
    endTime: number,
    metadata?: Record<string, unknown>
  ): PerformanceMetric {
    return PerformanceMetricSchema.parse({
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    });
  }

  static createErrorReport(
    error: Error | unknown,
    context?: Record<string, unknown>
  ): ErrorReport {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    return ErrorReportSchema.parse({
      errorType: errorObj.constructor.name,
      message: errorObj.message,
      stack: errorObj.stack,
      timestamp: Date.now(),
      userAgent: globalThis.navigator?.userAgent,
      extensionVersion: this.config.version,
      context,
    });
  }
}

export const ENABLE_STRICT_VALIDATION = process.env.NODE_ENV === 'development';

export function conditionalValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T {
  if (!ENABLE_STRICT_VALIDATION) {
    return data as T;
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  console.warn('Validation failed, using fallback:', result.error);
  return fallback;
}
