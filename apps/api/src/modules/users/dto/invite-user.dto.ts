import { IsEmail, IsString, IsArray, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class InviteUserDto {
  @ApiProperty({ example: 'staff@company.com.my' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Siti Aminah' })
  @IsString()
  @MinLength(2)
  fullName: string

  @ApiProperty({ example: ['accountant'] })
  @IsArray()
  @IsString({ each: true })
  roles: string[]
}
