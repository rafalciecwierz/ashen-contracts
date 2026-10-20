import type { z } from 'zod';
import type messages from '../../messages/en.json';

export type ValidationMessageKey = keyof (typeof messages)['validation'];

/**
 * Marks a Zod `error` as a key of the "validation" namespace in en.json, so a
 * typo or a missing translation fails at compile time:
 *   z.string().min(1, { error: validationKey('passwordRequired') })
 * Forms read `issue.message` back as a ValidationMessageKey and pass it to
 * useTranslations('validation').
 */
export function validationKey(key: ValidationMessageKey): ValidationMessageKey {
  return key;
}

/**
 * A Zod error map for a form whose schema comes from @ashen-contracts/shared.
 * Shared schemas carry no messages (the API answers in English), so the form
 * names one translation key per field: a form shows one error per field.
 * Every field of `T` needs a key. Pass it to `safeParse(data, { error })`;
 * a message the schema sets itself, e.g. a refine with validationKey(), wins
 * over it.
 */
export function validationKeysByField<T extends object>(
  keys: Record<keyof T & string, ValidationMessageKey>,
): z.core.$ZodErrorMap {
  return (issue) => keys[issue.path?.[0] as keyof T & string];
}
