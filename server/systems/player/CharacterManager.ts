/**
 * Character Manager - Handles character creation, selection, and data management
 */

import type { Database } from "../../core/database"
import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"
import type { Character } from "../../types"

export class CharacterManager {
  private database: Database
  private eventManager: EventManager
  private logger: Logger

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.logger = new Logger("CharacterManager")

    this.registerEvents()
  }

  private registerEvents(): void {
    this.eventManager.on("character:create", this.handleCharacterCreate.bind(this))
    this.eventManager.on("character:delete", this.handleCharacterDelete.bind(this))
    this.eventManager.on("character:save", this.saveCharacterData.bind(this))
  }

  public async getCharacterById(characterId: number): Promise<Character | null> {
    try {
      const results = await this.database.query("SELECT * FROM characters WHERE id = ?", [characterId])

      return results.length > 0 ? results[0] : null
    } catch (error) {
      this.logger.error("Error getting character by ID:", error)
      return null
    }
  }

  public async getCharactersByUserId(userId: number): Promise<Character[]> {
    try {
      const results = await this.database.query("SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC", [
        userId,
      ])

      return results
    } catch (error) {
      this.logger.error("Error getting characters by user ID:", error)
      return []
    }
  }

  private async handleCharacterCreate(
    player: any, // Updated to use 'any' type
    characterData: {
      firstName: string
      lastName: string
      age: number
      gender: "Male" | "Female"
    },
  ): Promise<void> {
    try {
      // Validation
      if (!this.validateCharacterData(characterData)) {
        player.call("client:characterCreateResult", {
          success: false,
          message: "Invalid character data provided",
        })
        return
      }

      // Check character limit (max 3 characters per account)
      const existingCharacters = await this.getCharactersByUserId(player.userData.id)
      if (existingCharacters.length >= 3) {
        player.call("client:characterCreateResult", {
          success: false,
          message: "Maximum character limit reached (3)",
        })
        return
      }

      // Check name availability
      const nameExists = await this.checkNameExists(characterData.firstName, characterData.lastName)
      if (nameExists) {
        player.call("client:characterCreateResult", {
          success: false,
          message: "Character name already exists",
        })
        return
      }

      // Create character
      const result = await this.database.query(
        `
        INSERT INTO characters (
          user_id, first_name, last_name, age, gender,
          position_x, position_y, position_z, dimension
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          player.userData.id,
          characterData.firstName,
          characterData.lastName,
          characterData.age,
          characterData.gender,
          -1037.8,
          -2738.5,
          20.1, // Default spawn position
          0, // Default dimension
        ],
      )

      const characterId = result.insertId
      const newCharacter = await this.getCharacterById(characterId)

      this.logger.success(
        `Character created: ${characterData.firstName} ${characterData.lastName} (ID: ${characterId})`,
      )

      player.call("client:characterCreateResult", {
        success: true,
        message: "Character created successfully",
        character: newCharacter,
      })

      this.eventManager.emit("character:created", player, newCharacter)
    } catch (error) {
      this.logger.error("Error creating character:", error)
      player.call("client:characterCreateResult", {
        success: false,
        message: "Server error occurred",
      })
    }
  }

  private async handleCharacterDelete(player: any, characterId: number): Promise<void> {
    // Updated to use 'any' type
    try {
      const character = await this.getCharacterById(characterId)

      if (!character || character.user_id !== player.userData.id) {
        player.call("client:characterDeleteResult", {
          success: false,
          message: "Invalid character",
        })
        return
      }

      await this.database.query("DELETE FROM characters WHERE id = ?", [characterId])

      this.logger.info(`Character deleted: ${character.first_name} ${character.last_name} (ID: ${characterId})`)

      player.call("client:characterDeleteResult", {
        success: true,
        message: "Character deleted successfully",
      })

      this.eventManager.emit("character:deleted", player, character)
    } catch (error) {
      this.logger.error("Error deleting character:", error)
      player.call("client:characterDeleteResult", {
        success: false,
        message: "Server error occurred",
      })
    }
  }

  public async loadCharacterData(player: any, character: Character): Promise<void> {
    // Updated to use 'any' type
    try {
      player.characterData = character

      // Load additional character data (job, faction, etc.)
      if (character.job_id) {
        const jobData = await this.database.query("SELECT * FROM jobs WHERE id = ?", [character.job_id])
        player.jobData = jobData.length > 0 ? jobData[0] : null
      }

      if (character.faction_id) {
        const factionData = await this.database.query("SELECT * FROM factions WHERE id = ?", [character.faction_id])
        player.factionData = factionData.length > 0 ? factionData[0] : null
      }

      this.logger.debug(`Loaded character data for ${character.first_name} ${character.last_name}`)
    } catch (error) {
      this.logger.error("Error loading character data:", error)
    }
  }

  public async saveCharacterData(player: any): Promise<void> {
    // Updated to use 'any' type
    try {
      if (!player.characterData) return

      const character = player.characterData

      await this.database.query(
        `
        UPDATE characters SET 
          money = ?, bank_money = ?, position_x = ?, position_y = ?, position_z = ?,
          dimension = ?, health = ?, armor = ?, hunger = ?, thirst = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
        [
          character.money,
          character.bank_money,
          player.position?.x || character.position_x,
          player.position?.y || character.position_y,
          player.position?.z || character.position_z,
          player.dimension || character.dimension,
          player.health || character.health,
          player.armour || character.armor,
          character.hunger,
          character.thirst,
          character.id,
        ],
      )

      this.logger.debug(`Saved character data for ${character.first_name} ${character.last_name}`)
    } catch (error) {
      this.logger.error("Error saving character data:", error)
    }
  }

  private validateCharacterData(data: any): boolean {
    if (
      !data.firstName ||
      typeof data.firstName !== "string" ||
      data.firstName.length < 2 ||
      data.firstName.length > 20
    ) {
      return false
    }

    if (!data.lastName || typeof data.lastName !== "string" || data.lastName.length < 2 || data.lastName.length > 20) {
      return false
    }

    if (!data.age || typeof data.age !== "number" || data.age < 18 || data.age > 80) {
      return false
    }

    if (!data.gender || !["Male", "Female"].includes(data.gender)) {
      return false
    }

    // Check for valid name format (letters only, first letter uppercase)
    const nameRegex = /^[A-Z][a-z]+$/
    if (!nameRegex.test(data.firstName) || !nameRegex.test(data.lastName)) {
      return false
    }

    return true
  }

  private async checkNameExists(firstName: string, lastName: string): Promise<boolean> {
    try {
      const results = await this.database.query("SELECT id FROM characters WHERE first_name = ? AND last_name = ?", [
        firstName,
        lastName,
      ])

      return results.length > 0
    } catch (error) {
      this.logger.error("Error checking name existence:", error)
      return true // Assume exists on error for safety
    }
  }

  public async updateCharacterMoney(
    characterId: number,
    amount: number,
    type: "cash" | "bank" = "cash",
  ): Promise<boolean> {
    try {
      const field = type === "cash" ? "money" : "bank_money"

      await this.database.query(`UPDATE characters SET ${field} = ${field} + ? WHERE id = ?`, [amount, characterId])

      return true
    } catch (error) {
      this.logger.error("Error updating character money:", error)
      return false
    }
  }

  public async setCharacterJob(characterId: number, jobId: number | null): Promise<boolean> {
    try {
      await this.database.query("UPDATE characters SET job_id = ? WHERE id = ?", [jobId, characterId])

      return true
    } catch (error) {
      this.logger.error("Error setting character job:", error)
      return false
    }
  }

  public async setCharacterFaction(characterId: number, factionId: number | null, rank = 0): Promise<boolean> {
    try {
      await this.database.query("UPDATE characters SET faction_id = ?, faction_rank = ? WHERE id = ?", [
        factionId,
        rank,
        characterId,
      ])

      return true
    } catch (error) {
      this.logger.error("Error setting character faction:", error)
      return false
    }
  }

  public async getCharacterStats(characterId: number): Promise<any> {
    try {
      const results = await this.database.query(
        `
        SELECT 
          c.*,
          j.name as job_name,
          f.name as faction_name,
          f.tag as faction_tag
        FROM characters c
        LEFT JOIN jobs j ON c.job_id = j.id
        LEFT JOIN factions f ON c.faction_id = f.id
        WHERE c.id = ?
      `,
        [characterId],
      )

      return results.length > 0 ? results[0] : null
    } catch (error) {
      this.logger.error("Error getting character stats:", error)
      return null
    }
  }
}
