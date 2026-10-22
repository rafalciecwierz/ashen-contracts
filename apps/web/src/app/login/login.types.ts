import type { ValidationMessageKey } from '@/i18n/validationKey';

export interface LoginFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
}
