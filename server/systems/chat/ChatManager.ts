/**
 * Chat Manager - Handles all chat functionality including local, global, faction, and OOC chat
 */

import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"
import type { ChatMessage } from "../../types"

export class ChatManager {
  private eventManager: EventManager
  private logger: Logger
  private chatHistory: ChatMessage[] = []
  private maxHistorySize = 1000

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.logger = new Logger("ChatManager")

    this.registerEvents()
  }

  private registerEvents(): void {
    this.eventManager.on("chat:local", this.handleLocalChat.bind(this))
    this.eventManager.on("chat:global", this.handleGlobalChat.bind(this))
    this.eventManager.on("chat:faction", this.handleFactionChat.bind(this))
    this.eventManager.on("chat:job", this.handleJobChat.bind(this))
    this.eventManager.on("chat:admin", this.handleAdminChat.bind(this))
    this.eventManager.on("chat:ooc", this.handleOOCChat.bind(this))
  }

  public handlePlayerChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!player.isLoggedIn || !player.characterData) {
      this.sendErrorMessage(player, "You must be logged in to chat.")
      return
    }

    // Check for commands
    if (message.startsWith("/")) {
      return // Commands are handled elsewhere
    }

    // Check for OOC chat
    if (message.startsWith("((") && message.endsWith("))")) {
      this.handleOOCChat(player, message.slice(2, -2))
      return
    }

    // Check for global chat
    if (message.startsWith("!")) {
      this.handleGlobalChat(player, message.slice(1))
      return
    }

    // Default to local chat
    this.handleLocalChat(player, message)
  }

  private handleLocalChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "local",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    // Send to nearby players (within 20 units)
    const nearbyPlayers = this.getNearbyPlayers(player, 20)
    const formattedMessage = `${player.characterData.first_name} ${player.characterData.last_name} says: ${message}`

    nearbyPlayers.forEach((nearbyPlayer) => {
      nearbyPlayer.call("client:receiveChat", {
        type: "local",
        message: formattedMessage,
        color: "#FFFFFF",
      })
    })

    this.logger.debug(`Local chat from ${player.characterData.first_name}: ${message}`)
  }

  private handleGlobalChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    // Check if player has global chat permission (admin level 1+)
    if (player.adminLevel < 1) {
      this.sendErrorMessage(player, "You do not have permission to use global chat.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "global",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    const formattedMessage = `[GLOBAL] ${player.characterData.first_name} ${player.characterData.last_name}: ${message}`

    // Send to all players
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((connectedPlayer) => {
        if (connectedPlayer.isLoggedIn && connectedPlayer.characterData) {
          connectedPlayer.call("client:receiveChat", {
            type: "global",
            message: formattedMessage,
            color: "#00FF00",
          })
        }
      })

    this.logger.info(`Global chat from ${player.characterData.first_name}: ${message}`)
  }

  private handleFactionChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    if (!player.factionData) {
      this.sendErrorMessage(player, "You are not in a faction.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "faction",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    const formattedMessage = `[${player.factionData.tag}] ${player.characterData.first_name} ${player.characterData.last_name}: ${message}`

    // Send to faction members
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((connectedPlayer) => {
        if (
          connectedPlayer.isLoggedIn &&
          connectedPlayer.characterData &&
          connectedPlayer.factionData &&
          connectedPlayer.factionData.id === player.factionData.id
        ) {
          connectedPlayer.call("client:receiveChat", {
            type: "faction",
            message: formattedMessage,
            color: "#FFD700",
          })
        }
      })

    this.logger.debug(`Faction chat from ${player.characterData.first_name}: ${message}`)
  }

  private handleJobChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    if (!player.jobData) {
      this.sendErrorMessage(player, "You do not have a job.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "job",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    const formattedMessage = `[${player.jobData.name}] ${player.characterData.first_name} ${player.characterData.last_name}: ${message}`

    // Send to job colleagues
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((connectedPlayer) => {
        if (
          connectedPlayer.isLoggedIn &&
          connectedPlayer.characterData &&
          connectedPlayer.jobData &&
          connectedPlayer.jobData.id === player.jobData.id
        ) {
          connectedPlayer.call("client:receiveChat", {
            type: "job",
            message: formattedMessage,
            color: "#00BFFF",
          })
        }
      })

    this.logger.debug(`Job chat from ${player.characterData.first_name}: ${message}`)
  }

  private handleAdminChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    if (player.adminLevel < 1) {
      this.sendErrorMessage(player, "You do not have admin permissions.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "admin",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    const formattedMessage = `[ADMIN] ${player.name}: ${message}`

    // Send to all admins
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((connectedPlayer) => {
        if (connectedPlayer.adminLevel >= 1) {
          connectedPlayer.call("client:receiveChat", {
            type: "admin",
            message: formattedMessage,
            color: "#FF0000",
          })
        }
      })

    this.logger.info(`Admin chat from ${player.name}: ${message}`)
  }

  private handleOOCChat(player: any, message: string): void {
    // Updated to use 'any' type
    if (!this.validateMessage(message)) {
      this.sendErrorMessage(player, "Invalid message.")
      return
    }

    const chatMessage: ChatMessage = {
      player,
      message,
      type: "ooc",
      timestamp: new Date(),
    }

    this.addToHistory(chatMessage)

    // Send to nearby players (within 30 units)
    const nearbyPlayers = this.getNearbyPlayers(player, 30)
    const formattedMessage = `(( ${player.name}: ${message} ))`

    nearbyPlayers.forEach((nearbyPlayer) => {
      nearbyPlayer.call("client:receiveChat", {
        type: "ooc",
        message: formattedMessage,
        color: "#C0C0C0",
      })
    })

    this.logger.debug(`OOC chat from ${player.name}: ${message}`)
  }

  private validateMessage(message: string): boolean {
    if (!message || typeof message !== "string") return false
    if (message.length < 1 || message.length > 200) return false
    if (message.trim().length === 0) return false

    // Check for spam (repeated characters)
    const repeatedChar = /(.)\1{10,}/
    if (repeatedChar.test(message)) return false

    return true
  }

  private getNearbyPlayers(player: any, distance: number): any[] {
    // Updated to use 'any' type
    const nearbyPlayers: any[] = []

    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((connectedPlayer) => {
        if (connectedPlayer.id === player.id) {
          nearbyPlayers.push(connectedPlayer) // Include the sender
          return
        }

        if (!connectedPlayer.isLoggedIn || !connectedPlayer.characterData) return
        if (connectedPlayer.dimension !== player.dimension) return

        const dist = this.getDistance(player.position, connectedPlayer.position)
        if (dist <= distance) {
          nearbyPlayers.push(connectedPlayer)
        }
      })

    return nearbyPlayers
  }

  private getDistance(pos1: any, pos2: any): number {
    if (!pos1 || !pos2) return Number.POSITIVE_INFINITY

    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z

    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private addToHistory(message: ChatMessage): void {
    this.chatHistory.push(message)

    if (this.chatHistory.length > this.maxHistorySize) {
      this.chatHistory.shift()
    }
  }

  public sendMessage(player: any, message: string, color = "#FFFFFF"): void {
    // Updated to use 'any' type
    player.call("client:receiveChat", {
      type: "system",
      message,
      color,
    })
  }

  public sendErrorMessage(player: any, message: string): void {
    // Updated to use 'any' type
    this.sendMessage(player, `[ERROR] ${message}`, "#FF0000")
  }

  public sendSuccessMessage(player: any, message: string): void {
    // Updated to use 'any' type
    this.sendMessage(player, `[SUCCESS] ${message}`, "#00FF00")
  }

  public sendInfoMessage(player: any, message: string): void {
    // Updated to use 'any' type
    this.sendMessage(player, `[INFO] ${message}`, "#00BFFF")
  }

  public getChatHistory(type?: string): ChatMessage[] {
    if (type) {
      return this.chatHistory.filter((msg) => msg.type === type)
    }
    return this.chatHistory
  }
}
