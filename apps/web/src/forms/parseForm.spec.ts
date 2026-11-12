import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validationKey } from '@/i18n/validationKey';
import { defineForm, parseForm } from './parseForm';
import { formData } from '../../test/formData';

const strictForm = defineForm(
  z.strictObject({ email: z.email(), password: z.string().min(1) }),
  { email: 'invalidEmail', password: 'passwordRequired' },
);

describe('parseForm', () => {
  it('returns the parsed data of a valid form', () => {
    const result = parseForm(
      strictForm,
      formData({ email: 'a@b.co', password: 'x' }),
    );

    expect(result).toEqual({
      success: true,
      data: { email: 'a@b.co', password: 'x' },
    });
  });

  it('ignores fields outside the message keys, so a strict schema accepts the form', () => {
    const result = parseForm(
      strictForm,
      formData({ email: 'a@b.co', password: 'x', redirect: '/play' }),
    );

    expect(result).toEqual({
      success: true,
      data: { email: 'a@b.co', password: 'x' },
    });
  });

  it("maps each issue to its field's message key", () => {
    const result = parseForm(
      strictForm,
      formData({ email: 'nope', password: '' }),
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: { email: 'invalidEmail', password: 'passwordRequired' },
    });
  });

  it('reads a missing field and a non-string entry (a File) as an empty string', () => {
    const result = parseForm(
      strictForm,
      formData({ email: new File(['a@b.co'], 'email.txt') }),
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: { email: 'invalidEmail', password: 'passwordRequired' },
    });
  });

  it('keeps only the first error per field', () => {
    const form = defineForm(
      z.object({
        password: z
          .string()
          .min(8, { error: validationKey('passwordTooShort') })
          .regex(/\d/, { error: validationKey('passwordRequired') }),
      }),
      { password: 'invalidEmail' },
    );

    const result = parseForm(form, formData({ password: 'abc' }));

    expect(result).toEqual({
      success: false,
      fieldErrors: { password: 'passwordTooShort' },
    });
  });

  it("lets a message the schema sets itself win over the field's key", () => {
    const form = defineForm(
      z
        .object({ password: z.string(), confirmPassword: z.string() })
        .refine((data) => data.password === data.confirmPassword, {
          error: validationKey('passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
      { password: 'passwordTooShort', confirmPassword: 'passwordRequired' },
    );

    const result = parseForm(
      form,
      formData({ password: 'a', confirmPassword: 'b' }),
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: { confirmPassword: 'passwordsDoNotMatch' },
    });
  });
});
