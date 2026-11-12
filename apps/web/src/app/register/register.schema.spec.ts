import { describe, expect, it } from 'vitest';
import { parseForm } from '@/forms/parseForm';
import { registerForm } from './register.schema';
import { formData } from '../../../test/formData';

describe('registerForm', () => {
  it('accepts matching passwords of at least 8 characters', () => {
    expect(
      parseForm(
        registerForm,
        formData({
          email: 'A@B.co',
          password: 'password123',
          confirmPassword: 'password123',
        }),
      ),
    ).toEqual({
      success: true,
      data: {
        email: 'a@b.co',
        password: 'password123',
        confirmPassword: 'password123',
      },
    });
  });

  it('rejects an invalid email and a short password', () => {
    expect(
      parseForm(
        registerForm,
        formData({
          email: 'nope',
          password: 'short',
          confirmPassword: 'short',
        }),
      ),
    ).toEqual({
      success: false,
      fieldErrors: { email: 'invalidEmail', password: 'passwordTooShort' },
    });
  });

  it('rejects passwords that do not match', () => {
    expect(
      parseForm(
        registerForm,
        formData({
          email: 'a@b.co',
          password: 'password123',
          confirmPassword: 'password124',
        }),
      ),
    ).toEqual({
      success: false,
      fieldErrors: { confirmPassword: 'passwordsDoNotMatch' },
    });
  });
});
