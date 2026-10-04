import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import {
  AuthErrorCode,
  LoginResponse,
  RegisterResponse,
} from '@ashen-contracts/shared';

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
    if (existing) {
      const code: AuthErrorCode = 'EMAIL_ALREADY_REGISTERED';
      throw new ConflictException({
        code,
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const player = await this.prisma.player.create({
      data: {
        email: dto.email,
        passwordHash,
      },
    });

    return { id: player.id, email: player.email };
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
}
