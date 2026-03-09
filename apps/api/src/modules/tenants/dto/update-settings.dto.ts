import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() companyRegNo?: string
  @ApiPropertyOptional() @IsOptional() @IsString() taxRegNo?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sstRegistered?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string
  @ApiPropertyOptional() @IsOptional() @IsString() postcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStart?: number
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string
  @ApiPropertyOptional() @IsOptional() @IsString() quotePrefix?: string
}
