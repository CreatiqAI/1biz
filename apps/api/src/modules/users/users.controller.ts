import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { InviteUserDto } from './dto/invite-user.dto'
import { UpdateUserRolesDto } from './dto/update-user-roles.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.usersService.getProfile(user.userId) }
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  async updateMyProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { fullName?: string; phone?: string },
  ) {
    return { success: true, data: await this.usersService.updateProfile(user.userId, body) }
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password' })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.usersService.changePassword(user.userId, body.currentPassword, body.newPassword)
    return { success: true, message: 'Password changed successfully' }
  }

  @Post('invite')
  @Audit('user', 'INVITE')
  @RequirePermissions(Permission.USERS_CREATE)
  @ApiOperation({ summary: 'Invite a user to the company' })
  async inviteUser(@CurrentUser() user: CurrentUserData, @Body() dto: InviteUserDto) {
    return { success: true, data: await this.usersService.inviteUser(user.tenantId, dto) }
  }

  @Patch(':userId/roles')
  @Audit('user')
  @RequirePermissions(Permission.USERS_UPDATE)
  @ApiOperation({ summary: 'Update user roles' })
  async updateRoles(
    @CurrentUser() user: CurrentUserData,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return { success: true, data: await this.usersService.updateUserRoles(user.tenantId, userId, dto) }
  }

  @Delete(':userId')
  @Audit('user')
  @RequirePermissions(Permission.USERS_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a user from the company' })
  async removeUser(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string) {
    await this.usersService.removeUserFromTenant(user.tenantId, userId)
    return { success: true, message: 'User removed from company' }
  }
}
