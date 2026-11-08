import z from 'zod';
import { registerSchema } from '@ashen-contracts/shared';
import { defineForm } from '@/forms/parseForm';
import { validationKey } from '@/i18n/validationKey';

export const registerForm = defineForm(
  registerSchema
    .extend({ confirmPassword: z.string() })
    .refine((data) => data.password === data.confirmPassword, {
      error: validationKey('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    }),
  {
    email: 'invalidEmail',
    password: 'passwordTooShort',
    confirmPassword: 'passwordsDoNotMatch',
  },
);
