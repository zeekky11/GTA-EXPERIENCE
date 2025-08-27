import { EventManager } from "../../core/EventManager"
import { Database } from "../../core/database"
import { Logger } from "../../utils/Logger"
import type { Vehicle, VehicleKey } from "../../types"

export class VehicleManager {
  private static instance: VehicleManager
  private vehicles: Map<number, Vehicle> = new Map()
  private vehicleKeys: Map<number, VehicleKey[]> = new Map()
  private dealerships: Map<string, any[]> = new Map()

  private constructor() {
    this.initializeEvents()
    this.loadVehicles()
    this.setupDealerships()
  }

  public static getInstance(): VehicleManager {
    if (!VehicleManager.instance) {
      VehicleManager.instance = new VehicleManager()
    }
    return VehicleManager.instance
  }

  private initializeEvents(): void {
    // Vehicle purchase events
    EventManager.on("vehicle:purchase", this.handleVehiclePurchase.bind(this))
    EventManager.on("vehicle:sell", this.handleVehicleSell.bind(this))

    // Vehicle key events
    EventManager.on("vehicle:giveKey", this.handleGiveKey.bind(this))
    EventManager.on("vehicle:removeKey", this.handleRemoveKey.bind(this))

    // Vehicle maintenance events
    EventManager.on("vehicle:refuel", this.handleRefuel.bind(this))
    EventManager.on("vehicle:repair", this.handleRepair.bind(this))
    EventManager.on("vehicle:modify", this.handleModify.bind(this))

    // Vehicle impound events
    EventManager.on("vehicle:impound", this.handleImpound.bind(this))
    EventManager.on("vehicle:unimpound", this.handleUnimpound.bind(this))
  }

  private async loadVehicles(): Promise<void> {
    try {
      const query = `
                SELECT v.*, vm.component, vm.value as mod_value
                FROM vehicles v
                LEFT JOIN vehicle_modifications vm ON v.id = vm.vehicle_id
                WHERE v.deleted_at IS NULL
            `

      const results = await Database.query(query)
      const vehicleMap = new Map()

      for (const row of results) {
        if (!vehicleMap.has(row.id)) {
          vehicleMap.set(row.id, {
            id: row.id,
            owner_id: row.owner_id,
            model: row.model,
            plate: row.plate,
            color_primary: JSON.parse(row.color_primary),
            color_secondary: JSON.parse(row.color_secondary),
            position: JSON.parse(row.position),
            rotation: JSON.parse(row.rotation),
            fuel: row.fuel,
            engine_health: row.engine_health,
            body_health: row.body_health,
            locked: row.locked,
            impounded: row.impounded,
            insurance_expires: row.insurance_expires,
            modifications: new Map(),
          })
        }

        if (row.component) {
          vehicleMap.get(row.id).modifications.set(row.component, row.mod_value)
        }
      }

      this.vehicles = vehicleMap
      Logger.info(`Loaded ${this.vehicles.size} vehicles`)
    } catch (error) {
      Logger.error("Error loading vehicles:", error)
    }
  }

