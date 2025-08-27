import type { EventManager } from "../../core/EventManager"
import type { Database } from "../../core/database"
import { Logger } from "../../utils/Logger"
import type { AdminLevel, AdminAction, PlayerReport } from "../../types"

export class AdminManager {
  private static instance: AdminManager
  private database: Database
  private eventManager: EventManager
  private logger: Logger
  private adminLevels: Map<number, AdminLevel> = new Map()
  private activeReports: Map<number, PlayerReport> = new Map()
  private adminActions: AdminAction[] = []

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.logger = new Logger("AdminManager")

    this.initializeEvents()
    this.loadAdminLevels()
    this.loadActiveReports()
  }

  public static getInstance(database: Database, eventManager: EventManager): AdminManager {
    if (!AdminManager.instance) {
      AdminManager.instance = new AdminManager(database, eventManager)
    }
    return AdminManager.instance
  }

  private initializeEvents(): void {
    // Admin action events
    this.eventManager.on("admin:kick", this.handleKick.bind(this))
    this.eventManager.on("admin:ban", this.handleBan.bind(this))
    this.eventManager.on("admin:unban", this.handleUnban.bind(this))
    this.eventManager.on("admin:mute", this.handleMute.bind(this))
    this.eventManager.on("admin:unmute", this.handleUnmute.bind(this))
    this.eventManager.on("admin:warn", this.handleWarn.bind(this))
    this.eventManager.on("admin:teleport", this.handleTeleport.bind(this))
    this.eventManager.on("admin:spectate", this.handleSpectate.bind(this))

    // Report events
    this.eventManager.on("report:create", this.handleCreateReport.bind(this))
    this.eventManager.on("report:accept", this.handleAcceptReport.bind(this))
    this.eventManager.on("report:close", this.handleCloseReport.bind(this))
  }

  private async loadAdminLevels(): Promise<void> {
    try {
      const query = "SELECT player_id, level, permissions FROM admin_levels WHERE active = 1"
      const results = await this.database.query(query)

      for (const row of results) {
        this.adminLevels.set(row.player_id, {
          player_id: row.player_id,
          level: row.level,
          permissions: JSON.parse(row.permissions),
          active: true,
        })
      }

      this.logger.info(`Loaded ${this.adminLevels.size} admin levels`)
    } catch (error) {
      this.logger.error("Error loading admin levels:", error)
    }
  }

  private async loadActiveReports(): Promise<void> {
    try {
      const query = `
                SELECT r.*, c1.name as reporter_name, c2.name as reported_name
                FROM player_reports r
                JOIN characters c1 ON r.reporter_id = c1.id
                JOIN characters c2 ON r.reported_id = c2.id
                WHERE r.status = 'open'
            `
      const results = await this.database.query(query)

      for (const row of results) {
        this.activeReports.set(row.id, {
          id: row.id,
          reporter_id: row.reporter_id,
          reported_id: row.reported_id,
          reason: row.reason,
          description: row.description,
          status: row.status,
          assigned_admin: row.assigned_admin,
          created_at: row.created_at,
          reporter_name: row.reporter_name,
          reported_name: row.reported_name,
        })
      }

      this.logger.info(`Loaded ${this.activeReports.size} active reports`)
    } catch (error) {
      this.logger.error("Error loading active reports:", error)
    }
  }

  public getAdminLevel(playerId: number): number {
    const admin = this.adminLevels.get(playerId)
    return admin ? admin.level : 0
  }

  public hasPermission(playerId: number, permission: string): boolean {
    const admin = this.adminLevels.get(playerId)
    if (!admin) return false

    return admin.permissions.includes(permission) || admin.permissions.includes("*")
  }

  public async setAdminLevel(
    playerId: number,
    level: number,
    permissions: string[],
    setBy: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (level < 0 || level > 10) {
        return { success: false, message: "Nivel de admin inválido (0-10)" }
      }

      // Insert or update admin level
      await this.database.query(
        `INSERT INTO admin_levels (player_id, level, permissions, set_by, created_at) 
                 VALUES (?, ?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE level = ?, permissions = ?, set_by = ?, updated_at = NOW()`,
        [playerId, level, JSON.stringify(permissions), setBy, level, JSON.stringify(permissions), setBy],
      )

      // Update memory
      if (level > 0) {
        this.adminLevels.set(playerId, {
          player_id: playerId,
          level,
          permissions,
          active: true,
        })
      } else {
        this.adminLevels.delete(playerId)
      }

      // Log action
      await this.logAdminAction(setBy, "SET_ADMIN_LEVEL", playerId, `Set admin level to ${level}`)

      this.logger.info(`Admin level set: Player ${playerId} -> Level ${level} by ${setBy}`)
      return { success: true, message: `Nivel de admin establecido a ${level}` }
    } catch (error) {
      this.logger.error("Error setting admin level:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async kickPlayer(
    targetId: number,
    adminId: number,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "kick")) {
        return { success: false, message: "No tienes permisos para expulsar jugadores" }
      }

      // Log action
      await this.logAdminAction(adminId, "KICK", targetId, reason)

      // Kick player (this would be handled by RageMP)
      this.eventManager.emit("player:kick", { playerId: targetId, reason, adminId })

      this.logger.info(`Player ${targetId} kicked by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador expulsado correctamente" }
    } catch (error) {
      this.logger.error("Error kicking player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async banPlayer(
    targetId: number,
    adminId: number,
    reason: string,
    duration = 0, // 0 = permanent
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "ban")) {
        return { success: false, message: "No tienes permisos para banear jugadores" }
      }

      const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60 * 60 * 1000) : null

      // Insert ban record
      await this.database.query(
        "INSERT INTO player_bans (player_id, banned_by, reason, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())",
        [targetId, adminId, reason, expiresAt],
      )

      // Log action
      const durationText = duration > 0 ? `${duration} hours` : "permanent"
      await this.logAdminAction(adminId, "BAN", targetId, `${reason} (${durationText})`)

      // Kick player if online
      this.eventManager.emit("player:kick", { playerId: targetId, reason: `Baneado: ${reason}`, adminId })

      this.logger.info(`Player ${targetId} banned by admin ${adminId}. Duration: ${durationText}. Reason: ${reason}`)
      return { success: true, message: `Jugador baneado por ${durationText}` }
    } catch (error) {
      this.logger.error("Error banning player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async unbanPlayer(
    targetId: number,
    adminId: number,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "unban")) {
        return { success: false, message: "No tienes permisos para desbanear jugadores" }
      }

      // Update ban record
      const result = await this.database.query(
        "UPDATE player_bans SET active = 0, unbanned_by = ?, unban_reason = ?, unbanned_at = NOW() WHERE player_id = ? AND active = 1",
        [adminId, reason, targetId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "El jugador no está baneado" }
      }

      // Log action
      await this.logAdminAction(adminId, "UNBAN", targetId, reason)

      this.logger.info(`Player ${targetId} unbanned by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador desbaneado correctamente" }
    } catch (error) {
      this.logger.error("Error unbanning player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async mutePlayer(
    targetId: number,
    adminId: number,
    reason: string,
    duration: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "mute")) {
        return { success: false, message: "No tienes permisos para mutear jugadores" }
      }

      const expiresAt = new Date(Date.now() + duration * 60 * 1000) // duration in minutes

      // Insert mute record
      await this.database.query(
        "INSERT INTO player_mutes (player_id, muted_by, reason, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())",
        [targetId, adminId, reason, expiresAt],
      )

      // Log action
      await this.logAdminAction(adminId, "MUTE", targetId, `${reason} (${duration} minutes)`)

      this.logger.info(`Player ${targetId} muted by admin ${adminId}. Duration: ${duration} minutes. Reason: ${reason}`)
      return { success: true, message: `Jugador muteado por ${duration} minutos` }
    } catch (error) {
      this.logger.error("Error muting player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async unmutePlayer(
    targetId: number,
    adminId: number,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "unmute")) {
        return { success: false, message: "No tienes permisos para desmutear jugadores" }
      }

      // Update mute record
      const result = await this.database.query(
        "UPDATE player_mutes SET active = 0, unmuted_by = ?, unmute_reason = ?, unmuted_at = NOW() WHERE player_id = ? AND active = 1",
        [adminId, reason, targetId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "El jugador no está muteado" }
      }

      // Log action
      await this.logAdminAction(adminId, "UNMUTE", targetId, reason)

      this.logger.info(`Player ${targetId} unmuted by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador desmuteado correctamente" }
    } catch (error) {
      this.logger.error("Error unmuting player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async warnPlayer(
    targetId: number,
    adminId: number,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "warn")) {
        return { success: false, message: "No tienes permisos para advertir jugadores" }
      }

      // Insert warning
      await this.database.query(
        "INSERT INTO player_warnings (player_id, warned_by, reason, created_at) VALUES (?, ?, ?, NOW())",
        [targetId, adminId, reason],
      )

      // Log action
      await this.logAdminAction(adminId, "WARN", targetId, reason)

      // Notify player if online
      this.eventManager.emit("player:warn", { playerId: targetId, reason, adminId })

      this.logger.info(`Player ${targetId} warned by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Advertencia enviada correctamente" }
    } catch (error) {
      this.logger.error("Error warning player:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async createReport(
    reporterId: number,
    reportedId: number,
    reason: string,
    description: string,
  ): Promise<{ success: boolean; message: string; reportId?: number }> {
    try {
      // Check if reporter has an active report
      const existingReport = Array.from(this.activeReports.values()).find(
        (report) => report.reporter_id === reporterId && report.status === "open",
      )

      if (existingReport) {
        return { success: false, message: "Ya tienes un reporte activo" }
      }

      // Insert report
      const result = await this.database.query(
        "INSERT INTO player_reports (reporter_id, reported_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, 'open', NOW())",
        [reporterId, reportedId, reason, description],
      )

      const reportId = result.insertId

      // Get names for memory storage
      const reporterName = await this.getCharacterName(reporterId)
      const reportedName = await this.getCharacterName(reportedId)

      // Add to memory
      this.activeReports.set(reportId, {
        id: reportId,
        reporter_id: reporterId,
        reported_id: reportedId,
        reason,
        description,
        status: "open",
        assigned_admin: null,
        created_at: new Date(),
        reporter_name: reporterName,
        reported_name: reportedName,
      })

      // Notify online admins
      this.eventManager.emit("admin:newReport", { reportId, reporterId, reportedId, reason })

      this.logger.info(`New report created: ${reportId} by ${reporterId} against ${reportedId}`)
      return { success: true, message: "Reporte enviado correctamente", reportId }
    } catch (error) {
      this.logger.error("Error creating report:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async acceptReport(reportId: number, adminId: number): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.hasPermission(adminId, "handle_reports")) {
        return { success: false, message: "No tienes permisos para manejar reportes" }
      }

      const report = this.activeReports.get(reportId)
      if (!report) {
        return { success: false, message: "Reporte no encontrado" }
      }

      if (report.assigned_admin) {
        return { success: false, message: "El reporte ya está siendo manejado por otro admin" }
      }

      // Update report
      await this.database.query("UPDATE player_reports SET assigned_admin = ?, status = 'in_progress' WHERE id = ?", [
        adminId,
        reportId,
      ])

      // Update memory
      report.assigned_admin = adminId
      report.status = "in_progress"

      this.logger.info(`Report ${reportId} accepted by admin ${adminId}`)
      return { success: true, message: "Reporte aceptado" }
    } catch (error) {
      this.logger.error("Error accepting report:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async closeReport(
    reportId: number,
    adminId: number,
    resolution: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const report = this.activeReports.get(reportId)
      if (!report) {
        return { success: false, message: "Reporte no encontrado" }
      }

      if (report.assigned_admin !== adminId && !this.hasPermission(adminId, "close_any_report")) {
        return { success: false, message: "No puedes cerrar este reporte" }
      }

      // Update report
      await this.database.query(
        "UPDATE player_reports SET status = 'closed', resolution = ?, closed_by = ?, closed_at = NOW() WHERE id = ?",
        [resolution, adminId, reportId],
      )

      // Remove from memory
      this.activeReports.delete(reportId)

      // Notify reporter if online
      this.eventManager.emit("player:reportClosed", { playerId: report.reporter_id, reportId, resolution })

      this.logger.info(`Report ${reportId} closed by admin ${adminId}`)
      return { success: true, message: "Reporte cerrado correctamente" }
    } catch (error) {
      this.logger.error("Error closing report:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async logAdminAction(adminId: number, action: string, targetId: number, details: string): Promise<void> {
    try {
      await this.database.query(
        "INSERT INTO admin_logs (admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, NOW())",
        [adminId, action, targetId, details],
      )

      // Keep in memory for recent actions
      this.adminActions.push({
        id: 0, // Will be set by database
        admin_id: adminId,
        action,
        target_id: targetId,
        details,
        created_at: new Date(),
      })

      // Keep only last 100 actions in memory
      if (this.adminActions.length > 100) {
        this.adminActions = this.adminActions.slice(-100)
      }
    } catch (error) {
      this.logger.error("Error logging admin action:", error)
    }
  }

  public getActiveReports(): PlayerReport[] {
    return Array.from(this.activeReports.values())
  }

  public getRecentAdminActions(): AdminAction[] {
    return this.adminActions.slice(-20) // Last 20 actions
  }

  public async isPlayerBanned(playerId: number): Promise<boolean> {
    try {
      const result = await this.database.query(
        "SELECT id FROM player_bans WHERE player_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW())",
        [playerId],
      )
      return result.length > 0
    } catch (error) {
      this.logger.error("Error checking ban status:", error)
      return false
    }
  }

  public async isPlayerMuted(playerId: number): Promise<boolean> {
    try {
      const result = await this.database.query(
        "SELECT id FROM player_mutes WHERE player_id = ? AND active = 1 AND expires_at > NOW()",
        [playerId],
      )
      return result.length > 0
    } catch (error) {
      this.logger.error("Error checking mute status:", error)
      return false
    }
  }

  private async getCharacterName(playerId: number): Promise<string> {
    try {
      const result = await this.database.query("SELECT name FROM characters WHERE id = ?", [playerId])
      return result.length > 0 ? result[0].name : "Unknown"
    } catch (error) {
      this.logger.error("Error getting character name:", error)
      return "Unknown"
    }
  }

  // Command handling methods
  public isAdminCommand(command: string): boolean {
    const adminCommands = [
      "akick",
      "aban",
      "aunban",
      "amute",
      "aunmute",
      "awarn",
      "goto",
      "gethere",
      "spec",
      "aduty",
      "setadmin",
      "reports",
      "acceptreport",
      "closereport",
    ]
    return adminCommands.includes(command)
  }

  public async handleCommand(player: any, command: string, params: string[]): Promise<void> {
    const adminLevel = this.getAdminLevel(player.id)

    if (adminLevel === 0) {
      player.outputChatBox("No tienes permisos de administrador.")
      return
    }

    switch (command) {
      case "akick":
        if (params.length < 2) {
          player.outputChatBox("Uso: /akick [id] [razón]")
          return
        }
        const kickResult = await this.kickPlayer(Number.parseInt(params[0]), player.id, params.slice(1).join(" "))
        player.outputChatBox(kickResult.message)
        break

      case "aban":
        if (params.length < 2) {
          player.outputChatBox("Uso: /aban [id] [razón] [horas (opcional)]")
          return
        }
        const duration = params[2] ? Number.parseInt(params[2]) : 0
        const banResult = await this.banPlayer(Number.parseInt(params[0]), player.id, params[1], duration)
        player.outputChatBox(banResult.message)
        break

      case "setadmin":
        if (params.length < 2) {
          player.outputChatBox("Uso: /setadmin [id] [nivel]")
          return
        }
        const level = Number.parseInt(params[1])
        const defaultPermissions = this.getDefaultPermissions(level)
        const setAdminResult = await this.setAdminLevel(
          Number.parseInt(params[0]),
          level,
          defaultPermissions,
          player.id,
        )
        player.outputChatBox(setAdminResult.message)
        break

      default:
        player.outputChatBox("Comando de admin no reconocido.")
    }
  }

  private getDefaultPermissions(level: number): string[] {
    const permissions: string[] = []

    if (level >= 1) permissions.push("kick", "warn", "handle_reports")
    if (level >= 2) permissions.push("mute", "unmute")
    if (level >= 3) permissions.push("ban", "unban")
    if (level >= 4) permissions.push("teleport", "spectate")
    if (level >= 5) permissions.push("set_admin_level")
    if (level >= 10) permissions.push("*") // All permissions

    return permissions
  }

  // Event handlers remain the same but use instance methods
  private async handleKick(data: any): Promise<void> {
    const result = await this.kickPlayer(data.targetId, data.adminId, data.reason)
    this.eventManager.emit("admin:kickResult", { adminId: data.adminId, result })
  }

  private async handleBan(data: any): Promise<void> {
    const result = await this.banPlayer(data.targetId, data.adminId, data.reason, data.duration)
    this.eventManager.emit("admin:banResult", { adminId: data.adminId, result })
  }

  private async handleUnban(data: any): Promise<void> {
    const result = await this.unbanPlayer(data.targetId, data.adminId, data.reason)
    this.eventManager.emit("admin:unbanResult", { adminId: data.adminId, result })
  }

  private async handleMute(data: any): Promise<void> {
    const result = await this.mutePlayer(data.targetId, data.adminId, data.reason, data.duration)
    this.eventManager.emit("admin:muteResult", { adminId: data.adminId, result })
  }

  private async handleUnmute(data: any): Promise<void> {
    const result = await this.unmutePlayer(data.targetId, data.adminId, data.reason)
    this.eventManager.emit("admin:unmuteResult", { adminId: data.adminId, result })
  }

  private async handleWarn(data: any): Promise<void> {
    const result = await this.warnPlayer(data.targetId, data.adminId, data.reason)
    this.eventManager.emit("admin:warnResult", { adminId: data.adminId, result })
  }

  private async handleTeleport(data: any): Promise<void> {
    // This would be handled by RageMP teleportation
    this.eventManager.emit("player:teleport", data)
  }

  private async handleSpectate(data: any): Promise<void> {
    // This would be handled by RageMP spectate mode
    this.eventManager.emit("player:spectate", data)
  }

  private async handleCreateReport(data: any): Promise<void> {
    const result = await this.createReport(data.reporterId, data.reportedId, data.reason, data.description)
    this.eventManager.emit("report:createResult", { playerId: data.reporterId, result })
  }

  private async handleAcceptReport(data: any): Promise<void> {
    const result = await this.acceptReport(data.reportId, data.adminId)
    this.eventManager.emit("report:acceptResult", { adminId: data.adminId, result })
  }

  private async handleCloseReport(data: any): Promise<void> {
    const result = await this.closeReport(data.reportId, data.adminId, data.resolution)
    this.eventManager.emit("report:closeResult", { adminId: data.adminId, result })
  }
}
