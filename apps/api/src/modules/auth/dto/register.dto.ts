import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'john@company.com.my' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string

  @ApiProperty({ example: 'Ahmad bin Abdullah' })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100)
  fullName: string

  @ApiProperty({ example: 'Syarikat ABC Sdn Bhd' })
  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(255)
  companyName: string

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string
}
