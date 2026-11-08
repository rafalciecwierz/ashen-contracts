import { loginSchema } from '@ashen-contracts/shared';
import { defineForm } from '@/forms/parseForm';

export const loginForm = defineForm(loginSchema, {
  email: 'invalidEmail',
  password: 'passwordRequired',
});
