import { z } from 'zod';

export const TranslationResultSchema = z.object({
  originalText: z.string(),
  translatedText: z.string(),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;

export const RectangleSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export type Rectangle = z.infer<typeof RectangleSchema>;

export const LanguageCodeSchema = z
  .string()
  .regex(
    /^(auto-detect|[a-z]{2}(-[A-Z]{2})?)$/,
    'Invalid language code format'
  );

export const SourceLanguageCodeSchema = z
  .string()
  .regex(
    /^(auto-detect|[a-z]{2}(-[A-Z]{2})?)$/,
    'Invalid source language code format'
  );

export const TargetLanguageCodeSchema = z
  .string()
  .regex(
    /^[a-z]{2}(-[A-Z]{2})?$/,
    'Invalid target language code format - auto-detect not allowed'
  );

export const ThemeModeSchema = z.enum(['auto', 'light', 'dark']);
export const ThemeSchema = z.enum(['light', 'dark']);

export const Base64ImageDataUrlSchema = z
  .string()
  .regex(
    /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/,
    'Invalid base64 image data URL'
  );

export const TabIdSchema = z.number().int().positive();

export const PingMessageSchema = z.object({
  type: z.literal('ping'),
});

export const CleanupOverlaysMessageSchema = z.object({
  type: z.literal('cleanup_overlays'),
});

export const UserSelectMessageSchema = z.object({
  type: z.literal('user-select'),
  payload: z.object({
    tabId: TabIdSchema,
    imageDataUrl: Base64ImageDataUrlSchema,
  }),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  payload: z.object({
    error: z.unknown(),
  }),
});

export const TranslationResultMessageSchema = z.object({
  type: z.literal('translation-result'),
  payload: TranslationResultSchema,
});

export const RunTranslationMessageSchema = z.object({
  type: z.literal('run-translation'),
  payload: z.object({
    fromLanguage: LanguageCodeSchema,
    toLanguage: LanguageCodeSchema,
  }),
});

export const ThemeChangedMessageSchema = z.object({
  type: z.literal('theme-changed'),
  payload: z.object({
    mode: ThemeModeSchema,
    theme: ThemeSchema,
  }),
});

export const StoragePreferencesSchema = z.object({
  fromLanguage: LanguageCodeSchema.optional(),
  toLanguage: LanguageCodeSchema.optional(),
  themeMode: ThemeModeSchema.optional(),
});

export const PreferencesChangedMessageSchema = z.object({
  type: z.literal('preferences-changed'),
  payload: StoragePreferencesSchema,
});

export const MessageSchema = z.discriminatedUnion('type', [
  PingMessageSchema,
  CleanupOverlaysMessageSchema,
  UserSelectMessageSchema,
  ErrorMessageSchema,
  TranslationResultMessageSchema,
  RunTranslationMessageSchema,
  ThemeChangedMessageSchema,
  PreferencesChangedMessageSchema,
]);

export type Message = z.infer<typeof MessageSchema>;

export type StoragePreferences = z.infer<typeof StoragePreferencesSchema>;

export const TranslationApiResponseSchema = TranslationResultSchema;

export const TranslationApiRequestSchema = z.object({
  image: z.string(),
});

export type TranslationApiRequest = z.infer<typeof TranslationApiRequestSchema>;
export type TranslationApiResponse = z.infer<
  typeof TranslationApiResponseSchema
>;

export function validateMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}

export function validateTranslationResult(data: unknown): TranslationResult {
  return TranslationResultSchema.parse(data);
}

export function validateRectangle(data: unknown): Rectangle {
  return RectangleSchema.parse(data);
}

export function validateStoragePreferences(data: unknown): StoragePreferences {
  return StoragePreferencesSchema.parse(data);
}

export function validateTabId(data: unknown): number {
  return TabIdSchema.parse(data);
}

export function validateLanguageCode(data: unknown): string {
  return LanguageCodeSchema.parse(data);
}

export function validateSourceLanguageCode(data: unknown): string {
  return SourceLanguageCodeSchema.parse(data);
}

export function validateTargetLanguageCode(data: unknown): string {
  return TargetLanguageCodeSchema.parse(data);
}

export function validateBase64ImageDataUrl(data: unknown): string {
  return Base64ImageDataUrlSchema.parse(data);
}

export function safeParseMessage(data: unknown) {
  return MessageSchema.safeParse(data);
}

export function safeParseTranslationResult(data: unknown) {
  return TranslationResultSchema.safeParse(data);
}

export function safeParseStoragePreferences(data: unknown) {
  return StoragePreferencesSchema.safeParse(data);
}
