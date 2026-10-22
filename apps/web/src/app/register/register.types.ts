import type { ValidationMessageKey } from '@/i18n/validationKey';

export interface RegisterFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
  confirmPassword?: ValidationMessageKey;
}
