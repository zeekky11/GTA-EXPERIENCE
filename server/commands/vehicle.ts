import { VehicleManager } from "../systems/vehicles/VehicleManager"
import { PlayerManager } from "../systems/player/PlayerManager"
import { Logger } from "../utils/Logger"
import { mp } from "your-mp-module" // Declare mp variable
import { Database } from "your-database-module" // Declare Database variable

export class VehicleCommands {
  private vehicleManager: VehicleManager
  private playerManager: PlayerManager

  constructor() {
    this.vehicleManager = VehicleManager.getInstance()
    this.playerManager = PlayerManager.getInstance()
    this.registerCommands()
  }

  private registerCommands(): void {
    // Vehicle management commands
    mp.events.add("playerCommand", this.handleCommand.bind(this))
  }

  private async handleCommand(player: any, command: string): Promise<void> {
    const args = command.split(" ")
    const cmd = args[0].toLowerCase()

    try {
      switch (cmd) {
        case "/veh":
        case "/vehicle":
          await this.handleVehicleInfo(player, args)
          break
        case "/vlock":
          await this.handleVehicleLock(player)
          break
        case "/vunlock":
          await this.handleVehicleUnlock(player)
          break
        case "/engine":
          await this.handleEngine(player)
          break
        case "/vgivekey":
          await this.handleGiveKey(player, args)
          break
        case "/vremovekey":
          await this.handleRemoveKey(player, args)
          break
        case "/vmyvehicles":
        case "/vmyvehs":
          await this.handleMyVehicles(player)
          break
        case "/vpark":
          await this.handleParkVehicle(player)
          break
        case "/vfind":
          await this.handleFindVehicle(player, args)
          break
        case "/vimpound":
          await this.handleImpoundVehicle(player, args)
          break
        case "/vunimpound":
          await this.handleUnimpoundVehicle(player, args)
          break
        case "/vrepair":
          await this.handleRepairVehicle(player)
          break
        case "/vrefuel":
          await this.handleRefuelVehicle(player, args)
          break
        case "/vsell":
          await this.handleSellVehicle(player, args)
          break
        default:
          break
      }
    } catch (error) {
      Logger.error(`Error handling vehicle command ${cmd}:`, error)
      player.outputChatBox("Error interno del servidor.")
    }
  }

