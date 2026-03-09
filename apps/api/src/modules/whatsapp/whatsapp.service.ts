import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qrcode = require('qrcode-terminal') as { generate: (qr: string, opts: object) => void }
import { ChatService, ChatMessage } from '../chat/chat.service'

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name)
  private sock: WASocket | null = null
  private history = new Map<string, ChatMessage[]>()
  private enabled = false
  private qrCode: string | null = null
  private connectionStatus: 'disconnected' | 'qr_pending' | 'connected' = 'disconnected'
  private reconnectAttempts = 0

  getStatus() {
    return { enabled: this.enabled, status: this.connectionStatus, qr: this.qrCode }
  }

  constructor(
    private readonly config: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async onModuleInit() {
    this.enabled = this.config.get<string>('WHATSAPP_ENABLED') === 'true'
    if (!this.enabled) {
      this.logger.log('WhatsApp integration is disabled (WHATSAPP_ENABLED != true)')
      return
    }
    await this.connect()
  }

  async onModuleDestroy() {
    if (this.sock) {
      this.sock.end(undefined)
    }
  }

  private async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('/app/whatsapp-session')
    const { version } = await fetchLatestBaileysVersion()
    this.logger.log(`Connecting with WhatsApp Web v${version.join('.')}`)

    const silentLogger = {
      level: 'silent',
      trace: () => {}, debug: () => {}, info: () => {},
      warn: () => {}, error: () => {}, fatal: () => {},
      child: () => silentLogger,
    } as any

    this.sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS('Chrome'),
      logger: silentLogger,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 25000,
    })

    this.sock.ev.on('creds.update', saveCreds)

    this.sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.qrCode = qr
        this.connectionStatus = 'qr_pending'
        this.logger.log('========================================')
        this.logger.log('SCAN THIS QR CODE WITH WHATSAPP:')
        this.logger.log('========================================')
        qrcode.generate(qr, { small: true })
      }
      if (connection === 'open') {
        this.qrCode = null
        this.connectionStatus = 'connected'
        this.reconnectAttempts = 0
        this.logger.log('WhatsApp connected successfully')
      }
      if (connection === 'close') {
        this.connectionStatus = 'disconnected'
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = code !== DisconnectReason.loggedOut
        this.logger.warn(`WhatsApp disconnected (code ${code}). Reconnect: ${shouldReconnect}`)
        if (shouldReconnect) {
          this.reconnectAttempts++
          const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 60000)
          this.logger.log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`)
          setTimeout(() => this.connect(), delay)
        } else {
          this.logger.error('WhatsApp logged out — delete /app/whatsapp-session and restart to re-scan QR')
        }
      }
    })

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        await this.handleMessage(msg)
      }
    })
  }

  private async handleMessage(msg: proto.IWebMessageInfo) {
    // Ignore messages sent by this account
    if (!msg.key || msg.key.fromMe) return
    // Ignore non-text messages and status updates
    if (!msg.message || msg.key.remoteJid === 'status@broadcast') return

    const jid = msg.key.remoteJid!
    const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')

    // Allowlist check
    const allowedRaw = this.config.get<string>('WHATSAPP_ALLOWED_NUMBERS', '')
    if (allowedRaw) {
      const allowed = allowedRaw.split(',').map((n) => n.trim())
      if (!allowed.includes(phone)) {
        this.logger.debug(`Ignoring message from unlisted number: ${phone}`)
        return
      }
    }

    // Extract text content
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.buttonsResponseMessage?.selectedDisplayText ||
      msg.message.listResponseMessage?.title

    if (!text?.trim()) return

    const tenantSchema = this.config.get<string>('WHATSAPP_TENANT_SCHEMA', '')
    const userId = this.config.get<string>('WHATSAPP_USER_ID', '')
    const tenantId = this.config.get<string>('WHATSAPP_TENANT_ID', '')

    if (!tenantSchema || !userId || !tenantId) {
      this.logger.error('Missing WHATSAPP_TENANT_SCHEMA / WHATSAPP_USER_ID / WHATSAPP_TENANT_ID env vars')
      await this.sock!.sendMessage(jid, { text: '⚠️ WhatsApp bot is not fully configured yet.' })
      return
    }

    this.logger.log(`📱 WhatsApp message from ${phone}: ${text.substring(0, 80)}`)

    // Show typing indicator
    await this.sock!.sendPresenceUpdate('composing', jid)

    const history = this.history.get(jid) ?? []

    try {
      const reply = await this.chatService.chat(tenantSchema, userId, tenantId, {
        message: text,
        history,
      })

      // Update history (keep last 20 messages)
      history.push({ role: 'user', content: text })
      history.push({ role: 'assistant', content: reply })
      this.history.set(jid, history.slice(-20))

      await this.sock!.sendPresenceUpdate('paused', jid)
      await this.sock!.sendMessage(jid, { text: reply })
      this.logger.log(`📤 Reply sent to ${phone}`)
    } catch (err) {
      this.logger.error(`Failed to process WhatsApp message: ${String(err)}`)
      await this.sock!.sendPresenceUpdate('paused', jid)
      await this.sock!.sendMessage(jid, {
        text: '❌ Sorry, something went wrong. Please try again.',
      })
    }
  }
}
