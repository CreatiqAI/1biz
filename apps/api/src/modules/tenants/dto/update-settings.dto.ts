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
  // MyInvois e-Invoicing
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisClientId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisClientSecret?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisTin?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisBrn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisMsicCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisBusinessDesc?: string
  @ApiPropertyOptional() @IsOptional() @IsString() myinvoisEnvironment?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() myinvoisEnabled?: boolean
  // AI Chat usage cap
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) aiMessageLimit?: number
}
