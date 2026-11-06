import type { ApiErrorCode } from '@ashen-contracts/shared';
import type { ValidationMessageKey } from '@/i18n/validationKey';

export interface LoginFieldErrors {
  email?: ValidationMessageKey;
  password?: ValidationMessageKey;
}

/** What the login action returns to the form when it doesn't redirect. */
export interface LoginFormState {
  error: ApiErrorCode | null;
}
