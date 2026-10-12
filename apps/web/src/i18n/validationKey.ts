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
