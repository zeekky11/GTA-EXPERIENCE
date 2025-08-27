/**
 * Faction Manager - Handles all faction-related functionality including creation, management, and warfare
 */

import type { Database } from "../../core/database"
import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"
import type { Faction } from "../../types"

export interface FactionRank {
  id: number
  faction_id: number
  name: string
  level: number
  permissions: string[]
  salary_bonus: number
}

export interface FactionInvite {
  id: number
  faction_id: number
  character_id: number
  invited_by: number
  created_at: Date
  expires_at: Date
}

export interface FactionWar {
  id: number
  faction1_id: number
  faction2_id: number
  started_by: number
  start_date: Date
  end_date?: Date
  status: "active" | "ended"
  reason: string
}

export class FactionManager {
  private database: Database
  private eventManager: EventManager
  private logger: Logger
  private factions: Map<number, Faction> = new Map()
  private factionRanks: Map<number, FactionRank[]> = new Map()
  private activeWars: Map<number, FactionWar> = new Map()

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.logger = new Logger("FactionManager")

    this.registerEvents()
    this.loadFactions()
    this.loadFactionRanks()
    this.loadActiveWars()
  }

  private registerEvents(): void {
    this.eventManager.on("faction:create", this.handleFactionCreate.bind(this))
    this.eventManager.on("faction:invite", this.handleFactionInvite.bind(this))
    this.eventManager.on("faction:accept", this.handleFactionAccept.bind(this))
    this.eventManager.on("faction:kick", this.handleFactionKick.bind(this))
    this.eventManager.on("faction:promote", this.handleFactionPromote.bind(this))
    this.eventManager.on("faction:demote", this.handleFactionDemote.bind(this))
    this.eventManager.on("faction:leave", this.handleFactionLeave.bind(this))
    this.eventManager.on("faction:war", this.handleFactionWar.bind(this))
  }

  private async loadFactions(): Promise<void> {
    try {
      const factions = await this.database.query("SELECT * FROM factions ORDER BY name")

      for (const faction of factions) {
        this.factions.set(faction.id, faction)
      }

      this.logger.success(`Loaded ${factions.length} factions`)
    } catch (error) {
      this.logger.error("Error loading factions:", error)
    }
  }

  private async loadFactionRanks(): Promise<void> {
    try {
      // Create faction ranks table if it doesn't exist
      await this.database.query(`
        CREATE TABLE IF NOT EXISTS faction_ranks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          faction_id INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          level INT NOT NULL,
          permissions JSON,
          salary_bonus DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE
        )
      `)

      const ranks = await this.database.query("SELECT * FROM faction_ranks ORDER BY faction_id, level")

      for (const rank of ranks) {
        if (!this.factionRanks.has(rank.faction_id)) {
          this.factionRanks.set(rank.faction_id, [])
        }

        rank.permissions = JSON.parse(rank.permissions || "[]")
        this.factionRanks.get(rank.faction_id)!.push(rank)
      }

      this.logger.success(`Loaded faction ranks for ${this.factionRanks.size} factions`)
    } catch (error) {
      this.logger.error("Error loading faction ranks:", error)
    }
  }

  private async loadActiveWars(): Promise<void> {
    try {
      // Create faction wars table if it doesn't exist
      await this.database.query(`
        CREATE TABLE IF NOT EXISTS faction_wars (
          id INT AUTO_INCREMENT PRIMARY KEY,
          faction1_id INT NOT NULL,
          faction2_id INT NOT NULL,
          started_by INT NOT NULL,
          start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMP NULL,
          status ENUM('active', 'ended') DEFAULT 'active',
          reason TEXT,
          FOREIGN KEY (faction1_id) REFERENCES factions(id) ON DELETE CASCADE,
          FOREIGN KEY (faction2_id) REFERENCES factions(id) ON DELETE CASCADE,
          FOREIGN KEY (started_by) REFERENCES characters(id) ON DELETE CASCADE
        )
      `)

      const wars = await this.database.query("SELECT * FROM faction_wars WHERE status = 'active'")

      for (const war of wars) {
        this.activeWars.set(war.id, war)
      }

      this.logger.info(`Loaded ${wars.length} active faction wars`)
    } catch (error) {
      this.logger.error("Error loading faction wars:", error)
    }
  }

  private async handleFactionCreate(
    player: any,
    factionData: {
      name: string
      tag: string
      type: string
    },
  ): Promise<void> {
    try {
      if (!player.characterData) {
        this.sendFactionMessage(player, "You must have a character to create a faction.", "error")
        return
      }

      if (player.characterData.faction_id) {
        this.sendFactionMessage(player, "You are already in a faction.", "error")
        return
      }

      // Validation
      if (!this.validateFactionData(factionData)) {
        this.sendFactionMessage(player, "Invalid faction data provided.", "error")
        return
      }

      // Check if name/tag already exists
      const existingFaction = await this.database.query("SELECT id FROM factions WHERE name = ? OR tag = ?", [
        factionData.name,
        factionData.tag,
      ])

      if (existingFaction.length > 0) {
        this.sendFactionMessage(player, "Faction name or tag already exists.", "error")
        return
      }

      // Create faction
      const result = await this.database.query(
        `
        INSERT INTO factions (name, tag, type, leader_id, spawn_x, spawn_y, spawn_z) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          factionData.name,
          factionData.tag,
          factionData.type,
          player.characterData.id,
          player.position?.x || 0,
          player.position?.y || 0,
          player.position?.z || 0,
        ],
      )

      const factionId = result.insertId
      const newFaction = await this.getFactionById(factionId)

      if (newFaction) {
        this.factions.set(factionId, newFaction)

        // Create default ranks
        await this.createDefaultRanks(factionId, factionData.type)

        // Add creator to faction as leader
        await this.database.query(
          "UPDATE characters SET faction_id = ?, faction_rank = ? WHERE id = ?",
          [factionId, 10, player.characterData.id], // Rank 10 = Leader
        )

        player.characterData.faction_id = factionId
        player.characterData.faction_rank = 10
        player.factionData = newFaction

        this.sendFactionMessage(player, `Faction "${factionData.name}" created successfully!`, "success")
        this.logger.success(`Faction created: ${factionData.name} by ${player.characterData.first_name}`)

        this.eventManager.emit("faction:created", player, newFaction)
      }
    } catch (error) {
      this.logger.error("Error creating faction:", error)
      this.sendFactionMessage(player, "An error occurred while creating the faction.", "error")
    }
  }

  private async createDefaultRanks(factionId: number, factionType: string): Promise<void> {
    const defaultRanks = this.getDefaultRanks(factionType)

    for (const rank of defaultRanks) {
      await this.database.query(
        `
        INSERT INTO faction_ranks (faction_id, name, level, permissions, salary_bonus) 
        VALUES (?, ?, ?, ?, ?)
      `,
        [factionId, rank.name, rank.level, JSON.stringify(rank.permissions), rank.salary_bonus],
      )
    }

    // Reload ranks for this faction
    await this.loadFactionRanks()
  }

  private getDefaultRanks(factionType: string): any[] {
    const baseRanks = [
      {
        name: "Leader",
        level: 10,
        permissions: ["invite", "kick", "promote", "demote", "war", "manage_money"],
        salary_bonus: 500,
      },
      {
        name: "Co-Leader",
        level: 9,
        permissions: ["invite", "kick", "promote", "demote", "manage_money"],
        salary_bonus: 300,
      },
      { name: "Captain", level: 8, permissions: ["invite", "kick", "promote"], salary_bonus: 200 },
      { name: "Lieutenant", level: 7, permissions: ["invite", "kick"], salary_bonus: 150 },
      { name: "Sergeant", level: 6, permissions: ["invite"], salary_bonus: 100 },
      { name: "Member", level: 5, permissions: [], salary_bonus: 50 },
      { name: "Associate", level: 4, permissions: [], salary_bonus: 25 },
      { name: "Prospect", level: 3, permissions: [], salary_bonus: 0 },
      { name: "Recruit", level: 2, permissions: [], salary_bonus: 0 },
      { name: "Initiate", level: 1, permissions: [], salary_bonus: 0 },
    ]

    // Customize ranks based on faction type
    switch (factionType) {
      case "Gang":
        baseRanks[0].name = "Boss"
        baseRanks[1].name = "Underboss"
        baseRanks[2].name = "Lieutenant"
        break
      case "Mafia":
        baseRanks[0].name = "Don"
        baseRanks[1].name = "Underboss"
        baseRanks[2].name = "Consigliere"
        baseRanks[3].name = "Capo"
        baseRanks[4].name = "Soldier"
        break
      case "Government":
        baseRanks[0].name = "Director"
        baseRanks[1].name = "Deputy Director"
        baseRanks[2].name = "Chief"
        baseRanks[3].name = "Commander"
        baseRanks[4].name = "Supervisor"
        break
      case "Business":
        baseRanks[0].name = "CEO"
        baseRanks[1].name = "Vice President"
        baseRanks[2].name = "Manager"
        baseRanks[3].name = "Supervisor"
        baseRanks[4].name = "Employee"
        break
    }

    return baseRanks
  }

  private async handleFactionInvite(player: any, targetName: string): Promise<void> {
    try {
      if (!player.factionData || !this.hasPermission(player, "invite")) {
        this.sendFactionMessage(player, "You don't have permission to invite members.", "error")
        return
      }

      const targetPlayer = global.AmericanRP.getPlayerManager().getPlayerByName(targetName)
      if (!targetPlayer || !targetPlayer.characterData) {
        this.sendFactionMessage(player, "Player not found or not logged in.", "error")
        return
      }

      if (targetPlayer.characterData.faction_id) {
        this.sendFactionMessage(player, "Player is already in a faction.", "error")
        return
      }

      // Check faction member limit
      const memberCount = await this.getFactionMemberCount(player.factionData.id)
      if (memberCount >= player.factionData.max_members) {
        this.sendFactionMessage(player, "Faction has reached maximum member limit.", "error")
        return
      }

      // Create invitation
      await this.database.query(
        `
        INSERT INTO faction_invites (faction_id, character_id, invited_by, expires_at) 
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
      `,
        [player.factionData.id, targetPlayer.characterData.id, player.characterData.id],
      )

      this.sendFactionMessage(
        player,
        `You invited ${targetPlayer.characterData.first_name} ${targetPlayer.characterData.last_name} to join ${player.factionData.name}.`,
        "success",
      )

      this.sendFactionMessage(
        targetPlayer,
        `You have been invited to join ${player.factionData.name} by ${player.characterData.first_name} ${player.characterData.last_name}. Use /faction accept to join.`,
        "info",
      )

      this.logger.info(
        `Faction invite: ${player.characterData.first_name} invited ${targetPlayer.characterData.first_name} to ${player.factionData.name}`,
      )
    } catch (error) {
      this.logger.error("Error handling faction invite:", error)
      this.sendFactionMessage(player, "An error occurred while sending the invitation.", "error")
    }
  }

  private async handleFactionAccept(player: any): Promise<void> {
    try {
      if (!player.characterData) {
        this.sendFactionMessage(player, "You must have a character to accept invitations.", "error")
        return
      }

      if (player.characterData.faction_id) {
        this.sendFactionMessage(player, "You are already in a faction.", "error")
        return
      }

      // Find pending invitation
      const invites = await this.database.query(
        `
        SELECT fi.*, f.name as faction_name 
        FROM faction_invites fi 
        JOIN factions f ON fi.faction_id = f.id 
        WHERE fi.character_id = ? AND fi.expires_at > NOW()
        ORDER BY fi.created_at DESC 
        LIMIT 1
      `,
        [player.characterData.id],
      )

      if (invites.length === 0) {
        this.sendFactionMessage(player, "You have no pending faction invitations.", "error")
        return
      }

      const invite = invites[0]
      const faction = this.factions.get(invite.faction_id)

      if (!faction) {
        this.sendFactionMessage(player, "Faction no longer exists.", "error")
        return
      }

      // Add player to faction
      await this.database.query("UPDATE characters SET faction_id = ?, faction_rank = 1 WHERE id = ?", [
        faction.id,
        player.characterData.id,
      ])

      // Remove invitation
      await this.database.query("DELETE FROM faction_invites WHERE id = ?", [invite.id])

      player.characterData.faction_id = faction.id
      player.characterData.faction_rank = 1
      player.factionData = faction

      this.sendFactionMessage(player, `You have joined ${faction.name}!`, "success")

      // Notify faction members
      this.notifyFactionMembers(
        faction.id,
        `${player.characterData.first_name} ${player.characterData.last_name} has joined the faction.`,
        player.characterData.id,
      )

      this.logger.success(`${player.characterData.first_name} joined faction: ${faction.name}`)
    } catch (error) {
      this.logger.error("Error handling faction accept:", error)
      this.sendFactionMessage(player, "An error occurred while joining the faction.", "error")
    }
  }

  private async handleFactionKick(player: any, targetName: string): Promise<void> {
    try {
      if (!player.factionData || !this.hasPermission(player, "kick")) {
        this.sendFactionMessage(player, "You don't have permission to kick members.", "error")
        return
      }

      const targetPlayer = global.AmericanRP.getPlayerManager().getPlayerByName(targetName)
      if (!targetPlayer || !targetPlayer.characterData) {
        this.sendFactionMessage(player, "Player not found or not logged in.", "error")
        return
      }

      if (targetPlayer.characterData.faction_id !== player.factionData.id) {
        this.sendFactionMessage(player, "Player is not in your faction.", "error")
        return
      }

      if (targetPlayer.characterData.faction_rank >= player.characterData.faction_rank) {
        this.sendFactionMessage(player, "You cannot kick someone of equal or higher rank.", "error")
        return
      }

      // Remove from faction
      await this.database.query("UPDATE characters SET faction_id = NULL, faction_rank = 0 WHERE id = ?", [
        targetPlayer.characterData.id,
      ])

      targetPlayer.characterData.faction_id = null
      targetPlayer.characterData.faction_rank = 0
      targetPlayer.factionData = null

      this.sendFactionMessage(
        player,
        `You kicked ${targetPlayer.characterData.first_name} ${targetPlayer.characterData.last_name} from the faction.`,
        "success",
      )

      this.sendFactionMessage(
        targetPlayer,
        `You have been kicked from ${player.factionData.name} by ${player.characterData.first_name} ${player.characterData.last_name}.`,
        "error",
      )

      this.logger.info(
        `Faction kick: ${player.characterData.first_name} kicked ${targetPlayer.characterData.first_name} from ${player.factionData.name}`,
      )
    } catch (error) {
      this.logger.error("Error handling faction kick:", error)
      this.sendFactionMessage(player, "An error occurred while kicking the member.", "error")
    }
  }

  private async handleFactionWar(player: any, targetFactionName: string, reason: string): Promise<void> {
    try {
      if (!player.factionData || !this.hasPermission(player, "war")) {
        this.sendFactionMessage(player, "You don't have permission to declare war.", "error")
        return
      }

      const targetFaction = Array.from(this.factions.values()).find(
        (f) => f.name.toLowerCase() === targetFactionName.toLowerCase(),
      )

      if (!targetFaction) {
        this.sendFactionMessage(player, "Faction not found.", "error")
        return
      }

      if (targetFaction.id === player.factionData.id) {
        this.sendFactionMessage(player, "You cannot declare war on your own faction.", "error")
        return
      }

      // Check if war already exists
      const existingWar = Array.from(this.activeWars.values()).find(
        (war) =>
          (war.faction1_id === player.factionData.id && war.faction2_id === targetFaction.id) ||
          (war.faction1_id === targetFaction.id && war.faction2_id === player.factionData.id),
      )

      if (existingWar) {
        this.sendFactionMessage(player, "A war already exists between these factions.", "error")
        return
      }

      // Create war
      const result = await this.database.query(
        `
        INSERT INTO faction_wars (faction1_id, faction2_id, started_by, reason) 
        VALUES (?, ?, ?, ?)
      `,
        [player.factionData.id, targetFaction.id, player.characterData.id, reason],
      )

      const warId = result.insertId
      const war: FactionWar = {
        id: warId,
        faction1_id: player.factionData.id,
        faction2_id: targetFaction.id,
        started_by: player.characterData.id,
        start_date: new Date(),
        status: "active",
        reason,
      }

      this.activeWars.set(warId, war)

      // Notify both factions
      this.notifyFactionMembers(player.factionData.id, `War declared against ${targetFaction.name}! Reason: ${reason}`)

      this.notifyFactionMembers(
        targetFaction.id,
        `${player.factionData.name} has declared war on your faction! Reason: ${reason}`,
      )

      this.logger.info(`Faction war declared: ${player.factionData.name} vs ${targetFaction.name}`)
    } catch (error) {
      this.logger.error("Error handling faction war:", error)
      this.sendFactionMessage(player, "An error occurred while declaring war.", "error")
    }
  }

  private validateFactionData(data: any): boolean {
    if (!data.name || typeof data.name !== "string" || data.name.length < 3 || data.name.length > 50) {
      return false
    }

    if (!data.tag || typeof data.tag !== "string" || data.tag.length < 2 || data.tag.length > 6) {
      return false
    }

    const validTypes = ["Gang", "Mafia", "Government", "Business", "Other"]
    if (!data.type || !validTypes.includes(data.type)) {
      return false
    }

    return true
  }

  private hasPermission(player: any, permission: string): boolean {
    if (!player.factionData || !player.characterData.faction_rank) return false

    const ranks = this.factionRanks.get(player.factionData.id)
    if (!ranks) return false

    const playerRank = ranks.find((r) => r.level === player.characterData.faction_rank)
    if (!playerRank) return false

    return playerRank.permissions.includes(permission)
  }

  private async getFactionMemberCount(factionId: number): Promise<number> {
    try {
      const result = await this.database.query("SELECT COUNT(*) as count FROM characters WHERE faction_id = ?", [
        factionId,
      ])
      return result[0].count
    } catch (error) {
      this.logger.error("Error getting faction member count:", error)
      return 0
    }
  }

  private async getFactionById(factionId: number): Promise<Faction | null> {
    try {
      const results = await this.database.query("SELECT * FROM factions WHERE id = ?", [factionId])
      return results.length > 0 ? results[0] : null
    } catch (error) {
      this.logger.error("Error getting faction by ID:", error)
      return null
    }
  }

  private notifyFactionMembers(factionId: number, message: string, excludeCharacterId?: number): void {
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((player) => {
        if (
          player.isLoggedIn &&
          player.characterData &&
          player.characterData.faction_id === factionId &&
          player.characterData.id !== excludeCharacterId
        ) {
          this.sendFactionMessage(player, `[FACTION] ${message}`, "info")
        }
      })
  }

  public isFactionCommand(command: string): boolean {
    const factionCommands = [
      "faction",
      "f",
      "invite",
      "accept",
      "kick",
      "promote",
      "demote",
      "leave",
      "members",
      "ranks",
      "war",
      "endwar",
      "factioninfo",
    ]
    return factionCommands.includes(command)
  }

  public async handleCommand(player: any, command: string, args: string[]): Promise<void> {
    switch (command) {
      case "faction":
      case "f":
        if (args.length === 0) {
          await this.showFactionInfo(player)
        } else {
          await this.handleFactionSubCommand(player, args[0], args.slice(1))
        }
        break
      case "invite":
        if (args.length < 1) {
          this.sendFactionMessage(player, "Usage: /invite [player_name]", "error")
          return
        }
        await this.handleFactionInvite(player, args[0])
        break
      case "accept":
        await this.handleFactionAccept(player)
        break
      case "kick":
        if (args.length < 1) {
          this.sendFactionMessage(player, "Usage: /kick [player_name]", "error")
          return
        }
        await this.handleFactionKick(player, args[0])
        break
      case "leave":
        await this.handleFactionLeave(player)
        break
      case "members":
        await this.showFactionMembers(player)
        break
      case "war":
        if (args.length < 2) {
          this.sendFactionMessage(player, "Usage: /war [faction_name] [reason]", "error")
          return
        }
        await this.handleFactionWar(player, args[0], args.slice(1).join(" "))
        break
      default:
        this.sendFactionMessage(player, "Unknown faction command.", "error")
    }
  }

  private async handleFactionSubCommand(player: any, subCommand: string, args: string[]): Promise<void> {
    switch (subCommand) {
      case "create":
        if (args.length < 3) {
          this.sendFactionMessage(player, "Usage: /faction create [name] [tag] [type]", "error")
          return
        }
        await this.handleFactionCreate(player, {
          name: args[0],
          tag: args[1],
          type: args[2],
        })
        break
      case "info":
        await this.showFactionInfo(player)
        break
      default:
        this.sendFactionMessage(player, "Unknown faction subcommand.", "error")
    }
  }

  private async showFactionInfo(player: any): Promise<void> {
    if (!player.factionData) {
      this.sendFactionMessage(player, "You are not in a faction.", "error")
      return
    }

    const memberCount = await this.getFactionMemberCount(player.factionData.id)
    const ranks = this.factionRanks.get(player.factionData.id) || []
    const playerRank = ranks.find((r) => r.level === player.characterData.faction_rank)

    let message = `=== ${player.factionData.name} [${player.factionData.tag}] ===\n`
    message += `Type: ${player.factionData.type}\n`
    message += `Members: ${memberCount}/${player.factionData.max_members}\n`
    message += `Your Rank: ${playerRank?.name || "Unknown"} (Level ${player.characterData.faction_rank})\n`
    message += `Faction Money: $${player.factionData.money.toLocaleString()}\n`

    this.sendFactionMessage(player, message, "info")
  }

  private async showFactionMembers(player: any): Promise<void> {
    if (!player.factionData) {
      this.sendFactionMessage(player, "You are not in a faction.", "error")
      return
    }

    const members = await this.database.query(
      `
      SELECT c.first_name, c.last_name, c.faction_rank, fr.name as rank_name
      FROM characters c
      LEFT JOIN faction_ranks fr ON c.faction_id = fr.faction_id AND c.faction_rank = fr.level
      WHERE c.faction_id = ?
      ORDER BY c.faction_rank DESC, c.first_name ASC
    `,
      [player.factionData.id],
    )

    let message = `=== ${player.factionData.name} Members ===\n`

    for (const member of members) {
      const rankName = member.rank_name || `Rank ${member.faction_rank}`
      message += `${member.first_name} ${member.last_name} - ${rankName}\n`
    }

    this.sendFactionMessage(player, message, "info")
  }

  private async handleFactionLeave(player: any): Promise<void> {
    try {
      if (!player.factionData) {
        this.sendFactionMessage(player, "You are not in a faction.", "error")
        return
      }

      if (player.factionData.leader_id === player.characterData.id) {
        this.sendFactionMessage(player, "Leaders cannot leave their faction. Transfer leadership first.", "error")
        return
      }

      await this.database.query("UPDATE characters SET faction_id = NULL, faction_rank = 0 WHERE id = ?", [
        player.characterData.id,
      ])

      const factionName = player.factionData.name
      player.characterData.faction_id = null
      player.characterData.faction_rank = 0
      player.factionData = null

      this.sendFactionMessage(player, `You have left ${factionName}.`, "success")

      this.logger.info(`${player.characterData.first_name} left faction: ${factionName}`)
    } catch (error) {
      this.logger.error("Error handling faction leave:", error)
      this.sendFactionMessage(player, "An error occurred while leaving the faction.", "error")
    }
  }

  private sendFactionMessage(player: any, message: string, type: "success" | "error" | "info"): void {
    const colors = {
      success: "#00FF00",
      error: "#FF0000",
      info: "#FFD700",
    }

    global.AmericanRP.getChatManager().sendMessage(player, `[FACTION] ${message}`, colors[type])
  }
}
