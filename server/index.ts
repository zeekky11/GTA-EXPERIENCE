/**
 * American Roleplay Gamemode - Main Server Entry Point
 * Heavy Text-Based Roleplay Server for RageMP
 */

import { Database } from "./core/database"
import { PlayerManager } from "./systems/player/PlayerManager"
import { JobManager } from "./systems/jobs/JobManager"
import { FactionManager } from "./systems/factions/FactionManager"
import { PropertyManager } from "./systems/properties/PropertyManager"
import { VehicleManager } from "./systems/vehicles/VehicleManager"
import { AdminManager } from "./systems/admin/AdminManager"
import { ChatManager } from "./systems/chat/ChatManager"
import { EventManager } from "./core/EventManager"
import { Logger } from "./utils/Logger"
import { mp } from "rage-server" // Declare the mp variable

class AmericanRoleplayServer {
  private database: Database
  private playerManager: PlayerManager
  private jobManager: JobManager
  private factionManager: FactionManager
  private propertyManager: PropertyManager
  private vehicleManager: VehicleManager
  private adminManager: AdminManager
  private chatManager: ChatManager
  private eventManager: EventManager
  private logger: Logger

  constructor() {
    this.logger = new Logger("AmericanRP")
    this.logger.info("Initializing American Roleplay Server...")

    this.initializeCore()
    this.initializeSystems()
    this.registerEvents()

    this.logger.success("American Roleplay Server initialized successfully!")
  }

  private initializeCore(): void {
    this.database = new Database()
    this.eventManager = new EventManager()
  }

  private initializeSystems(): void {
    this.playerManager = new PlayerManager(this.database, this.eventManager)
    this.jobManager = new JobManager(this.database, this.eventManager)
    this.factionManager = new FactionManager(this.database, this.eventManager)
    this.propertyManager = new PropertyManager(this.database, this.eventManager)
    this.vehicleManager = new VehicleManager(this.database, this.eventManager)
    this.adminManager = new AdminManager(this.database, this.eventManager)
    this.chatManager = new ChatManager(this.eventManager)
  }

  private registerEvents(): void {
    // Player connection events
    mp.events.add("playerJoin", (player: PlayerMp) => {
      this.playerManager.onPlayerJoin(player)
    })

    mp.events.add("playerQuit", (player: PlayerMp, exitType: string, reason: string) => {
      this.playerManager.onPlayerQuit(player, exitType, reason)
    })

    mp.events.add("playerReady", (player: PlayerMp) => {
      this.playerManager.onPlayerReady(player)
    })

    // Chat events
    mp.events.add("playerChat", (player: PlayerMp, message: string) => {
      this.chatManager.handlePlayerChat(player, message)
    })

    // Command events
    mp.events.add("playerCommand", (player: PlayerMp, command: string) => {
      this.handlePlayerCommand(player, command)
    })
  }

  private handlePlayerCommand(player: PlayerMp, fullCommand: string): void {
    const args = fullCommand.split(" ")
    const command = args[0].toLowerCase()
    const params = args.slice(1)

    // Route commands to appropriate managers
    if (this.adminManager.isAdminCommand(command)) {
      this.adminManager.handleCommand(player, command, params)
    } else if (this.jobManager.isJobCommand(command)) {
      this.jobManager.handleCommand(player, command, params)
    } else if (this.factionManager.isFactionCommand(command)) {
      this.factionManager.handleCommand(player, command, params)
    } else if (this.propertyManager.isPropertyCommand(command)) {
      this.propertyManager.handleCommand(player, command, params)
    } else if (this.vehicleManager.isVehicleCommand(command)) {
      this.vehicleManager.handleCommand(player, command, params)
    } else {
      this.chatManager.sendErrorMessage(player, "Unknown command. Use /help for available commands.")
    }
  }

  public getPlayerManager(): PlayerManager {
    return this.playerManager
  }
  public getJobManager(): JobManager {
    return this.jobManager
  }
  public getFactionManager(): FactionManager {
    return this.factionManager
  }
  public getPropertyManager(): PropertyManager {
    return this.propertyManager
  }
  public getVehicleManager(): VehicleManager {
    return this.vehicleManager
  }
  public getAdminManager(): AdminManager {
    return this.adminManager
  }
  public getChatManager(): ChatManager {
    return this.chatManager
  }
}

// Initialize the server
const server = new AmericanRoleplayServer()

// Export for global access
global.AmericanRP = server

// Type declarations for RageMP
declare global {
  var AmericanRP: AmericanRoleplayServer

  interface PlayerMp {
    characterData?: any
    isLoggedIn?: boolean
    adminLevel?: number
    jobData?: any
    factionData?: any
  }
}
