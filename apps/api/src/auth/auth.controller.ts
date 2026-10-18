import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import {
  JwtPayload,
  LoginResponse,
  RegisterResponse,
} from '@ashen-contracts/shared';
import { CurrentUser, Public } from './decorators';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth('Bearer')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