  private setupDealerships(): void {
    // Premium Deluxe Motorsport
    this.dealerships.set("pdm", [
      { model: "adder", name: "Truffade Adder", price: 1000000, category: "super" },
      { model: "zentorno", name: "Pegassi Zentorno", price: 725000, category: "super" },
      { model: "entityxf", name: "Overflod Entity XF", price: 795000, category: "super" },
      { model: "infernus", name: "Pegassi Infernus", price: 440000, category: "super" },
      { model: "vacca", name: "Pegassi Vacca", price: 240000, category: "super" },
      { model: "bullet", name: "Vapid Bullet", price: 155000, category: "super" },
      { model: "cheetah", name: "Grotti Cheetah", price: 650000, category: "super" },
      { model: "voltic", name: "Coil Voltic", price: 150000, category: "super" },
      { model: "banshee", name: "Bravado Banshee", price: 105000, category: "sports" },
      { model: "carbonizzare", name: "Grotti Carbonizzare", price: 195000, category: "sports" },
      { model: "coquette", name: "Invetero Coquette", price: 138000, category: "sports" },
      { model: "ninef", name: "Obey 9F", price: 130000, category: "sports" },
      { model: "rapidgt", name: "Dewbauchee Rapid GT", price: 132000, category: "sports" },
      { model: "stinger", name: "Grotti Stinger", price: 850000, category: "sports_classic" },
      { model: "buffalo", name: "Bravado Buffalo", price: 35000, category: "sports" },
      { model: "feltzer2", name: "Benefactor Feltzer", price: 130000, category: "sports" },
    ])

    // Simeon's Dealership (Budget)
    this.dealerships.set("simeon", [
      { model: "blista", name: "Dinka Blista", price: 8000, category: "compact" },
      { model: "brioso", name: "Grotti Brioso R/A", price: 18000, category: "compact" },
      { model: "dilettante", name: "Karin Dilettante", price: 25000, category: "compact" },
      { model: "issi2", name: "Weeny Issi", price: 18000, category: "compact" },
      { model: "panto", name: "Benefactor Panto", price: 85000, category: "compact" },
      { model: "prairie", name: "Bollokan Prairie", price: 25000, category: "compact" },
      { model: "rhapsody", name: "Declasse Rhapsody", price: 140000, category: "compact" },
      { model: "asea", name: "Declasse Asea", price: 12000, category: "sedan" },
      { model: "asterope", name: "Karin Asterope", price: 26000, category: "sedan" },
      { model: "fugitive", name: "Cheval Fugitive", price: 24000, category: "sedan" },
      { model: "ingot", name: "Vulcar Ingot", price: 9000, category: "sedan" },
      { model: "intruder", name: "Karin Intruder", price: 16000, category: "sedan" },
      { model: "premier", name: "Declasse Premier", price: 10000, category: "sedan" },
      { model: "primo", name: "Albany Primo", price: 9000, category: "sedan" },
      { model: "regina", name: "Dundreary Regina", price: 8000, category: "sedan" },
      { model: "stratum", name: "Zirconium Stratum", price: 10000, category: "sedan" },
    ])

    // Motorcycle Dealership
    this.dealerships.set("bikes", [
      { model: "akuma", name: "Dinka Akuma", price: 9000, category: "motorcycle" },
      { model: "bagger", name: "Western Bagger", price: 16000, category: "motorcycle" },
      { model: "bati", name: "Pegassi Bati 801", price: 15000, category: "motorcycle" },
      { model: "bati2", name: "Pegassi Bati 801RR", price: 15000, category: "motorcycle" },
      { model: "carbonrs", name: "Nagasaki Carbon RS", price: 40000, category: "motorcycle" },
      { model: "daemon", name: "Western Daemon", price: 5000, category: "motorcycle" },
      { model: "double", name: "Dinka Double-T", price: 12000, category: "motorcycle" },
      { model: "faggio2", name: "Pegassi Faggio", price: 4000, category: "motorcycle" },
      { model: "hexer", name: "LCC Hexer", price: 15000, category: "motorcycle" },
      { model: "innovation", name: "LCC Innovation", price: 90000, category: "motorcycle" },
      { model: "nemesis", name: "Principe Nemesis", price: 12000, category: "motorcycle" },
      { model: "pcj", name: "Shitzu PCJ 600", price: 9000, category: "motorcycle" },
      { model: "ruffian", name: "Pegassi Ruffian", price: 10000, category: "motorcycle" },
      { model: "sanchez", name: "Maibatsu Sanchez", price: 7000, category: "motorcycle" },
      { model: "sovereign", name: "Western Sovereign", price: 90000, category: "motorcycle" },
      { model: "thrust", name: "Dinka Thrust", price: 75000, category: "motorcycle" },
    ])
  }

