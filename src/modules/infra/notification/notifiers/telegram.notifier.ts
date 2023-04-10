import ConfigService from '@config/config.service'
import { Notifier, NotifyData } from '@localtypes/notifier.type'
import { Telegraf } from 'telegraf'
import { singleton } from 'tsyringe'

@singleton()
export class TelegramNotifier implements Notifier {
  private bot!: Telegraf

  constructor(private configService: ConfigService) {}

  async start(): Promise<void> {
    const BOT_TOKEN = this.configService.getEnv<string>('TELEGRAM_BOT_TOKEN')
    if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not defined')

    this.bot = new Telegraf(BOT_TOKEN)
    this.bot.launch()
  }

  async stop(): Promise<void> {
    this.bot.stop()
  }

  async notify(data: NotifyData): Promise<void> {
    const CHAT_ID = this.configService.getEnv<number>('TELEGRAM_CHAT_ID')
    if (!CHAT_ID) throw new Error('CHAT_ID is not defined')

    await this.bot.telegram.sendMessage(
      CHAT_ID,
      `⚠️ *Queda de preço: ${data.gameTitle}* ⚠️ \n\n` +
        `*Plataforma:* ${data.platform} \n` +
        `*Preço atual:* R$ ${data.currentPrice} \n` +
        `*Preço anterior:* R$ ${data.oldPrice} \n\n ` +
        `🔗 ${data.gameUrl}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Acesse', url: data.gameUrl }]]
        }
      }
    )
  }
}
