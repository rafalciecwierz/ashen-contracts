import type { ApiErrorCode } from '@ashen-contracts/shared';
import type { ValidationMessageKey } from '@/i18n/validationKey';

export interface RegisterFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
  confirmPassword?: ValidationMessageKey;
}

/** What the register action returns to the form when it doesn't redirect. */
export interface RegisterFormState {
  error: ApiErrorCode | null;
}
