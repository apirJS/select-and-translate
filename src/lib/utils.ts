import { z } from 'zod';

export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

export function safeParseJson<T>(
  json: string,
  schema: z.ZodSchema<T>
): T | null {
  try {
    const parsed = JSON.parse(json);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function validateBrowserStorageResult<T>(
  result: unknown,
  schema: z.ZodSchema<T>
): T | null {
  const parseResult = schema.safeParse(result);
  return parseResult.success ? parseResult.data : null;
}
