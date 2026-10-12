import z from 'zod';
import { validationKey } from '@/src/i18n/validationKey';

// Each `error` here is a translation KEY (looked up in the "validation"
// namespace of messages/en.json), not the final displayed text — the schema
// lives outside any component, so it can't call useTranslations() itself.
export const registerSchema = z
  .object({
    email: z.email({ error: validationKey('invalidEmail') }),
    password: z.string().min(8, { error: validationKey('passwordTooShort') }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: validationKey('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });
