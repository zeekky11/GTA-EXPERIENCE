import { AdminManager } from "../systems/admin/AdminManager"
import { PlayerManager } from "../systems/player/PlayerManager"
import { Logger } from "../utils/Logger"
import { mp } from "../utils/RageMP" // Declare the mp variable

export class AdminCommands {
  private adminManager: AdminManager
  private playerManager: PlayerManager

  constructor() {
    this.adminManager = AdminManager.getInstance()
    this.playerManager = PlayerManager.getInstance()
    this.registerCommands()
  }

  private registerCommands(): void {
    // Register admin commands with RageMP
    mp.events.add("playerCommand", this.handleCommand.bind(this))
  }

  private async handleCommand(player: any, command: string): Promise<void> {
    const args = command.split(" ")
    const cmd = args[0].toLowerCase()
    const playerId = player.getVariable("characterId")
    const adminLevel = this.adminManager.getAdminLevel(playerId)

    try {
      switch (cmd) {
        // Basic admin commands
        case "/akick":
          if (adminLevel >= 1) await this.handleKick(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/aban":
          if (adminLevel >= 2) await this.handleBan(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/aunban":
          if (adminLevel >= 2) await this.handleUnban(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/amute":
          if (adminLevel >= 1) await this.handleMute(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/aunmute":
          if (adminLevel >= 1) await this.handleUnmute(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/awarn":
          if (adminLevel >= 1) await this.handleWarn(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // Teleportation commands
        case "/goto":
          if (adminLevel >= 2) await this.handleGoto(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/gethere":
          if (adminLevel >= 2) await this.handleGetHere(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/tp":
          if (adminLevel >= 2) await this.handleTeleport(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // Spectate commands
        case "/spec":
        case "/spectate":
          if (adminLevel >= 1) await this.handleSpectate(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/specoff":
          if (adminLevel >= 1) await this.handleSpectateOff(player)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // Utility commands
        case "/noclip":
          if (adminLevel >= 3) await this.handleNoclip(player)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/invisible":
        case "/invis":
          if (adminLevel >= 2) await this.handleInvisible(player)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/freeze":
          if (adminLevel >= 1) await this.handleFreeze(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/unfreeze":
          if (adminLevel >= 1) await this.handleUnfreeze(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // Information commands
        case "/aduty":
          if (adminLevel >= 1) await this.handleAdminDuty(player)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/admins":
          await this.handleAdminList(player)
          break
        case "/reports":
          if (adminLevel >= 1) await this.handleReportList(player)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/acceptreport":
        case "/ar":
          if (adminLevel >= 1) await this.handleAcceptReport(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/closereport":
        case "/cr":
          if (adminLevel >= 1) await this.handleCloseReport(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // High-level admin commands
        case "/setadmin":
          if (adminLevel >= 9) await this.handleSetAdmin(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break
        case "/announce":
        case "/ann":
          if (adminLevel >= 3) await this.handleAnnounce(player, args)
          else player.outputChatBox("No tienes permisos suficientes.")
          break

        // Player report command (available to all players)
        case "/report":
          await this.handleReport(player, args)
          break

        default:
          break
      }
    } catch (error) {
      Logger.error(`Error handling admin command ${cmd}:`, error)
      player.outputChatBox("Error interno del servidor.")
    }
  }

  private async handleKick(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /akick [ID] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const reason = args.slice(2).join(" ")
    const adminId = player.getVariable("characterId")

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")
    const result = await this.adminManager.kickPlayer(targetCharId, adminId, reason)

    player.outputChatBox(result.message)

    if (result.success) {
      targetPlayer.kick(reason)
      mp.players.broadcast(`${targetPlayer.name} ha sido expulsado por un administrador. Razón: ${reason}`)
    }
  }

  private async handleBan(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /aban [ID] [duración en horas, 0 = permanente] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const duration = Number.parseInt(args[2])
    const reason = args.slice(3).join(" ")
    const adminId = player.getVariable("characterId")

    if (isNaN(duration) || duration < 0) {
      player.outputChatBox("Duración inválida.")
      return
    }

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")
    const result = await this.adminManager.banPlayer(targetCharId, adminId, reason, duration)

    player.outputChatBox(result.message)

    if (result.success) {
      targetPlayer.kick(`Baneado: ${reason}`)
      const durationText = duration > 0 ? `${duration} horas` : "permanentemente"
      mp.players.broadcast(`${targetPlayer.name} ha sido baneado ${durationText} por un administrador.`)
    }
  }

  private async handleUnban(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /aunban [ID del personaje] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const reason = args.slice(2).join(" ")
    const adminId = player.getVariable("characterId")

    const result = await this.adminManager.unbanPlayer(targetId, adminId, reason)
    player.outputChatBox(result.message)
  }

  private async handleMute(player: any, args: string[]): Promise<void> {
    if (args.length < 4) {
      player.outputChatBox("Uso: /amute [ID] [duración en minutos] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const duration = Number.parseInt(args[2])
    const reason = args.slice(3).join(" ")
    const adminId = player.getVariable("characterId")

    if (isNaN(duration) || duration <= 0) {
      player.outputChatBox("Duración inválida.")
      return
    }

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")
    const result = await this.adminManager.mutePlayer(targetCharId, adminId, reason, duration)

    player.outputChatBox(result.message)

    if (result.success) {
      targetPlayer.outputChatBox(`Has sido muteado por ${duration} minutos. Razón: ${reason}`)
    }
  }

  private async handleUnmute(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /aunmute [ID] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const reason = args.slice(2).join(" ")
    const adminId = player.getVariable("characterId")

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")
    const result = await this.adminManager.unmutePlayer(targetCharId, adminId, reason)

    player.outputChatBox(result.message)

    if (result.success) {
      targetPlayer.outputChatBox(`Has sido desmuteado. Razón: ${reason}`)
    }
  }

  private async handleWarn(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /awarn [ID] [razón]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const reason = args.slice(2).join(" ")
    const adminId = player.getVariable("characterId")

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")
    const result = await this.adminManager.warnPlayer(targetCharId, adminId, reason)

    player.outputChatBox(result.message)

    if (result.success) {
      targetPlayer.outputChatBox(`=== ADVERTENCIA ADMINISTRATIVA ===`)
      targetPlayer.outputChatBox(`Razón: ${reason}`)
      targetPlayer.outputChatBox(`Administrador: ${player.name}`)
      targetPlayer.outputChatBox(`===================================`)
    }
  }

  private async handleGoto(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /goto [ID]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    player.position = targetPlayer.position
    player.outputChatBox(`Te has teletransportado a ${targetPlayer.name}.`)
  }

  private async handleGetHere(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /gethere [ID]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    targetPlayer.position = player.position
    player.outputChatBox(`${targetPlayer.name} ha sido teletransportado a tu posición.`)
    targetPlayer.outputChatBox(`Has sido teletransportado por un administrador.`)
  }

  private async handleTeleport(player: any, args: string[]): Promise<void> {
    if (args.length < 4) {
      player.outputChatBox("Uso: /tp [x] [y] [z]")
      return
    }

    const x = Number.parseFloat(args[1])
    const y = Number.parseFloat(args[2])
    const z = Number.parseFloat(args[3])

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      player.outputChatBox("Coordenadas inválidas.")
      return
    }

    player.position = new mp.Vector3(x, y, z)
    player.outputChatBox(`Teletransportado a: ${x}, ${y}, ${z}`)
  }

  private async handleSpectate(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /spec [ID]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    // Enable spectate mode (this would be handled by client-side script)
    player.call("startSpectate", [targetPlayer.id])
    player.outputChatBox(`Especteando a ${targetPlayer.name}. Usa /specoff para salir.`)
  }

  private async handleSpectateOff(player: any): Promise<void> {
    // Disable spectate mode
    player.call("stopSpectate")
    player.outputChatBox("Has dejado de espectear.")
  }

  private async handleNoclip(player: any): Promise<void> {
    const currentNoclip = player.getVariable("noclip") || false
    player.setVariable("noclip", !currentNoclip)

    // Enable/disable noclip (this would be handled by client-side script)
    player.call("toggleNoclip", [!currentNoclip])
    player.outputChatBox(`Noclip ${!currentNoclip ? "activado" : "desactivado"}.`)
  }

  private async handleInvisible(player: any): Promise<void> {
    const currentInvis = player.getVariable("invisible") || false
    player.setVariable("invisible", !currentInvis)

    player.alpha = !currentInvis ? 0 : 255
    player.outputChatBox(`Invisibilidad ${!currentInvis ? "activada" : "desactivada"}.`)
  }

  private async handleFreeze(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /freeze [ID]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    targetPlayer.call("freezePlayer", [true])
    player.outputChatBox(`${targetPlayer.name} ha sido congelado.`)
    targetPlayer.outputChatBox("Has sido congelado por un administrador.")
  }

  private async handleUnfreeze(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /unfreeze [ID]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const targetPlayer = mp.players.getById(targetId)

    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    targetPlayer.call("freezePlayer", [false])
    player.outputChatBox(`${targetPlayer.name} ha sido descongelado.`)
    targetPlayer.outputChatBox("Has sido descongelado por un administrador.")
  }

  private async handleAdminDuty(player: any): Promise<void> {
    const currentDuty = player.getVariable("adminDuty") || false
    player.setVariable("adminDuty", !currentDuty)

    const playerId = player.getVariable("characterId")
    const adminLevel = this.adminManager.getAdminLevel(playerId)

    if (!currentDuty) {
      player.outputChatBox("Has entrado en servicio administrativo.")
      mp.players.broadcast(`${player.name} ha entrado en servicio como administrador nivel ${adminLevel}.`)
    } else {
      player.outputChatBox("Has salido del servicio administrativo.")
      mp.players.broadcast(`${player.name} ha salido del servicio administrativo.`)
    }
  }

  private async handleAdminList(player: any): Promise<void> {
    const onlineAdmins: any[] = []

    mp.players.forEach((p: any) => {
      const playerId = p.getVariable("characterId")
      const adminLevel = this.adminManager.getAdminLevel(playerId)
      const onDuty = p.getVariable("adminDuty") || false

      if (adminLevel > 0) {
        onlineAdmins.push({
          name: p.name,
          level: adminLevel,
          onDuty,
        })
      }
    })

    if (onlineAdmins.length === 0) {
      player.outputChatBox("No hay administradores en línea.")
      return
    }

    player.outputChatBox("=== ADMINISTRADORES EN LÍNEA ===")
    for (const admin of onlineAdmins) {
      const dutyStatus = admin.onDuty ? "EN SERVICIO" : "Fuera de servicio"
      player.outputChatBox(`${admin.name} - Nivel ${admin.level} - ${dutyStatus}`)
    }
  }

  private async handleReportList(player: any): Promise<void> {
    const reports = this.adminManager.getActiveReports()

    if (reports.length === 0) {
      player.outputChatBox("No hay reportes activos.")
      return
    }

    player.outputChatBox("=== REPORTES ACTIVOS ===")
    for (const report of reports) {
      const status = report.assigned_admin ? "En progreso" : "Abierto"
      player.outputChatBox(
        `ID: ${report.id} | ${report.reporter_name} vs ${report.reported_name} | ${report.reason} | ${status}`,
      )
    }
  }

  private async handleAcceptReport(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /ar [ID del reporte]")
      return
    }

    const reportId = Number.parseInt(args[1])
    const adminId = player.getVariable("characterId")

    const result = await this.adminManager.acceptReport(reportId, adminId)
    player.outputChatBox(result.message)
  }

  private async handleCloseReport(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /cr [ID del reporte] [resolución]")
      return
    }

    const reportId = Number.parseInt(args[1])
    const resolution = args.slice(2).join(" ")
    const adminId = player.getVariable("characterId")

    const result = await this.adminManager.closeReport(reportId, adminId, resolution)
    player.outputChatBox(result.message)
  }

  private async handleSetAdmin(player: any, args: string[]): Promise<void> {
    if (args.length < 3) {
      player.outputChatBox("Uso: /setadmin [ID] [nivel]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const level = Number.parseInt(args[2])
    const adminId = player.getVariable("characterId")

    if (isNaN(level) || level < 0 || level > 10) {
      player.outputChatBox("Nivel inválido (0-10).")
      return
    }

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")

    // Define permissions based on level
    const permissions = this.getPermissionsByLevel(level)

    const result = await this.adminManager.setAdminLevel(targetCharId, level, permissions, adminId)
    player.outputChatBox(result.message)

    if (result.success && level > 0) {
      targetPlayer.outputChatBox(`Has sido promovido a administrador nivel ${level}.`)
    } else if (result.success && level === 0) {
      targetPlayer.outputChatBox("Tus permisos de administrador han sido removidos.")
    }
  }

  private async handleAnnounce(player: any, args: string[]): Promise<void> {
    if (args.length < 2) {
      player.outputChatBox("Uso: /ann [mensaje]")
      return
    }

    const message = args.slice(1).join(" ")

    mp.players.broadcast("=== ANUNCIO ADMINISTRATIVO ===")
    mp.players.broadcast(message)
    mp.players.broadcast("===============================")

    player.outputChatBox("Anuncio enviado.")
  }

  private async handleReport(player: any, args: string[]): Promise<void> {
    if (args.length < 4) {
      player.outputChatBox("Uso: /report [ID] [razón] [descripción]")
      return
    }

    const targetId = Number.parseInt(args[1])
    const reason = args[2]
    const description = args.slice(3).join(" ")
    const reporterId = player.getVariable("characterId")

    const targetPlayer = mp.players.getById(targetId)
    if (!targetPlayer) {
      player.outputChatBox("Jugador no encontrado.")
      return
    }

    const targetCharId = targetPlayer.getVariable("characterId")

    if (targetCharId === reporterId) {
      player.outputChatBox("No puedes reportarte a ti mismo.")
      return
    }

    const result = await this.adminManager.createReport(reporterId, targetCharId, reason, description)
    player.outputChatBox(result.message)

    if (result.success) {
      // Notify online admins
      mp.players.forEach((p: any) => {
        const playerId = p.getVariable("characterId")
        const adminLevel = this.adminManager.getAdminLevel(playerId)

        if (adminLevel > 0) {
          p.outputChatBox(`[REPORTE] ${player.name} reportó a ${targetPlayer.name} por ${reason}`)
        }
      })
    }
  }

  private getPermissionsByLevel(level: number): string[] {
    const permissions: { [key: number]: string[] } = {
      0: [],
      1: ["kick", "mute", "unmute", "warn", "handle_reports", "spectate"],
      2: ["ban", "unban", "teleport", "invisible"],
      3: ["noclip", "announce", "freeze"],
      4: ["vehicle_admin", "property_admin"],
      5: ["faction_admin", "job_admin"],
      6: ["economy_admin"],
      7: ["server_admin"],
      8: ["senior_admin"],
      9: ["set_admin", "close_any_report"],
      10: ["*"], // All permissions
    }

    const playerPermissions: string[] = []
    for (let i = 1; i <= level; i++) {
      if (permissions[i]) {
        playerPermissions.push(...permissions[i])
      }
    }

    return [...new Set(playerPermissions)] // Remove duplicates
  }
}
