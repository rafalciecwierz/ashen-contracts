import z from 'zod';
import { registerSchema } from '@ashen-contracts/shared';
import { validationKey, validationKeysByField } from '@/i18n/validationKey';

// The API's rules (shared with it) plus the confirmation field, which only
// the form has: the API never sees confirmPassword.
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: validationKey('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

export const registerErrorKeys = validationKeysByField<
  z.input<typeof registerFormSchema>
>({
  email: 'invalidEmail',
  password: 'passwordTooShort',
  confirmPassword: 'passwordsDoNotMatch',
});