  public async purchaseVehicle(
    playerId: number,
    dealership: string,
    model: string,
  ): Promise<{ success: boolean; message: string; vehicleId?: number }> {
    try {
      const dealershipVehicles = this.dealerships.get(dealership)
      if (!dealershipVehicles) {
        return { success: false, message: "Concesionario no encontrado" }
      }

      const vehicleInfo = dealershipVehicles.find((v) => v.model === model)
      if (!vehicleInfo) {
        return { success: false, message: "Vehículo no disponible en este concesionario" }
      }

      // Check player money
      const playerQuery = "SELECT money FROM characters WHERE id = ?"
      const playerResult = await Database.query(playerQuery, [playerId])

      if (!playerResult.length || playerResult[0].money < vehicleInfo.price) {
        return { success: false, message: "No tienes suficiente dinero" }
      }

      // Generate unique plate
      const plate = this.generatePlate()

      // Create vehicle
      const insertQuery = `
                INSERT INTO vehicles (owner_id, model, plate, color_primary, color_secondary, position, rotation, fuel, engine_health, body_health, locked, impounded, insurance_expires)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `

      const defaultPosition = JSON.stringify({ x: -56.79, y: -1096.85, z: 25.42 })
      const defaultRotation = JSON.stringify({ x: 0, y: 0, z: 0 })
      const defaultColor = JSON.stringify({ r: 255, g: 255, b: 255 })
      const insuranceExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const result = await Database.query(insertQuery, [
        playerId,
        model,
        plate,
        defaultColor,
        defaultColor,
        defaultPosition,
        defaultRotation,
        100,
        1000,
        1000,
        true,
        false,
        insuranceExpires,
      ])

      const vehicleId = result.insertId

      // Deduct money
      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [vehicleInfo.price, playerId])

      // Give keys
      await this.giveKey(vehicleId, playerId, "owner")

      // Add to memory
      const newVehicle: Vehicle = {
        id: vehicleId,
        owner_id: playerId,
        model,
        plate,
        color_primary: { r: 255, g: 255, b: 255 },
        color_secondary: { r: 255, g: 255, b: 255 },
        position: { x: -56.79, y: -1096.85, z: 25.42 },
        rotation: { x: 0, y: 0, z: 0 },
        fuel: 100,
        engine_health: 1000,
        body_health: 1000,
        locked: true,
        impounded: false,
        insurance_expires: insuranceExpires,
        modifications: new Map(),
      }

      this.vehicles.set(vehicleId, newVehicle)

      Logger.info(`Player ${playerId} purchased vehicle ${model} (ID: ${vehicleId}) for $${vehicleInfo.price}`)
      return { success: true, message: `Has comprado un ${vehicleInfo.name} por $${vehicleInfo.price}`, vehicleId }
    } catch (error) {
      Logger.error("Error purchasing vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async sellVehicle(vehicleId: number, sellerId: number): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      if (vehicle.owner_id !== sellerId) {
        return { success: false, message: "No eres el propietario de este vehículo" }
      }

      if (vehicle.impounded) {
        return { success: false, message: "No puedes vender un vehículo incautado" }
      }

      // Calculate sell price (50% of original)
      const dealershipVehicles = Array.from(this.dealerships.values()).flat()
      const vehicleInfo = dealershipVehicles.find((v) => v.model === vehicle.model)
      const sellPrice = vehicleInfo ? Math.floor(vehicleInfo.price * 0.5) : 5000

      // Add money to player
      await Database.query("UPDATE characters SET money = money + ? WHERE id = ?", [sellPrice, sellerId])

      // Remove vehicle keys
      await Database.query("DELETE FROM vehicle_keys WHERE vehicle_id = ?", [vehicleId])

      // Mark vehicle as deleted
      await Database.query("UPDATE vehicles SET deleted_at = NOW() WHERE id = ?", [vehicleId])

      // Remove from memory
      this.vehicles.delete(vehicleId)
      this.vehicleKeys.delete(vehicleId)

      Logger.info(`Player ${sellerId} sold vehicle ${vehicleId} for $${sellPrice}`)
      return { success: true, message: `Has vendido tu vehículo por $${sellPrice}` }
    } catch (error) {
      Logger.error("Error selling vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async giveKey(
    vehicleId: number,
    playerId: number,
    keyType: "owner" | "spare" = "spare",
  ): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      // Check if player already has a key
      const existingKey = await Database.query("SELECT * FROM vehicle_keys WHERE vehicle_id = ? AND player_id = ?", [
        vehicleId,
        playerId,
      ])

      if (existingKey.length > 0) {
        return { success: false, message: "El jugador ya tiene una llave de este vehículo" }
      }

      // Insert new key
      await Database.query(
        "INSERT INTO vehicle_keys (vehicle_id, player_id, key_type, created_at) VALUES (?, ?, ?, NOW())",
        [vehicleId, playerId, keyType],
      )

      // Update memory
      if (!this.vehicleKeys.has(vehicleId)) {
        this.vehicleKeys.set(vehicleId, [])
      }

      this.vehicleKeys.get(vehicleId)!.push({
        vehicle_id: vehicleId,
        player_id: playerId,
        key_type: keyType,
        created_at: new Date(),
      })

      return { success: true, message: "Llave entregada correctamente" }
    } catch (error) {
      Logger.error("Error giving vehicle key:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async removeKey(vehicleId: number, playerId: number): Promise<{ success: boolean; message: string }> {
    try {
      const result = await Database.query(
        'DELETE FROM vehicle_keys WHERE vehicle_id = ? AND player_id = ? AND key_type != "owner"',
        [vehicleId, playerId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "No se encontró la llave o no se puede eliminar la llave del propietario" }
      }

      // Update memory
      const keys = this.vehicleKeys.get(vehicleId)
      if (keys) {
        const updatedKeys = keys.filter((key) => !(key.player_id === playerId && key.key_type !== "owner"))
        this.vehicleKeys.set(vehicleId, updatedKeys)
      }

      return { success: true, message: "Llave eliminada correctamente" }
    } catch (error) {
      Logger.error("Error removing vehicle key:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public hasVehicleKey(vehicleId: number, playerId: number): boolean {
    const keys = this.vehicleKeys.get(vehicleId)
    return keys ? keys.some((key) => key.player_id === playerId) : false
  }

  public async refuelVehicle(
    vehicleId: number,
    amount: number,
  ): Promise<{ success: boolean; message: string; cost?: number }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      const fuelPrice = 2.5 // $2.5 per liter
      const maxFuel = 100
      const currentFuel = vehicle.fuel
      const actualAmount = Math.min(amount, maxFuel - currentFuel)
      const cost = Math.floor(actualAmount * fuelPrice)

      if (actualAmount <= 0) {
        return { success: false, message: "El tanque ya está lleno" }
      }

      // Update fuel
      vehicle.fuel = currentFuel + actualAmount

      await Database.query("UPDATE vehicles SET fuel = ? WHERE id = ?", [vehicle.fuel, vehicleId])

      return { success: true, message: `Repostado ${actualAmount}L de combustible`, cost }
    } catch (error) {
      Logger.error("Error refueling vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async repairVehicle(vehicleId: number): Promise<{ success: boolean; message: string; cost?: number }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      const maxHealth = 1000
      const engineDamage = maxHealth - vehicle.engine_health
      const bodyDamage = maxHealth - vehicle.body_health
      const totalDamage = engineDamage + bodyDamage

      if (totalDamage === 0) {
        return { success: false, message: "El vehículo no necesita reparación" }
      }

      const repairCost = Math.floor(totalDamage * 0.5) // $0.5 per damage point

      // Repair vehicle
      vehicle.engine_health = maxHealth
      vehicle.body_health = maxHealth

      await Database.query("UPDATE vehicles SET engine_health = ?, body_health = ? WHERE id = ?", [
        maxHealth,
        maxHealth,
        vehicleId,
      ])

      return { success: true, message: "Vehículo reparado completamente", cost: repairCost }
    } catch (error) {
      Logger.error("Error repairing vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async modifyVehicle(
    vehicleId: number,
    component: number,
    value: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      // Update or insert modification
      await Database.query(
        "INSERT INTO vehicle_modifications (vehicle_id, component, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
        [vehicleId, component, value, value],
      )

      // Update memory
      vehicle.modifications.set(component, value)

      return { success: true, message: "Modificación aplicada correctamente" }
    } catch (error) {
      Logger.error("Error modifying vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async impoundVehicle(
    vehicleId: number,
    reason: string,
    impounderId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      if (vehicle.impounded) {
        return { success: false, message: "El vehículo ya está incautado" }
      }

      // Impound vehicle
      vehicle.impounded = true

      await Database.query("UPDATE vehicles SET impounded = ? WHERE id = ?", [true, vehicleId])

      // Log impound
      await Database.query(
        "INSERT INTO vehicle_impounds (vehicle_id, reason, impounded_by, impounded_at) VALUES (?, ?, ?, NOW())",
        [vehicleId, reason, impounderId],
      )

      Logger.info(`Vehicle ${vehicleId} impounded by player ${impounderId}. Reason: ${reason}`)
      return { success: true, message: "Vehículo incautado correctamente" }
    } catch (error) {
      Logger.error("Error impounding vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async unimpoundVehicle(
    vehicleId: number,
    payerId: number,
  ): Promise<{ success: boolean; message: string; cost?: number }> {
    try {
      const vehicle = this.vehicles.get(vehicleId)
      if (!vehicle) {
        return { success: false, message: "Vehículo no encontrado" }
      }

      if (!vehicle.impounded) {
        return { success: false, message: "El vehículo no está incautado" }
      }

      const impoundCost = 500 // $500 to unimpound

      // Check player money
      const playerResult = await Database.query("SELECT money FROM characters WHERE id = ?", [payerId])
      if (!playerResult.length || playerResult[0].money < impoundCost) {
        return { success: false, message: "No tienes suficiente dinero para recuperar el vehículo" }
      }

      // Unimpound vehicle
      vehicle.impounded = false

      await Database.query("UPDATE vehicles SET impounded = ? WHERE id = ?", [false, vehicleId])
      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [impoundCost, payerId])

      return { success: true, message: "Vehículo recuperado correctamente", cost: impoundCost }
    } catch (error) {
      Logger.error("Error unimpounding vehicle:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  private generatePlate(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let plate = ""
    for (let i = 0; i < 8; i++) {
      plate += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return plate
  }

  public getVehicle(vehicleId: number): Vehicle | undefined {
    return this.vehicles.get(vehicleId)
  }

  public getPlayerVehicles(playerId: number): Vehicle[] {
    return Array.from(this.vehicles.values()).filter((vehicle) => vehicle.owner_id === playerId)
  }

  public getDealershipVehicles(dealership: string): any[] {
    return this.dealerships.get(dealership) || []
  }

  // Event handlers
  private async handleVehiclePurchase(data: any): Promise<void> {
    const result = await this.purchaseVehicle(data.playerId, data.dealership, data.model)
    EventManager.emit("vehicle:purchaseResult", { playerId: data.playerId, result })
  }

  private async handleVehicleSell(data: any): Promise<void> {
    const result = await this.sellVehicle(data.vehicleId, data.sellerId)
    EventManager.emit("vehicle:sellResult", { playerId: data.sellerId, result })
  }

  private async handleGiveKey(data: any): Promise<void> {
    const result = await this.giveKey(data.vehicleId, data.playerId, data.keyType)
    EventManager.emit("vehicle:giveKeyResult", { result })
  }

  private async handleRemoveKey(data: any): Promise<void> {
    const result = await this.removeKey(data.vehicleId, data.playerId)
    EventManager.emit("vehicle:removeKeyResult", { result })
  }

  private async handleRefuel(data: any): Promise<void> {
    const result = await this.refuelVehicle(data.vehicleId, data.amount)
    EventManager.emit("vehicle:refuelResult", { playerId: data.playerId, result })
  }

  private async handleRepair(data: any): Promise<void> {
    const result = await this.repairVehicle(data.vehicleId)
    EventManager.emit("vehicle:repairResult", { playerId: data.playerId, result })
  }

  private async handleModify(data: any): Promise<void> {
    const result = await this.modifyVehicle(data.vehicleId, data.component, data.value)
    EventManager.emit("vehicle:modifyResult", { result })
  }

  private async handleImpound(data: any): Promise<void> {
    const result = await this.impoundVehicle(data.vehicleId, data.reason, data.impounderId)
    EventManager.emit("vehicle:impoundResult", { result })
  }

  private async handleUnimpound(data: any): Promise<void> {
    const result = await this.unimpoundVehicle(data.vehicleId, data.payerId)
    EventManager.emit("vehicle:unimpoundResult", { playerId: data.payerId, result })
  }
}
