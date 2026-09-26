import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { player: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      player: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = {
      signAsync: jest.fn(),
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
        id: 'uuid-123',
        email: 'test@test.com',
        passwordHash: 'some-bcrypt-hash',
      });

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result).toEqual({ id: 'uuid-123', email: 'test@test.com' });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.player.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'test@test.com',
      });

      await expect(
        service.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.player.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns an access token when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      prisma.player.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'test@test.com',
        passwordHash,
      });
      jwt.signAsync.mockResolvedValue('fake.jwt.token');

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
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
        id: 'uuid-123',
        email: 'test@test.com',
        passwordHash,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});