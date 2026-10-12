import type { ValidationMessageKey } from '@/src/i18n/validationKey';

export interface RegisterFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
  confirmPassword?: ValidationMessageKey;
}
