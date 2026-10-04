import z from 'zod';

// Each `error` here is a translation KEY (looked up in the "validation"
// namespace of messages/en.json), not the final displayed text — the schema
// lives outside any component, so it can't call useTranslations() itself.
export const registerSchema = z
  .object({
    email: z.email({ error: 'invalidEmail' }),
    password: z.string().min(8, { error: 'passwordTooShort' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'passwordsDoNotMatch',
    path: ['confirmPassword'],
  });