import { PASSWORD_MIN_LENGTH } from '@ashen-contracts/shared';
import type messages from '../../messages/en.json';

export type ValidationMessageKey = keyof (typeof messages)['validation'];

/**
 * Marks a Zod `error` as a key of the "validation" namespace in en.json, so a
 * typo or a missing translation fails at compile time:
 *   z.string().min(1, { error: validationKey('passwordRequired') })
 * Forms read `issue.message` back as a ValidationMessageKey (parseForm) and
 * translate it with useFormAction's fieldError.
 */
export function validationKey(key: ValidationMessageKey): ValidationMessageKey {
  return key;
}

/**
 * Values for the validation messages that have placeholders, in one place, so
 * no form can show `passwordTooShort` without its `{min}`. next-intl doesn't
 * check at compile time that a message gets its values.
 */
export const validationMessageValues: Partial<
  Record<ValidationMessageKey, Record<string, string | number>>
> = {
  passwordTooShort: { min: PASSWORD_MIN_LENGTH },
};
