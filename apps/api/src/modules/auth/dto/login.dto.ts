import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'john@company.com.my' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional({ example: true, description: 'Keep user signed in for 30 days' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}
