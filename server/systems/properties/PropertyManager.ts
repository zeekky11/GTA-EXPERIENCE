import { EventManager } from "../../core/EventManager"
import { Database } from "../../core/database"
import { Logger } from "../../utils/Logger"
import type { Property, PropertyKey } from "../../types"

export class PropertyManager {
  private static instance: PropertyManager
  private properties: Map<number, Property> = new Map()
  private propertyKeys: Map<number, PropertyKey[]> = new Map()

  private constructor() {
    this.initializeEvents()
    this.loadProperties()
  }

  public static getInstance(): PropertyManager {
    if (!PropertyManager.instance) {
      PropertyManager.instance = new PropertyManager()
    }
    return PropertyManager.instance
  }

  private initializeEvents(): void {
    // Property events
    EventManager.on("property:purchase", this.handlePropertyPurchase.bind(this))
    EventManager.on("property:sell", this.handlePropertySell.bind(this))
    EventManager.on("property:rent", this.handlePropertyRent.bind(this))
    EventManager.on("property:giveKey", this.handleGiveKey.bind(this))
    EventManager.on("property:removeKey", this.handleRemoveKey.bind(this))
  }

  private async loadProperties(): Promise<void> {
    try {
      const query = `
                SELECT p.*, pk.player_id as key_holder, pk.key_type
                FROM properties p
                LEFT JOIN property_keys pk ON p.id = pk.property_id
                WHERE p.deleted_at IS NULL
            `

      const results = await Database.query(query)
      const propertyMap = new Map()

      for (const row of results) {
        if (!propertyMap.has(row.id)) {
          propertyMap.set(row.id, {
            id: row.id,
            owner_id: row.owner_id,
            name: row.name,
            type: row.type,
            price: row.price,
            position: JSON.parse(row.position),
            interior: row.interior,
            locked: row.locked,
            for_sale: row.for_sale,
            for_rent: row.for_rent,
            rent_price: row.rent_price,
            rented_by: row.rented_by,
            rent_expires: row.rent_expires,
            tax_rate: row.tax_rate,
            last_tax_paid: row.last_tax_paid,
            created_at: row.created_at,
          })
        }

        if (row.key_holder) {
          if (!this.propertyKeys.has(row.id)) {
            this.propertyKeys.set(row.id, [])
          }
          this.propertyKeys.get(row.id)!.push({
            property_id: row.id,
            player_id: row.key_holder,
            key_type: row.key_type,
            created_at: new Date(),
          })
        }
      }

      this.properties = propertyMap
      Logger.info(`Loaded ${this.properties.size} properties`)
    } catch (error) {
      Logger.error("Error loading properties:", error)
    }
  }

