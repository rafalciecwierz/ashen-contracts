import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { LoginDto, RegisterDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import {
  AuthErrorCode,
  LoginResponse,
  MeResponse,
  RegisterResponse,
} from '@ashen-contracts/shared';

// Prisma's error code for a unique constraint violation.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function emailAlreadyRegistered(): ConflictException {
  const code: AuthErrorCode = 'EMAIL_ALREADY_REGISTERED';
  return new ConflictException({ code, message: 'Email already registered' });
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const existing = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });
    // Fast path: skips hashing for an email that is already taken.
    if (existing) {
      throw emailAlreadyRegistered();
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

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

  async login(dto: LoginDto): Promise<LoginResponse> {
    const player = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });

    if (!player) {
      const code: AuthErrorCode = 'INVALID_CREDENTIALS';
      throw new UnauthorizedException({ code, message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      player.passwordHash,
    );

    if (!passwordMatches) {
      const code: AuthErrorCode = 'INVALID_CREDENTIALS';
      throw new UnauthorizedException({ code, message: 'Invalid credentials' });
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
      const code: AuthErrorCode = 'INVALID_CREDENTIALS';
      throw new UnauthorizedException({
        code,
        message: 'Account no longer exists',
      });
    }

    return { id: player.id, email: player.email };
  }
}
