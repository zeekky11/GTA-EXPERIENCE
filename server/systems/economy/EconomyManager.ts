/**
 * Economy Manager - Handles all economic transactions, banking, and financial systems
 */

import type { Database } from "../../core/database"
import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"

export class EconomyManager {
  private database: Database
  private eventManager: EventManager
  private logger: Logger
  private governmentFunds = 0
  private economyStats: Map<string, number> = new Map()

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.logger = new Logger("EconomyManager")

    this.registerEvents()
    this.loadGovernmentFunds()
    this.initializeEconomyStats()
  }

  private registerEvents(): void {
    this.eventManager.on("economy:transfer", this.handleMoneyTransfer.bind(this))
    this.eventManager.on("economy:deposit", this.handleBankDeposit.bind(this))
    this.eventManager.on("economy:withdraw", this.handleBankWithdraw.bind(this))
    this.eventManager.on("economy:fine", this.handleFine.bind(this))
    this.eventManager.on("economy:bonus", this.handleBonus.bind(this))
  }

  private async loadGovernmentFunds(): Promise<void> {
    try {
      // Create government funds table if it doesn't exist
      await this.database.query(`
        CREATE TABLE IF NOT EXISTS government_funds (
          id INT AUTO_INCREMENT PRIMARY KEY,
          amount DECIMAL(15,2) DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      const result = await this.database.query("SELECT SUM(amount) as total FROM government_funds")
      this.governmentFunds = result[0].total || 0

      this.logger.info(`Government funds loaded: $${this.governmentFunds.toLocaleString()}`)
    } catch (error) {
      this.logger.error("Error loading government funds:", error)
    }
  }

  private async initializeEconomyStats(): Promise<void> {
    try {
      // Create transactions table if it doesn't exist
      await this.database.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          from_character_id INT NULL,
          to_character_id INT NULL,
          amount DECIMAL(15,2) NOT NULL,
          type ENUM('salary', 'purchase', 'transfer', 'fine', 'bonus', 'deposit', 'withdraw') NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (from_character_id) REFERENCES characters(id) ON DELETE SET NULL,
          FOREIGN KEY (to_character_id) REFERENCES characters(id) ON DELETE SET NULL
        )
      `)

      // Load basic economy statistics
      const totalMoney = await this.database.query("SELECT SUM(money + bank_money) as total FROM characters")
      this.economyStats.set("total_money", totalMoney[0].total || 0)

      this.logger.success("Economy statistics initialized")
    } catch (error) {
      this.logger.error("Error initializing economy stats:", error)
    }
  }

  public async addMoney(
    characterId: number,
    amount: number,
    type: "cash" | "bank",
    description: string,
  ): Promise<boolean> {
    try {
      if (amount <= 0) return false

      const field = type === "cash" ? "money" : "bank_money"

      await this.database.query(`UPDATE characters SET ${field} = ${field} + ? WHERE id = ?`, [amount, characterId])

      // Record transaction
      await this.recordTransaction(null, characterId, amount, "bonus", description)

      this.logger.debug(`Added $${amount} ${type} to character ${characterId}: ${description}`)
      return true
    } catch (error) {
      this.logger.error("Error adding money:", error)
      return false
    }
  }

  public async removeMoney(
    characterId: number,
    amount: number,
    type: "cash" | "bank",
    description: string,
  ): Promise<boolean> {
    try {
      if (amount <= 0) return false

      const field = type === "cash" ? "money" : "bank_money"

      // Check if character has enough money
      const result = await this.database.query(`SELECT ${field} as balance FROM characters WHERE id = ?`, [characterId])
      if (result.length === 0 || result[0].balance < amount) {
        return false
      }

      await this.database.query(`UPDATE characters SET ${field} = ${field} - ? WHERE id = ?`, [amount, characterId])

      // Record transaction
      await this.recordTransaction(characterId, null, amount, "fine", description)

      this.logger.debug(`Removed $${amount} ${type} from character ${characterId}: ${description}`)
      return true
    } catch (error) {
      this.logger.error("Error removing money:", error)
      return false
    }
  }

  private async handleMoneyTransfer(fromPlayer: any, toPlayerName: string, amount: number): Promise<void> {
    try {
      if (!fromPlayer.characterData) {
        this.sendEconomyMessage(fromPlayer, "You must have a character to transfer money.", "error")
        return
      }

      if (amount <= 0 || amount > 1000000) {
        this.sendEconomyMessage(fromPlayer, "Invalid transfer amount.", "error")
        return
      }

      const toPlayer = global.AmericanRP.getPlayerManager().getPlayerByName(toPlayerName)
      if (!toPlayer || !toPlayer.characterData) {
        this.sendEconomyMessage(fromPlayer, "Player not found or not logged in.", "error")
        return
      }

      if (fromPlayer.characterData.money < amount) {
        this.sendEconomyMessage(fromPlayer, "You don't have enough cash.", "error")
        return
      }

      // Check distance (players must be close to transfer cash)
      const distance = this.getDistance(fromPlayer.position, toPlayer.position)
      if (distance > 5) {
        this.sendEconomyMessage(fromPlayer, "You must be closer to the player to transfer cash.", "error")
        return
      }

      // Perform transfer
      await this.database.query("UPDATE characters SET money = money - ? WHERE id = ?", [
        amount,
        fromPlayer.characterData.id,
      ])
      await this.database.query("UPDATE characters SET money = money + ? WHERE id = ?", [
        amount,
        toPlayer.characterData.id,
      ])

      // Update local data
      fromPlayer.characterData.money -= amount
      toPlayer.characterData.money += amount

      // Record transaction
      await this.recordTransaction(
        fromPlayer.characterData.id,
        toPlayer.characterData.id,
        amount,
        "transfer",
        `Cash transfer from ${fromPlayer.characterData.first_name} to ${toPlayer.characterData.first_name}`,
      )

      this.sendEconomyMessage(
        fromPlayer,
        `You transferred $${amount.toLocaleString()} to ${toPlayer.characterData.first_name} ${toPlayer.characterData.last_name}.`,
        "success",
      )
      this.sendEconomyMessage(
        toPlayer,
        `You received $${amount.toLocaleString()} from ${fromPlayer.characterData.first_name} ${fromPlayer.characterData.last_name}.`,
        "success",
      )

      this.logger.info(
        `Money transfer: ${fromPlayer.characterData.first_name} -> ${toPlayer.characterData.first_name}: $${amount}`,
      )
    } catch (error) {
      this.logger.error("Error handling money transfer:", error)
      this.sendEconomyMessage(fromPlayer, "An error occurred during the transfer.", "error")
    }
  }

  private async handleBankDeposit(player: any, amount: number): Promise<void> {
    try {
      if (!player.characterData) {
        this.sendEconomyMessage(player, "You must have a character to use banking.", "error")
        return
      }

      if (amount <= 0 || amount > player.characterData.money) {
        this.sendEconomyMessage(player, "Invalid deposit amount.", "error")
        return
      }

      await this.database.query("UPDATE characters SET money = money - ?, bank_money = bank_money + ? WHERE id = ?", [
        amount,
        amount,
        player.characterData.id,
      ])

      player.characterData.money -= amount
      player.characterData.bank_money += amount

      await this.recordTransaction(player.characterData.id, player.characterData.id, amount, "deposit", "Bank deposit")

      this.sendEconomyMessage(player, `You deposited $${amount.toLocaleString()} into your bank account.`, "success")
    } catch (error) {
      this.logger.error("Error handling bank deposit:", error)
      this.sendEconomyMessage(player, "An error occurred during the deposit.", "error")
    }
  }

  private async handleBankWithdraw(player: any, amount: number): Promise<void> {
    try {
      if (!player.characterData) {
        this.sendEconomyMessage(player, "You must have a character to use banking.", "error")
        return
      }

      if (amount <= 0 || amount > player.characterData.bank_money) {
        this.sendEconomyMessage(player, "Invalid withdrawal amount.", "error")
        return
      }

      await this.database.query("UPDATE characters SET money = money + ?, bank_money = bank_money - ? WHERE id = ?", [
        amount,
        amount,
        player.characterData.id,
      ])

      player.characterData.money += amount
      player.characterData.bank_money -= amount

      await this.recordTransaction(
        player.characterData.id,
        player.characterData.id,
        amount,
        "withdraw",
        "Bank withdrawal",
      )

      this.sendEconomyMessage(player, `You withdrew $${amount.toLocaleString()} from your bank account.`, "success")
    } catch (error) {
      this.logger.error("Error handling bank withdrawal:", error)
      this.sendEconomyMessage(player, "An error occurred during the withdrawal.", "error")
    }
  }

  private async handleFine(adminPlayer: any, targetName: string, amount: number, reason: string): Promise<void> {
    try {
      const targetPlayer = global.AmericanRP.getPlayerManager().getPlayerByName(targetName)
      if (!targetPlayer || !targetPlayer.characterData) {
        this.sendEconomyMessage(adminPlayer, "Player not found or not logged in.", "error")
        return
      }

      const success = await this.removeMoney(targetPlayer.characterData.id, amount, "bank", `Fine: ${reason}`)
      if (!success) {
        this.sendEconomyMessage(adminPlayer, "Player doesn't have enough money to pay the fine.", "error")
        return
      }

      await this.addGovernmentFunds(
        amount,
        `Fine from ${targetPlayer.characterData.first_name} ${targetPlayer.characterData.last_name}: ${reason}`,
      )

      targetPlayer.characterData.bank_money -= amount

      this.sendEconomyMessage(
        adminPlayer,
        `You fined ${targetPlayer.characterData.first_name} ${targetPlayer.characterData.last_name} $${amount.toLocaleString()}.`,
        "success",
      )
      this.sendEconomyMessage(targetPlayer, `You were fined $${amount.toLocaleString()} for: ${reason}`, "error")

      this.logger.info(`Fine issued: ${targetPlayer.characterData.first_name} fined $${amount} for ${reason}`)
    } catch (error) {
      this.logger.error("Error handling fine:", error)
      this.sendEconomyMessage(adminPlayer, "An error occurred while issuing the fine.", "error")
    }
  }

  public async addGovernmentFunds(amount: number, description: string): Promise<void> {
    try {
      await this.database.query("INSERT INTO government_funds (amount, description) VALUES (?, ?)", [
        amount,
        description,
      ])
      this.governmentFunds += amount

      this.logger.debug(`Added $${amount} to government funds: ${description}`)
    } catch (error) {
      this.logger.error("Error adding government funds:", error)
    }
  }

  private async recordTransaction(
    fromId: number | null,
    toId: number | null,
    amount: number,
    type: string,
    description: string,
  ): Promise<void> {
    try {
      await this.database.query(
        "INSERT INTO transactions (from_character_id, to_character_id, amount, type, description) VALUES (?, ?, ?, ?, ?)",
        [fromId, toId, amount, type, description],
      )
    } catch (error) {
      this.logger.error("Error recording transaction:", error)
    }
  }

  private getDistance(pos1: any, pos2: any): number {
    if (!pos1 || !pos2) return Number.POSITIVE_INFINITY

    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z

    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  public async getPlayerBalance(characterId: number): Promise<{ cash: number; bank: number } | null> {
    try {
      const result = await this.database.query("SELECT money, bank_money FROM characters WHERE id = ?", [characterId])

      if (result.length === 0) return null

      return {
        cash: result[0].money,
        bank: result[0].bank_money,
      }
    } catch (error) {
      this.logger.error("Error getting player balance:", error)
      return null
    }
  }

  public async getEconomyStats(): Promise<any> {
    try {
      const totalMoney = await this.database.query("SELECT SUM(money + bank_money) as total FROM characters")
      const totalTransactions = await this.database.query("SELECT COUNT(*) as count FROM transactions")
      const dailyTransactions = await this.database.query(
        "SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = CURDATE()",
      )

      return {
        totalMoney: totalMoney[0].total || 0,
        governmentFunds: this.governmentFunds,
        totalTransactions: totalTransactions[0].count || 0,
        dailyTransactions: dailyTransactions[0].count || 0,
      }
    } catch (error) {
      this.logger.error("Error getting economy stats:", error)
      return null
    }
  }

  private sendEconomyMessage(player: any, message: string, type: "success" | "error" | "info"): void {
    const colors = {
      success: "#00FF00",
      error: "#FF0000",
      info: "#00BFFF",
    }

    global.AmericanRP.getChatManager().sendMessage(player, `[ECONOMY] ${message}`, colors[type])
  }
}
