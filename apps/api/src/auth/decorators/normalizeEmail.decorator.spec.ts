import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from '../dto';

describe.each([
  ['RegisterDto', RegisterDto],
  ['LoginDto', LoginDto],
])('NormalizeEmail on %s', (_name, Dto) => {
  it('trims and lowercases the email', async () => {
    const dto = plainToInstance(Dto, {
      email: '  Test@X.com ',
      password: 'password123',
    });

    expect(dto.email).toBe('test@x.com');
    expect(await validate(dto)).toEqual([]);
  });

  it('passes a non-string through for @IsEmail() to reject', async () => {
    const dto = plainToInstance(Dto, { email: 42, password: 'password123' });

    expect(dto.email).toBe(42);
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(['email']);
  });
});