  public async purchaseProperty(propertyId: number, buyerId: number): Promise<{ success: boolean; message: string }> {
    try {
      const property = this.properties.get(propertyId)
      if (!property) {
        return { success: false, message: "Propiedad no encontrada" }
      }

      if (!property.for_sale) {
        return { success: false, message: "Esta propiedad no está en venta" }
      }

      if (property.owner_id) {
        return { success: false, message: "Esta propiedad ya tiene propietario" }
      }

      // Check player money
      const playerQuery = "SELECT money FROM characters WHERE id = ?"
      const playerResult = await Database.query(playerQuery, [buyerId])

      if (!playerResult.length || playerResult[0].money < property.price) {
        return { success: false, message: "No tienes suficiente dinero" }
      }

      // Transfer ownership
      await Database.query("UPDATE properties SET owner_id = ?, for_sale = 0 WHERE id = ?", [buyerId, propertyId])

      // Deduct money
      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [property.price, buyerId])

      // Give keys
      await this.giveKey(propertyId, buyerId, "owner")

      // Update memory
      property.owner_id = buyerId
      property.for_sale = false

      Logger.info(`Property ${propertyId} purchased by player ${buyerId} for $${property.price}`)
      return { success: true, message: `Has comprado ${property.name} por $${property.price}` }
    } catch (error) {
      Logger.error("Error purchasing property:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async sellProperty(propertyId: number, sellerId: number): Promise<{ success: boolean; message: string }> {
    try {
      const property = this.properties.get(propertyId)
      if (!property) {
        return { success: false, message: "Propiedad no encontrada" }
      }

      if (property.owner_id !== sellerId) {
        return { success: false, message: "No eres el propietario de esta propiedad" }
      }

      // Calculate sell price (80% of original)
      const sellPrice = Math.floor(property.price * 0.8)

      // Add money to player
      await Database.query("UPDATE characters SET money = money + ? WHERE id = ?", [sellPrice, sellerId])

      // Remove ownership and keys
      await Database.query("UPDATE properties SET owner_id = NULL, for_sale = 1, rented_by = NULL WHERE id = ?", [
        propertyId,
      ])
      await Database.query("DELETE FROM property_keys WHERE property_id = ?", [propertyId])

      // Update memory
      property.owner_id = null
      property.for_sale = true
      property.rented_by = null
      this.propertyKeys.delete(propertyId)

      Logger.info(`Property ${propertyId} sold by player ${sellerId} for $${sellPrice}`)
      return { success: true, message: `Has vendido ${property.name} por $${sellPrice}` }
    } catch (error) {
      Logger.error("Error selling property:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async rentProperty(propertyId: number, renterId: number): Promise<{ success: boolean; message: string }> {
    try {
      const property = this.properties.get(propertyId)
      if (!property) {
        return { success: false, message: "Propiedad no encontrada" }
      }

      if (!property.for_rent || !property.rent_price) {
        return { success: false, message: "Esta propiedad no está disponible para alquiler" }
      }

      if (property.rented_by) {
        return { success: false, message: "Esta propiedad ya está alquilada" }
      }

      // Check player money
      const playerQuery = "SELECT money FROM characters WHERE id = ?"
      const playerResult = await Database.query(playerQuery, [renterId])

      if (!playerResult.length || playerResult[0].money < property.rent_price) {
        return { success: false, message: "No tienes suficiente dinero para el alquiler" }
      }

      const rentExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      // Set rental
      await Database.query("UPDATE properties SET rented_by = ?, rent_expires = ? WHERE id = ?", [
        renterId,
        rentExpires,
        propertyId,
      ])

      // Deduct money
      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [property.rent_price, renterId])

      // Give keys
      await this.giveKey(propertyId, renterId, "renter")

      // Update memory
      property.rented_by = renterId
      property.rent_expires = rentExpires

      Logger.info(`Property ${propertyId} rented by player ${renterId} for $${property.rent_price}`)
      return { success: true, message: `Has alquilado ${property.name} por $${property.rent_price}/mes` }
    } catch (error) {
      Logger.error("Error renting property:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async giveKey(
    propertyId: number,
    playerId: number,
    keyType: "owner" | "renter" | "spare" = "spare",
  ): Promise<{ success: boolean; message: string }> {
    try {
      const property = this.properties.get(propertyId)
      if (!property) {
        return { success: false, message: "Propiedad no encontrada" }
      }

      // Check if player already has a key
      const existingKey = await Database.query("SELECT * FROM property_keys WHERE property_id = ? AND player_id = ?", [
        propertyId,
        playerId,
      ])

      if (existingKey.length > 0) {
        return { success: false, message: "El jugador ya tiene una llave de esta propiedad" }
      }

      // Insert new key
      await Database.query(
        "INSERT INTO property_keys (property_id, player_id, key_type, created_at) VALUES (?, ?, ?, NOW())",
        [propertyId, playerId, keyType],
      )

      // Update memory
      if (!this.propertyKeys.has(propertyId)) {
        this.propertyKeys.set(propertyId, [])
      }

      this.propertyKeys.get(propertyId)!.push({
        property_id: propertyId,
        player_id: playerId,
        key_type: keyType,
        created_at: new Date(),
      })

      return { success: true, message: "Llave entregada correctamente" }
    } catch (error) {
      Logger.error("Error giving property key:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async removeKey(propertyId: number, playerId: number): Promise<{ success: boolean; message: string }> {
    try {
      const result = await Database.query(
        'DELETE FROM property_keys WHERE property_id = ? AND player_id = ? AND key_type != "owner"',
        [propertyId, playerId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "No se encontró la llave o no se puede eliminar la llave del propietario" }
      }

      // Update memory
      const keys = this.propertyKeys.get(propertyId)
      if (keys) {
        const updatedKeys = keys.filter((key) => !(key.player_id === playerId && key.key_type !== "owner"))
        this.propertyKeys.set(propertyId, updatedKeys)
      }

      return { success: true, message: "Llave eliminada correctamente" }
    } catch (error) {
      Logger.error("Error removing property key:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public hasPropertyKey(propertyId: number, playerId: number): boolean {
    const keys = this.propertyKeys.get(propertyId)
    return keys ? keys.some((key) => key.player_id === playerId) : false
  }

  public getProperty(propertyId: number): Property | undefined {
    return this.properties.get(propertyId)
  }

  public getPlayerProperties(playerId: number): Property[] {
    return Array.from(this.properties.values()).filter((property) => property.owner_id === playerId)
  }

  public getPropertiesForSale(): Property[] {
    return Array.from(this.properties.values()).filter((property) => property.for_sale)
  }

  public getPropertiesForRent(): Property[] {
    return Array.from(this.properties.values()).filter((property) => property.for_rent && !property.rented_by)
  }

  // Event handlers
  private async handlePropertyPurchase(data: any): Promise<void> {
    const result = await this.purchaseProperty(data.propertyId, data.buyerId)
    EventManager.emit("property:purchaseResult", { playerId: data.buyerId, result })
  }

  private async handlePropertySell(data: any): Promise<void> {
    const result = await this.sellProperty(data.propertyId, data.sellerId)
    EventManager.emit("property:sellResult", { playerId: data.sellerId, result })
  }

  private async handlePropertyRent(data: any): Promise<void> {
    const result = await this.rentProperty(data.propertyId, data.renterId)
    EventManager.emit("property:rentResult", { playerId: data.renterId, result })
  }

  private async handleGiveKey(data: any): Promise<void> {
    const result = await this.giveKey(data.propertyId, data.playerId, data.keyType)
    EventManager.emit("property:giveKeyResult", { result })
  }

  private async handleRemoveKey(data: any): Promise<void> {
    const result = await this.removeKey(data.propertyId, data.playerId)
    EventManager.emit("property:removeKeyResult", { result })
  }
}
