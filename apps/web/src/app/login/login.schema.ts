import type { LoginInput } from '@ashen-contracts/shared';
import { validationKeysByField } from '@/i18n/validationKey';

// The rules are loginSchema from @ashen-contracts/shared, the one the API
// validates with; this file only picks the message for each field.
export const loginErrorKeys = validationKeysByField<LoginInput>({
  email: 'invalidEmail',
  password: 'passwordRequired',
});
