import type { z } from 'zod';
import type { ErrorCode } from '@/i18n/errorCode';
import type { ValidationMessageKey } from '@/i18n/validationKey';

/** One translation key per field of `T`: a form shows one error per field. */
export type FieldMessageKeys<T> = Record<
  keyof T & string,
  ValidationMessageKey
>;

export type FieldErrors<T> = Partial<FieldMessageKeys<T>>;

/**
 * A form's rules and messages: the schema (usually one from
 * @ashen-contracts/shared, which carries no messages) and the translation key
 * for each of its fields. The keys also name the fields parseForm reads from
 * the FormData. Create one with defineForm().
 */
export interface FormDefinition<TSchema extends z.ZodType> {
  schema: TSchema;
  messageKeys: FieldMessageKeys<z.input<TSchema>>;
}

/**
 * What a form's Server Action returns when it doesn't redirect. `values` are
 * the fields to show again (never passwords), which a form without JavaScript
 * would otherwise lose; `error` is the code of a form-level message (the
 * API's, or GENERIC for one the web app doesn't know).
 */
export interface FormState<T> {
  values: Partial<Record<keyof T & string, string>>;
  fieldErrors: FieldErrors<T>;
  error: ErrorCode | null;
}

export type FormAction<T> = (
  previous: FormState<T>,
  formData: FormData,
) => Promise<FormState<T>>;