  private async handleVehicleInfo(player: any, args: string[]): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox("Debes estar en un vehículo.")
      return
    }

    const vehicleId = player.vehicle.getVariable("vehicleId")
    if (!vehicleId) {
      player.outputChatBox("Este no es un vehículo del servidor.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (!vehicle) {
      player.outputChatBox("Información del vehículo no encontrada.")
      return
    }

    const ownerName = await this.playerManager.getCharacterName(vehicle.owner_id)

    player.outputChatBox("=== INFORMACIÓN DEL VEHÍCULO ===")
    player.outputChatBox(`Modelo: ${vehicle.model}`)
    player.outputChatBox(`Placa: ${vehicle.plate}`)
    player.outputChatBox(`Propietario: ${ownerName}`)
    player.outputChatBox(`Combustible: ${vehicle.fuel}%`)
    player.outputChatBox(`Salud del Motor: ${vehicle.engine_health}/1000`)
    player.outputChatBox(`Salud de la Carrocería: ${vehicle.body_health}/1000`)
    player.outputChatBox(`Estado: ${vehicle.locked ? "Cerrado" : "Abierto"}`)
    player.outputChatBox(`Incautado: ${vehicle.impounded ? "Sí" : "No"}`)

    if (vehicle.insurance_expires) {
      const daysLeft = Math.ceil((vehicle.insurance_expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      player.outputChatBox(`Seguro: ${daysLeft > 0 ? `${daysLeft} días restantes` : "Expirado"}`)
    }
  }

  private async handleVehicleLock(player: any): Promise<void> {
    const nearestVehicle = this.getNearestVehicle(player)
    if (!nearestVehicle) {
      player.outputChatBox("No hay vehículos cerca.")
      return
    }

    const vehicleId = nearestVehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (vehicle) {
      vehicle.locked = true
      nearestVehicle.locked = true
      player.outputChatBox("Vehículo cerrado.")

      // Play lock sound and animation
      mp.players.broadcast(`${player.name} cierra su vehículo.`)
    }
  }

  private async handleVehicleUnlock(player: any): Promise<void> {
    const nearestVehicle = this.getNearestVehicle(player)
    if (!nearestVehicle) {
      player.outputChatBox("No hay vehículos cerca.")
      return
    }

    const vehicleId = nearestVehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (vehicle) {
      vehicle.locked = false
      nearestVehicle.locked = false
      player.outputChatBox("Vehículo abierto.")

      // Play unlock sound and animation
      mp.players.broadcast(`${player.name} abre su vehículo.`)
    }
  }

  private async handleEngine(player: any): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox("Debes estar en un vehículo.")
      return
    }

    const vehicleId = player.vehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (!vehicle) {
      player.outputChatBox("Información del vehículo no encontrada.")
      return
    }

    if (vehicle.fuel <= 0) {
      player.outputChatBox("El vehículo no tiene combustible.")
      return
    }

    const currentEngine = player.vehicle.engine
    player.vehicle.engine = !currentEngine

    player.outputChatBox(`Motor ${!currentEngine ? "encendido" : "apagado"}.`)
    mp.players.broadcast(`${player.name} ${!currentEngine ? "enciende" : "apaga"} el motor de su vehículo.`)
  }

  private async handleGiveKey(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /vgivekey [ID del jugador]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const nearestVehicle = this.getNearestVehicle(player)
    if (!nearestVehicle) {
      player.outputChatBox("No hay vehículos cerca.")
      return
    }

    const vehicleId = nearestVehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")
    const targetCharId = targetPlayer.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const result = await this.vehicleManager.giveKey(vehicleId, targetCharId, "spare")

    player.outputChatBox(result.message)
    if (result.success) {
      targetPlayer.outputChatBox(`${player.name} te ha dado una llave de su vehículo.`)
    }
  }

  private async handleRemoveKey(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /vremovekey [ID del jugador]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const nearestVehicle = this.getNearestVehicle(player)
    if (!nearestVehicle) {
      player.outputChatBox("No hay vehículos cerca.")
      return
    }

    const vehicleId = nearestVehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")
    const targetCharId = targetPlayer.getVariable("characterId")

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (!vehicle || vehicle.owner_id !== playerId) {
      player.outputChatBox("No eres el propietario de este vehículo.")
      return
    }

    const result = await this.vehicleManager.removeKey(vehicleId, targetCharId)

    player.outputChatBox(result.message)
    if (result.success) {
      targetPlayer.outputChatBox(`${player.name} te ha quitado la llave de su vehículo.`)
    }
  }

  private async handleMyVehicles(player: any): Promise<void> {
    const playerId = player.getVariable("characterId")
    const vehicles = this.vehicleManager.getPlayerVehicles(playerId)

    if (vehicles.length === 0) {
      player.outputChatBox("No tienes vehículos.")
      return
    }

    player.outputChatBox("=== MIS VEHÍCULOS ===")
    for (const vehicle of vehicles) {
      const status = vehicle.impounded ? "INCAUTADO" : "Disponible"
      player.outputChatBox(`ID: ${vehicle.id} | ${vehicle.model} | Placa: ${vehicle.plate} | Estado: ${status}`)
    }
  }

  private async handleParkVehicle(player: any): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox("Debes estar en un vehículo.")
      return
    }

    const vehicleId = player.vehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (vehicle) {
      vehicle.position = player.vehicle.position
      vehicle.rotation = player.vehicle.rotation

      // Save to database
      await Database.query("UPDATE vehicles SET position = ?, rotation = ? WHERE id = ?", [
        JSON.stringify(vehicle.position),
        JSON.stringify(vehicle.rotation),
        vehicleId,
      ])

      player.outputChatBox("Vehículo estacionado en esta posición.")
    }
  }

  private async handleFindVehicle(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /vfind [ID del vehículo]")
      return
    }

    const vehicleId = Number.parseInt(args[1])
    const playerId = player.getVariable("characterId")

    if (!this.vehicleManager.hasVehicleKey(vehicleId, playerId)) {
      player.outputChatBox("No tienes las llaves de este vehículo.")
      return
    }

    const vehicle = this.vehicleManager.getVehicle(vehicleId)
    if (!vehicle) {
      player.outputChatBox("Vehículo no encontrado.")
      return
    }

    if (vehicle.impounded) {
      player.outputChatBox("Tu vehículo está incautado en el depósito policial.")
      return
    }

    // Set waypoint to vehicle location
    player.call("setWaypoint", [vehicle.position.x, vehicle.position.y])
    player.outputChatBox(`Waypoint establecido hacia tu ${vehicle.model} (${vehicle.plate}).`)
  }

  private async handleImpoundVehicle(player: any, args: string[]): Promise<void> {
    const playerId = player.getVariable("characterId")
    const playerJob = player.getVariable("job")

    if (playerJob !== "police" && playerJob !== "sheriff") {
      player.outputChatBox("Solo las fuerzas del orden pueden incautar vehículos.")
      return
    }

    if (args.length < 2) {
      player.outputChatBox("Uso: /vimpound [razón]")
      return
    }

    const reason = args.slice(1).join(" ")
    const nearestVehicle = this.getNearestVehicle(player)

    if (!nearestVehicle) {
      player.outputChatBox("No hay vehículos cerca.")
      return
    }

    const vehicleId = nearestVehicle.getVariable("vehicleId")
    const result = await this.vehicleManager.impoundVehicle(vehicleId, reason, playerId)

    player.outputChatBox(result.message)

    if (result.success) {
      // Remove vehicle from world
      nearestVehicle.destroy()
      mp.players.broadcast(`Un vehículo ha sido incautado por las autoridades.`)
    }
  }

  private async handleUnimpoundVehicle(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /vunimpound [ID del vehículo]")
      return
    }

    const vehicleId = Number.parseInt(args[1])
    const playerId = player.getVariable("characterId")

    const result = await this.vehicleManager.unimpoundVehicle(vehicleId, playerId)

    player.outputChatBox(result.message)

    if (result.success) {
      // Spawn vehicle at impound lot
      const vehicle = this.vehicleManager.getVehicle(vehicleId)
      if (vehicle) {
        const impoundPos = { x: 409.0, y: -1623.0, z: 29.3 } // Impound lot position

        const spawnedVehicle = mp.vehicles.new(mp.joaat(vehicle.model), impoundPos)
        spawnedVehicle.setVariable("vehicleId", vehicleId)
        spawnedVehicle.numberPlate = vehicle.plate

        player.outputChatBox(`Tu vehículo ha sido liberado y está disponible en el depósito.`)
      }
    }
  }

  private async handleRepairVehicle(player: any): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox("Debes estar en un vehículo.")
      return
    }

    const vehicleId = player.vehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    // Check if at mechanic shop
    const mechanicShops = [
      { x: -356.0, y: -134.0, z: 39.0, radius: 10.0 }, // LS Customs
      { x: 731.0, y: -1088.0, z: 22.0, radius: 10.0 }, // LS Customs 2
      { x: -1155.0, y: -2007.0, z: 13.0, radius: 10.0 }, // LS Customs 3
    ]

    const playerPos = player.position
    const nearMechanic = mechanicShops.some((shop) => this.getDistance(playerPos, shop) <= shop.radius)

    if (!nearMechanic) {
      player.outputChatBox("Debes estar en un taller mecánico para reparar tu vehículo.")
      return
    }

    const result = await this.vehicleManager.repairVehicle(vehicleId)

    if (result.success && result.cost) {
      // Check and deduct money
      const playerData = await Database.query("SELECT money FROM characters WHERE id = ?", [playerId])

      if (!playerData.length || playerData[0].money < result.cost) {
        player.outputChatBox(`No tienes suficiente dinero. Costo: $${result.cost}`)
        return
      }

      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [result.cost, playerId])

      // Repair vehicle visually
      player.vehicle.repair()

      player.outputChatBox(`${result.message} - Costo: $${result.cost}`)
    } else {
      player.outputChatBox(result.message)
    }
  }

  private async handleRefuelVehicle(player: any, args: string[]): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox("Debes estar en un vehículo.")
      return
    }

    // Check if at gas station
    const gasStations = [
      { x: 49.4, y: 2778.8, z: 58.0, radius: 15.0 },
      { x: 263.8, y: 2606.4, z: 44.9, radius: 15.0 },
      { x: 1039.9, y: 2671.1, z: 39.5, radius: 15.0 },
      { x: 1207.2, y: 2660.1, z: 37.8, radius: 15.0 },
      { x: 2539.6, y: 2594.1, z: 37.9, radius: 15.0 },
      { x: 2679.8, y: 3263.9, z: 55.2, radius: 15.0 },
      { x: 2005.0, y: 3773.8, z: 32.4, radius: 15.0 },
      { x: 1687.1, y: 4929.4, z: 42.1, radius: 15.0 },
      { x: 1701.3, y: 6416.0, z: 32.8, radius: 15.0 },
      { x: 179.8, y: 6602.8, z: 31.9, radius: 15.0 },
      { x: -94.4, y: 6419.5, z: 31.6, radius: 15.0 },
      { x: -2554.9, y: 2334.4, z: 33.1, radius: 15.0 },
      { x: -1800.0, y: 803.6, z: 138.7, radius: 15.0 },
      { x: -1437.1, y: -276.7, z: 46.2, radius: 15.0 },
      { x: -2096.2, y: -320.2, z: 13.2, radius: 15.0 },
      { x: -724.6, y: -935.1, z: 19.2, radius: 15.0 },
      { x: -526.0, y: -1211.0, z: 18.2, radius: 15.0 },
      { x: -70.2, y: -1761.8, z: 29.5, radius: 15.0 },
      { x: 265.6, y: -1261.3, z: 29.3, radius: 15.0 },
      { x: 819.6, y: -1028.8, z: 26.4, radius: 15.0 },
      { x: 1208.9, y: -1402.5, z: 35.2, radius: 15.0 },
      { x: 1181.4, y: -330.8, z: 69.3, radius: 15.0 },
      { x: 620.8, y: 269.1, z: 103.1, radius: 15.0 },
      { x: 2581.3, y: 362.0, z: 108.5, radius: 15.0 },
    ]

    const playerPos = player.position
    const nearGasStation = gasStations.some((station) => this.getDistance(playerPos, station) <= station.radius)

    if (!nearGasStation) {
      player.outputChatBox("Debes estar en una gasolinera para repostar.")
      return
    }

    const amount = args.length > 1 ? Number.parseInt(args[1]) : 50
    if (isNaN(amount) || amount <= 0 || amount > 100) {
      player.outputChatBox("Uso: /vrefuel [cantidad] (1-100 litros)")
      return
    }

    const vehicleId = player.vehicle.getVariable("vehicleId")
    const playerId = player.getVariable("characterId")

    const result = await this.vehicleManager.refuelVehicle(vehicleId, amount)

    if (result.success && result.cost) {
      // Check and deduct money
      const playerData = await Database.query("SELECT money FROM characters WHERE id = ?", [playerId])

      if (!playerData.length || playerData[0].money < result.cost) {
        player.outputChatBox(`No tienes suficiente dinero. Costo: $${result.cost}`)
        return
      }

      await Database.query("UPDATE characters SET money = money - ? WHERE id = ?", [result.cost, playerId])
      player.outputChatBox(`${result.message} - Costo: $${result.cost}`)
    } else {
      player.outputChatBox(result.message)
    }
  }

  private async handleSellVehicle(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /vsell [ID del vehículo]")
      return
    }

    const vehicleId = Number.parseInt(args[1])
    const playerId = player.getVariable("characterId")

    // Check if at dealership
    const dealerships = [
      { x: -56.79, y: -1096.85, z: 25.42, radius: 20.0 }, // PDM
      { x: -1255.6, y: -361.16, z: 36.91, radius: 20.0 }, // Simeon's
    ]

    const playerPos = player.position
    const nearDealership = dealerships.some((dealer) => this.getDistance(playerPos, dealer) <= dealer.radius)

    if (!nearDealership) {
      player.outputChatBox("Debes estar en un concesionario para vender tu vehículo.")
      return
    }

    const result = await this.vehicleManager.sellVehicle(vehicleId, playerId)
    player.outputChatBox(result.message)
  }

  private getNearestVehicle(player: any): any {
    let nearestVehicle = null
    let nearestDistance = 5.0 // 5 meter radius

    mp.vehicles.forEach((vehicle: any) => {
      const distance = this.getDistance(player.position, vehicle.position)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestVehicle = vehicle
      }
    })

    return nearestVehicle
  }

  private getDistance(pos1: any, pos2: any): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}
