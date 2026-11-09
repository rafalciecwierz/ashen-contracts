import type { z } from 'zod';
import type { FormState } from '@/forms/form.types';
import type { registerForm } from './register.schema';

export type RegisterFormState = FormState<z.input<typeof registerForm.schema>>;
