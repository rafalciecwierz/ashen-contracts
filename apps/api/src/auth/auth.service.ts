import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { JwtService } from '@nestjs/jwt';
import {
  ApiErrorCode,
  LoginInput,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
} from '@ashen-contracts/shared';

// Prisma's error code for a unique constraint violation.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const BCRYPT_ROUNDS = 10;

// Compared against when a login's email has no account, so that path runs
// bcrypt like a wrong password does and takes as long. Without it, the fast
// 401 for an unknown email reveals which emails are registered. Hashed once at
// startup from a random value with the same cost as real hashes, so the two
// paths cost the same and no password can match it.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomUUID(), BCRYPT_ROUNDS);

function emailAlreadyRegistered(): ConflictException {
  const code: ApiErrorCode = 'EMAIL_ALREADY_REGISTERED';
  return new ConflictException({ code, message: 'Email already registered' });
}

function invalidCredentials(): UnauthorizedException {
  const code: ApiErrorCode = 'INVALID_CREDENTIALS';
  return new UnauthorizedException({ code, message: 'Invalid credentials' });
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterInput): Promise<RegisterResponse> {
    const existing = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });
    // Fast path: skips hashing for an email that is already taken.
    if (existing) {
      throw emailAlreadyRegistered();
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // The check above is not atomic: a concurrent request can create the same
    // email in between. The unique index on email is the real guard.
    try {
      const player = await this.prisma.player.create({
        data: {
          email: dto.email,
          passwordHash,
        },
      });

      return { id: player.id, email: player.email };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw emailAlreadyRegistered();
      }
      throw error;
    }
  }

  async login(dto: LoginInput): Promise<LoginResponse> {
    const player = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });

    // Always one bcrypt comparison, account or not (see DUMMY_PASSWORD_HASH).
    const passwordMatches = await bcrypt.compare(
      dto.password,
      player?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!player || !passwordMatches) {
      throw invalidCredentials();
    }

    const token = await this.jwt.signAsync({
      sub: player.id,
      email: player.email,
    });

    return { accessToken: token };
  }

  async me(userId: string): Promise<MeResponse> {
    const player = await this.prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      const code: ApiErrorCode = 'UNAUTHORIZED';
      throw new UnauthorizedException({
        code,
        message: 'Account no longer exists',
      });
    }

    return { id: player.id, email: player.email };
  }
}
