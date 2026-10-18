import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client';

// The real bcrypt, with compare wrapped in a spy, so a test can check that a
// login runs it even when the email has no account (API-07).
vi.mock('bcrypt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcrypt')>();
  return { ...actual, compare: vi.fn(actual.compare) };
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { player: { findUnique: Mock; create: Mock } };
  let jwt: { signAsync: Mock };
  const mockedUserId: string = 'uuid-123';
  const mockedUserEmail: string = 'test@test.com';
  const mockedUserPassword: string = 'password123';

  beforeEach(async () => {
    prisma = {
      player: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    jwt = {
      signAsync: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a player and returns only id + email, never the password hash', async () => {
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockResolvedValue({
        id: mockedUserId,
        email: mockedUserEmail,
        passwordHash: 'some-bcrypt-hash',
      });

      const result = await service.register({
        email: mockedUserEmail,
        password: mockedUserPassword,
      });

      expect(result).toEqual({ id: mockedUserId, email: mockedUserEmail });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.player.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: mockedUserEmail,
      });

      await expect(
        service.register({
          email: mockedUserEmail,
          password: mockedUserPassword,
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.player.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request registers the same email first', async () => {
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`email`)',
          { code: 'P2002', clientVersion: 'test' },
        ),
      );

      const result = service.register({
        email: mockedUserEmail,
        password: mockedUserPassword,
      });

      await expect(result).rejects.toThrow(ConflictException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'EMAIL_ALREADY_REGISTERED' },
      });
    });

    it('rethrows other database errors from create', async () => {
      const dbError = new Error('connection lost');
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockRejectedValue(dbError);

      await expect(
        service.register({
          email: mockedUserEmail,
          password: mockedUserPassword,
        }),
      ).rejects.toBe(dbError);
    });
  });

  describe('login', () => {
    it('returns an access token when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash(mockedUserPassword, 10);
      prisma.player.findUnique.mockResolvedValue({
        id: mockedUserId,
        email: mockedUserEmail,
        passwordHash,
      });
      jwt.signAsync.mockResolvedValue('fake.jwt.token');

      const result = await service.login({
        email: mockedUserEmail,
        password: mockedUserPassword,
      });

      expect(result).toEqual({ accessToken: 'fake.jwt.token' });
    });

    it('throws UnauthorizedException when the email does not exist', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.player.findUnique.mockResolvedValue({
        id: mockedUserId,
        email: mockedUserEmail,
        passwordHash,
      });

      await expect(
        service.login({ email: mockedUserEmail, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('still runs bcrypt when the email does not exist, against a hash of the same cost', async () => {
      prisma.player.findUnique.mockResolvedValue(null);
      const realHash = await bcrypt.hash(mockedUserPassword, 10);
      vi.mocked(bcrypt.compare).mockClear();

      await expect(
        service.login({ email: 'nobody@test.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      const [password, hash] = vi.mocked(bcrypt.compare).mock.calls[0];
      expect(password).toBe('whatever');
      // Same algorithm and cost prefix ("$2b$10$") as a real password hash.
      expect(String(hash).slice(0, 7)).toBe(realHash.slice(0, 7));
    });

    it('gives the same error for an unknown email and a wrong password', async () => {
      const errorBody = (email: string, password: string) =>
        service
          .login({ email, password })
          .catch((e: UnauthorizedException) => e.getResponse());

      prisma.player.findUnique.mockResolvedValue(null);
      const unknownEmail = await errorBody('nobody@test.com', 'whatever');

      prisma.player.findUnique.mockResolvedValue({
        id: mockedUserId,
        email: mockedUserEmail,
        passwordHash: await bcrypt.hash('correct-password', 10),
      });
      const wrongPassword = await errorBody(mockedUserEmail, 'wrong-password');

      expect(unknownEmail).toEqual(wrongPassword);
    });
  });

  describe('me', () => {
    it('returns id and email of the current player, never the password hash', async () => {
      prisma.player.findUnique.mockResolvedValue({
        id: mockedUserId,
        email: mockedUserEmail,
        passwordHash: 'some-bcrypt-hash',
      });

      const result = await service.me(mockedUserId);

      expect(result).toEqual({ id: mockedUserId, email: mockedUserEmail });
      expect(result).not.toHaveProperty('passwordHash');
      expect(prisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: mockedUserId },
      });
    });

    it('throws UnauthorizedException when the account no longer exists', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(service.me('ghost-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
