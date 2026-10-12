import type { ValidationMessageKey } from '@/src/i18n/validationKey';

export interface LoginFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
}
