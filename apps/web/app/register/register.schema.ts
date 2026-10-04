import z from "zod";

export const registerSchema = z
  .object({
    email: z.email({ error: 'Enter a valid email address.' }),
    password: z.string().min(8, { error: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  });