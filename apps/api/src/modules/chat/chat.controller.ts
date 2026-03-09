import { Controller, Post, Body, Res, UseGuards, Logger } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsArray,
  IsIn,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator'
import { Response } from 'express'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'

class ChatHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant'

  @IsString()
  @MaxLength(4000)
  content: string
}

class ChatMessageDto {
  @IsString()
  @MaxLength(2000)
  message: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  @IsOptional()
  history?: ChatHistoryMessageDto[]
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a message to the AI business assistant (SSE stream)' })
  async message(
    @CurrentUser() user: CurrentUserData,
    @Body() body: ChatMessageDto,
    @Res() res: Response,
  ) {
    // Set SSE headers — keeps connection alive, no buffering
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
    res.flushHeaders()

    // Track if client disconnects
    let clientDisconnected = false
    res.on('close', () => { clientDisconnected = true })

    // Safe write — checks if client is still connected
    const safeWrite = (data: string) => {
      if (clientDisconnected) {
        this.logger.warn('[SSE] Client disconnected, skipping write')
        return false
      }
      try {
        res.write(data)
        return true
      } catch (err) {
        this.logger.error(`[SSE] Write failed: ${err}`)
        return false
      }
    }

    // Status callback — sends live progress to the frontend
    const onStatus = (text: string) => {
      safeWrite(`event: status\ndata: ${JSON.stringify({ text })}\n\n`)
    }

    try {
      const reply = await this.chatService.chat(
        user.tenantSchema,
        user.userId,
        user.tenantId,
        { message: body.message, history: body.history ?? [] },
        onStatus,
      )

      this.logger.log(`[SSE] Sending done event (reply length: ${reply.length}, client connected: ${!clientDisconnected})`)
      safeWrite(`event: done\ndata: ${JSON.stringify({ reply })}\n\n`)
    } catch (err: any) {
      const message = err?.response?.message ?? err?.message ?? 'AI service error. Please try again.'
      this.logger.error(`[SSE] Sending error event: ${message}`)
      safeWrite(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
    }

    res.end()
  }
}
