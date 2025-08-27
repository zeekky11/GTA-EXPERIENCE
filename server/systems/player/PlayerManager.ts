/**
 * Player Manager - Handles player connections, authentication, and session management
 */

import type { Database } from "../../core/database"
import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"
import { CharacterManager } from "./CharacterManager"
import type { User } from "../../types"
import bcrypt from "bcrypt"

export class PlayerManager {
  private database: Database
  private eventManager: EventManager
  private characterManager: CharacterManager
  private logger: Logger
  private connectedPlayers: Map<number, any> = new Map() // Updated to use 'any' type

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.logger = new Logger("PlayerManager")
    this.characterManager = new CharacterManager(database, eventManager)

    this.registerEvents()
  }

  private registerEvents(): void {
    this.eventManager.on("player:login", this.handlePlayerLogin.bind(this))
    this.eventManager.on("player:register", this.handlePlayerRegister.bind(this))
    this.eventManager.on("player:logout", this.handlePlayerLogout.bind(this))
    this.eventManager.on("character:select", this.handleCharacterSelect.bind(this))
  }

  public async onPlayerJoin(player: any): Promise<void> {
    // Updated to use 'any' type
    try {
      this.logger.info(`Player ${player.name} (${player.ip}) connected`)

      // Initialize player data
      player.isLoggedIn = false
      player.characterData = null
      player.adminLevel = 0

      // Add to connected players
      this.connectedPlayers.set(player.id, player)

      // Show login screen
      this.showLoginScreen(player)

      this.eventManager.emit("player:connected", player)
    } catch (error) {
      this.logger.error("Error handling player join:", error)
    }
  }

  public async onPlayerQuit(player: any, exitType: string, reason: string): Promise<void> {
    // Updated to use 'any' type
    try {
      this.logger.info(`Player ${player.name} disconnected (${exitType}: ${reason})`)

      if (player.isLoggedIn && player.characterData) {
        await this.characterManager.saveCharacterData(player)
      }

      this.connectedPlayers.delete(player.id)
      this.eventManager.emit("player:disconnected", player, exitType, reason)
    } catch (error) {
      this.logger.error("Error handling player quit:", error)
    }
  }

  public async onPlayerReady(player: any): Promise<void> {
    // Updated to use 'any' type
    try {
      this.logger.debug(`Player ${player.name} is ready`)

      // Set initial spawn position (login area)
      player.position = { x: -1037.8, y: -2738.5, z: 20.1 }
      player.dimension = player.id + 1000 // Unique dimension for login

      this.eventManager.emit("player:ready", player)
    } catch (error) {
      this.logger.error("Error handling player ready:", error)
    }
  }

  private showLoginScreen(player: any): void {
    // Updated to use 'any' type
    // In a real RageMP environment, this would show a CEF browser
    player.call("client:showLoginScreen")
  }

  private async handlePlayerLogin(player: any, username: string, password: string): Promise<void> {
    // Updated to use 'any' type
    try {
      const user = await this.getUserByUsername(username)

      if (!user) {
        player.call("client:loginResult", { success: false, message: "Invalid username or password" })
        return
      }

      if (user.banned) {
        player.call("client:loginResult", {
          success: false,
          message: `You are banned. Reason: ${user.ban_reason || "No reason provided"}`,
        })
        return
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      if (!passwordMatch) {
        player.call("client:loginResult", { success: false, message: "Invalid username or password" })
        return
      }

      // Update last login
      await this.database.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])

      player.isLoggedIn = true
      player.userData = user
      player.adminLevel = user.admin_level

      this.logger.success(`Player ${player.name} logged in as ${username}`)

      // Show character selection
      await this.showCharacterSelection(player)

      player.call("client:loginResult", { success: true, message: "Login successful" })
    } catch (error) {
      this.logger.error("Error handling player login:", error)
      player.call("client:loginResult", { success: false, message: "Server error occurred" })
    }
  }

  private async handlePlayerRegister(player: any, username: string, password: string, email: string): Promise<void> {
    // Updated to use 'any' type
    try {
      // Validation
      if (username.length < 3 || username.length > 20) {
        player.call("client:registerResult", { success: false, message: "Username must be 3-20 characters" })
        return
      }

      if (password.length < 6) {
        player.call("client:registerResult", { success: false, message: "Password must be at least 6 characters" })
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        player.call("client:registerResult", { success: false, message: "Invalid email format" })
        return
      }

      // Check if username exists
      const existingUser = await this.getUserByUsername(username)
      if (existingUser) {
        player.call("client:registerResult", { success: false, message: "Username already exists" })
        return
      }

      // Check if email exists
      const existingEmail = await this.database.query("SELECT id FROM users WHERE email = ?", [email])
      if (existingEmail.length > 0) {
        player.call("client:registerResult", { success: false, message: "Email already registered" })
        return
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const result = await this.database.query("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)", [
        username,
        passwordHash,
        email,
      ])

      this.logger.success(`New user registered: ${username} (${email})`)
      player.call("client:registerResult", { success: true, message: "Registration successful! You can now login." })
    } catch (error) {
      this.logger.error("Error handling player registration:", error)
      player.call("client:registerResult", { success: false, message: "Server error occurred" })
    }
  }

  private async handlePlayerLogout(player: any): Promise<void> {
    // Updated to use 'any' type
    try {
      if (player.characterData) {
        await this.characterManager.saveCharacterData(player)
      }

      player.isLoggedIn = false
      player.userData = null
      player.characterData = null
      player.adminLevel = 0

      // Return to login screen
      player.dimension = player.id + 1000
      player.position = { x: -1037.8, y: -2738.5, z: 20.1 }

      this.showLoginScreen(player)
      this.logger.info(`Player ${player.name} logged out`)
    } catch (error) {
      this.logger.error("Error handling player logout:", error)
    }
  }

  private async handleCharacterSelect(player: any, characterId: number): Promise<void> {
    // Updated to use 'any' type
    try {
      const character = await this.characterManager.getCharacterById(characterId)

      if (!character || character.user_id !== player.userData.id) {
        player.call("client:characterSelectResult", { success: false, message: "Invalid character" })
        return
      }

      await this.characterManager.loadCharacterData(player, character)

      // Spawn player in game world
      player.dimension = character.dimension
      player.position = {
        x: character.position_x,
        y: character.position_y,
        z: character.position_z,
      }
      player.health = character.health
      player.armour = character.armor

      this.logger.success(`Player ${player.name} selected character: ${character.first_name} ${character.last_name}`)
      player.call("client:characterSelectResult", { success: true, character })

      this.eventManager.emit("character:spawned", player, character)
    } catch (error) {
      this.logger.error("Error handling character selection:", error)
      player.call("client:characterSelectResult", { success: false, message: "Server error occurred" })
    }
  }

  private async showCharacterSelection(player: any): Promise<void> {
    // Updated to use 'any' type
    const characters = await this.characterManager.getCharactersByUserId(player.userData.id)
    player.call("client:showCharacterSelection", { characters })
  }

  private async getUserByUsername(username: string): Promise<User | null> {
    const results = await this.database.query("SELECT * FROM users WHERE username = ?", [username])

    return results.length > 0 ? results[0] : null
  }

  public getConnectedPlayers(): Map<number, any> {
    // Updated to use 'any' type
    return this.connectedPlayers
  }

  public getPlayerById(playerId: number): any | null {
    // Updated to use 'any' type
    return this.connectedPlayers.get(playerId) || null
  }

  public getPlayerByName(playerName: string): any | null {
    // Updated to use 'any' type
    for (const player of this.connectedPlayers.values()) {
      if (player.name === playerName) {
        return player
      }
    }
    return null
  }

  public async kickPlayer(player: any, reason = "No reason provided"): Promise<void> {
    // Updated to use 'any' type
    this.logger.info(`Kicking player ${player.name}: ${reason}`)
    player.kick(reason)
  }

  public async banPlayer(player: any, reason = "No reason provided", adminName = "System"): Promise<void> {
    // Updated to use 'any' type
    try {
      if (player.userData) {
        await this.database.query("UPDATE users SET banned = TRUE, ban_reason = ? WHERE id = ?", [
          reason,
          player.userData.id,
        ])
      }

      this.logger.info(`Player ${player.name} banned by ${adminName}: ${reason}`)
      player.kick(`You have been banned. Reason: ${reason}`)
    } catch (error) {
      this.logger.error("Error banning player:", error)
    }
  }
}
