import { PINO_LOGGER } from '@dependencies/dependency.tokens'
import { ApplicationLogger } from '@localtypes/logger.type'
import type { ScrapeGamePriceData } from '@localtypes/queue.type'
import { type GamePrice } from '@packages/types'
import { NotificationQueue } from '@queue/notification.queue'
import { GreenManGamingScraper } from '@scrapers/greenManGaming.scraper'
import { NuuvemScraper } from '@scrapers/nuuvem.scraper'
import { SteamScraper } from '@scrapers/steam.scraper'
import { FindGameByIdRepository } from '@shared/findGameById.repository'
import { GetCurrentGamePriceRepository } from '@shared/getCurrentGamePrice.repository'
import { inject, injectable } from 'tsyringe'

import { InsertGamePriceRepository } from './repositories/insertGamePrice.repository'

@injectable()
export class GameJobProcessor {
  constructor (
    private readonly steamScraper: SteamScraper,
    private readonly nuuvemScraper: NuuvemScraper,
    private readonly gmgScraper: GreenManGamingScraper,
    private readonly insertGamePriceRepository: InsertGamePriceRepository,
    private readonly getCurrentGamePriceRepository: GetCurrentGamePriceRepository,
    private readonly findGameByIdRepository: FindGameByIdRepository,
    private readonly notificationQueue: NotificationQueue
  ) {}

  /**
   * Scrapes and saves the current game price.
   *
   * Notifies if the current price is lower than the latest registered.
   * @param data - The game data.
   */
  async scrapePrice (data: ScrapeGamePriceData): Promise<void> {
    let currentNuuvemPrice = null
    let currentGMGPrice = null

    const currentSteamPrice = await this.steamScraper.getGamePrice(data.steamUrl)
    if (currentSteamPrice === null) return

    const hasNuuvemUrl = data.nuuvemUrl
    if (hasNuuvemUrl !== null) {
      currentNuuvemPrice = await this.nuuvemScraper.getGamePrice(data.nuuvemUrl as string)
    }

    const hasGMGUrl = data.green_man_gaming_url
    if (hasGMGUrl !== null) {
      currentGMGPrice = await this.gmgScraper.getGamePrice(data.green_man_gaming_url as string)
    }

    const lastRegisteredPrice = await this.getCurrentGamePriceRepository.getPrice(data.gameId)

    await this.insertGamePriceRepository.insert(data.gameId, {
      steam_price: currentSteamPrice,
      nuuvem_price: currentNuuvemPrice,
      green_man_gaming_price: currentGMGPrice
    })

    if (lastRegisteredPrice == null) return

    const game = await this.findGameByIdRepository.find(data.gameId)
    if (game == null) return

    const notifySteam = this.isSteamPriceLower(lastRegisteredPrice, {
      steam: currentSteamPrice,
      nuuvem: currentNuuvemPrice,
      greenManGaming: currentGMGPrice
    })

    if (notifySteam) {
      await this.notificationQueue.add({
        currentPrice: currentSteamPrice,
        oldPrice: lastRegisteredPrice.steam_price,
        gameTitle: game.title,
        platform: 'Steam',
        gameUrl: game.steam_url
      }); return
    }

    const notifyNuuvem = this.isNuuvemPriceLower(lastRegisteredPrice, {
      steam: currentSteamPrice,
      nuuvem: currentNuuvemPrice,
      greenManGaming: currentGMGPrice
    })

    if (notifyNuuvem) {
      await this.notificationQueue.add({
        currentPrice: currentNuuvemPrice as number,
        oldPrice: lastRegisteredPrice.nuuvem_price as number,
        gameTitle: game.title,
        platform: 'Nuuvem',
        gameUrl: game.nuuvem_url as string
      }); return
    }

    const notifyGMG = this.isGreenManGamingPriceLower(lastRegisteredPrice, {
      steam: currentSteamPrice,
      nuuvem: currentNuuvemPrice,
      greenManGaming: currentGMGPrice
    })

    if (notifyGMG) {
      await this.notificationQueue.add({
        currentPrice: currentGMGPrice as number,
        oldPrice: lastRegisteredPrice.green_man_gaming_price as number,
        gameTitle: game.title,
        platform: 'GreenManGaming',
        gameUrl: game.green_man_gaming_url as string
      })
    }
  }

  /**
   * Returns true if the current steam price is lower than all other current ans last prices.
   *
   * @param lastPrices - The last registered prices in the database.
   * @param currentPrices - Current prices.
   */
  private isSteamPriceLower (
    lastPrices: GamePrice,
    currentPrices: CurrentPrices
  ): boolean {
    // prevent endless null checks
    if (lastPrices.nuuvem_price == null) lastPrices.nuuvem_price = Infinity
    if (lastPrices.green_man_gaming_price == null) lastPrices.green_man_gaming_price = Infinity
    if (currentPrices.nuuvem == null) currentPrices.nuuvem = Infinity
    if (currentPrices.greenManGaming == null) currentPrices.greenManGaming = Infinity

    const minCurrent = Math.min(currentPrices.nuuvem, currentPrices.greenManGaming)
    const minLast = Math.min(lastPrices.nuuvem_price, lastPrices.green_man_gaming_price, lastPrices.steam_price)

    if (
      currentPrices.steam < minCurrent &&
      currentPrices.steam < minLast
    ) return true

    return false
  }

  /**
   * Returns true if the current nuuvem price is lower than all other current ans last prices.
   *
   * @param lastPrices - The last registered prices in the database.
   * @param currentPrices - Current prices.
   */
  private isNuuvemPriceLower (
    lastPrices: GamePrice,
    currentPrices: CurrentPrices
  ): boolean {
    // prevent endless null checks
    if (lastPrices.nuuvem_price == null) lastPrices.nuuvem_price = Infinity
    if (lastPrices.green_man_gaming_price == null) lastPrices.green_man_gaming_price = Infinity
    if (currentPrices.greenManGaming == null) currentPrices.greenManGaming = Infinity

    if (currentPrices.nuuvem == null) return false
    if (lastPrices.nuuvem_price == null) return false

    const minCurrent = Math.min(currentPrices.steam, currentPrices.greenManGaming)
    const minLast = Math.min(lastPrices.steam_price, lastPrices.green_man_gaming_price, lastPrices.nuuvem_price)

    if (
      currentPrices.nuuvem < minCurrent &&
      currentPrices.nuuvem < minLast
    ) return true

    return false
  }

  /**
   * Returns true if the current grren man gaming price is lower than all other current ans last prices.
   *
   * @param lastPrices - The last registered prices in the database.
   * @param currentPrices - Current prices.
   */
  private isGreenManGamingPriceLower (
    lastPrices: GamePrice,
    currentPrices: CurrentPrices
  ): boolean {
    // prevent endless null checks
    if (lastPrices.nuuvem_price == null) lastPrices.nuuvem_price = Infinity
    if (lastPrices.green_man_gaming_price == null) lastPrices.green_man_gaming_price = Infinity
    if (currentPrices.nuuvem == null) currentPrices.nuuvem = Infinity

    if (currentPrices.greenManGaming == null) return false
    if (lastPrices.green_man_gaming_price == null) return false

    const minCurrent = Math.min(currentPrices.steam, currentPrices.nuuvem)
    const minLast = Math.min(lastPrices.steam_price, lastPrices.green_man_gaming_price, lastPrices.nuuvem_price)

    if (
      currentPrices.greenManGaming < minCurrent &&
      currentPrices.greenManGaming < minLast
    ) return true

    return false
  }
}

interface CurrentPrices {
  steam: number
  nuuvem: number | null
  greenManGaming: number | null
}
