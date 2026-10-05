import z from 'zod';

// No password min-length here, unlike registerSchema — login should attempt
// against whatever the user typed, never leak password-strength rules at
// the login step. The backend DTO mirrors this (just @IsString, no @MinLength).
export const loginSchema = z.object({
  email: z.email({ error: 'invalidEmail' }),
  password: z.string().min(1, { error: 'passwordRequired' }),
});