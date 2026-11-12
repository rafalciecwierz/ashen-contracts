import { describe, expect, it } from 'vitest';
import { parseForm } from '@/forms/parseForm';
import { loginForm } from './login.schema';
import { formData } from '../../../test/formData';

describe('loginForm', () => {
  it('accepts an email and any non-empty password, and normalizes the email', () => {
    expect(
      parseForm(loginForm, formData({ email: ' A@B.co ', password: 'x' })),
    ).toEqual({ success: true, data: { email: 'a@b.co', password: 'x' } });
  });

  it('asks for a valid email and a password', () => {
    expect(
      parseForm(loginForm, formData({ email: 'nope', password: '' })),
    ).toEqual({
      success: false,
      fieldErrors: { email: 'invalidEmail', password: 'passwordRequired' },
    });
  });
});
