import { EventManager } from "../../core/EventManager"
import { Database } from "../../core/database"
import { Logger } from "../../utils/Logger"
import type { AdminLevel, AdminAction, PlayerReport } from "../../types"

export class AdminManager {
  private static instance: AdminManager
  private adminLevels: Map<number, AdminLevel> = new Map()
  private activeReports: Map<number, PlayerReport> = new Map()
  private adminActions: AdminAction[] = []

  private constructor() {
    this.initializeEvents()
    this.loadAdminLevels()
    this.loadActiveReports()
  }

  public static getInstance(): AdminManager {
    if (!AdminManager.instance) {
      AdminManager.instance = new AdminManager()
    }
    return AdminManager.instance
  }

  private initializeEvents(): void {
    // Admin action events
    EventManager.on("admin:kick", this.handleKick.bind(this))
    EventManager.on("admin:ban", this.handleBan.bind(this))
    EventManager.on("admin:unban", this.handleUnban.bind(this))
    EventManager.on("admin:mute", this.handleMute.bind(this))
    EventManager.on("admin:unmute", this.handleUnmute.bind(this))
    EventManager.on("admin:warn", this.handleWarn.bind(this))
    EventManager.on("admin:teleport", this.handleTeleport.bind(this))
    EventManager.on("admin:spectate", this.handleSpectate.bind(this))

    // Report events
    EventManager.on("report:create", this.handleCreateReport.bind(this))
    EventManager.on("report:accept", this.handleAcceptReport.bind(this))
    EventManager.on("report:close", this.handleCloseReport.bind(this))
  }

  private async loadAdminLevels(): Promise<void> {
    try {
      const query = "SELECT player_id, level, permissions FROM admin_levels WHERE active = 1"
      const results = await Database.query(query)

      for (const row of results) {
        this.adminLevels.set(row.player_id, {
          player_id: row.player_id,
          level: row.level,
          permissions: JSON.parse(row.permissions),
          active: true,
        })
      }

      Logger.info(`Loaded ${this.adminLevels.size} admin levels`)
    } catch (error) {
      Logger.error("Error loading admin levels:", error)
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
      const results = await Database.query(query)

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

      Logger.info(`Loaded ${this.activeReports.size} active reports`)
    } catch (error) {
      Logger.error("Error loading active reports:", error)
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
      await Database.query(
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

      Logger.info(`Admin level set: Player ${playerId} -> Level ${level} by ${setBy}`)
      return { success: true, message: `Nivel de admin establecido a ${level}` }
    } catch (error) {
      Logger.error("Error setting admin level:", error)
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
      EventManager.emit("player:kick", { playerId: targetId, reason, adminId })

      Logger.info(`Player ${targetId} kicked by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador expulsado correctamente" }
    } catch (error) {
      Logger.error("Error kicking player:", error)
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
      await Database.query(
        "INSERT INTO player_bans (player_id, banned_by, reason, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())",
        [targetId, adminId, reason, expiresAt],
      )

      // Log action
      const durationText = duration > 0 ? `${duration} hours` : "permanent"
      await this.logAdminAction(adminId, "BAN", targetId, `${reason} (${durationText})`)

      // Kick player if online
      EventManager.emit("player:kick", { playerId: targetId, reason: `Baneado: ${reason}`, adminId })

      Logger.info(`Player ${targetId} banned by admin ${adminId}. Duration: ${durationText}. Reason: ${reason}`)
      return { success: true, message: `Jugador baneado por ${durationText}` }
    } catch (error) {
      Logger.error("Error banning player:", error)
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
      const result = await Database.query(
        "UPDATE player_bans SET active = 0, unbanned_by = ?, unban_reason = ?, unbanned_at = NOW() WHERE player_id = ? AND active = 1",
        [adminId, reason, targetId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "El jugador no está baneado" }
      }

      // Log action
      await this.logAdminAction(adminId, "UNBAN", targetId, reason)

      Logger.info(`Player ${targetId} unbanned by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador desbaneado correctamente" }
    } catch (error) {
      Logger.error("Error unbanning player:", error)
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
      await Database.query(
        "INSERT INTO player_mutes (player_id, muted_by, reason, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())",
        [targetId, adminId, reason, expiresAt],
      )

      // Log action
      await this.logAdminAction(adminId, "MUTE", targetId, `${reason} (${duration} minutes)`)

      Logger.info(`Player ${targetId} muted by admin ${adminId}. Duration: ${duration} minutes. Reason: ${reason}`)
      return { success: true, message: `Jugador muteado por ${duration} minutos` }
    } catch (error) {
      Logger.error("Error muting player:", error)
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
      const result = await Database.query(
        "UPDATE player_mutes SET active = 0, unmuted_by = ?, unmute_reason = ?, unmuted_at = NOW() WHERE player_id = ? AND active = 1",
        [adminId, reason, targetId],
      )

      if (result.affectedRows === 0) {
        return { success: false, message: "El jugador no está muteado" }
      }

      // Log action
      await this.logAdminAction(adminId, "UNMUTE", targetId, reason)

      Logger.info(`Player ${targetId} unmuted by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Jugador desmuteado correctamente" }
    } catch (error) {
      Logger.error("Error unmuting player:", error)
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
      await Database.query(
        "INSERT INTO player_warnings (player_id, warned_by, reason, created_at) VALUES (?, ?, ?, NOW())",
        [targetId, adminId, reason],
      )

      // Log action
      await this.logAdminAction(adminId, "WARN", targetId, reason)

      // Notify player if online
      EventManager.emit("player:warn", { playerId: targetId, reason, adminId })

      Logger.info(`Player ${targetId} warned by admin ${adminId}. Reason: ${reason}`)
      return { success: true, message: "Advertencia enviada correctamente" }
    } catch (error) {
      Logger.error("Error warning player:", error)
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
      const result = await Database.query(
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
      EventManager.emit("admin:newReport", { reportId, reporterId, reportedId, reason })

      Logger.info(`New report created: ${reportId} by ${reporterId} against ${reportedId}`)
      return { success: true, message: "Reporte enviado correctamente", reportId }
    } catch (error) {
      Logger.error("Error creating report:", error)
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
      await Database.query("UPDATE player_reports SET assigned_admin = ?, status = 'in_progress' WHERE id = ?", [
        adminId,
        reportId,
      ])

      // Update memory
      report.assigned_admin = adminId
      report.status = "in_progress"

      Logger.info(`Report ${reportId} accepted by admin ${adminId}`)
      return { success: true, message: "Reporte aceptado" }
    } catch (error) {
      Logger.error("Error accepting report:", error)
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
      await Database.query(
        "UPDATE player_reports SET status = 'closed', resolution = ?, closed_by = ?, closed_at = NOW() WHERE id = ?",
        [resolution, adminId, reportId],
      )

      // Remove from memory
      this.activeReports.delete(reportId)

      // Notify reporter if online
      EventManager.emit("player:reportClosed", { playerId: report.reporter_id, reportId, resolution })

      Logger.info(`Report ${reportId} closed by admin ${adminId}`)
      return { success: true, message: "Reporte cerrado correctamente" }
    } catch (error) {
      Logger.error("Error closing report:", error)
      return { success: false, message: "Error interno del servidor" }
    }
  }

  public async logAdminAction(adminId: number, action: string, targetId: number, details: string): Promise<void> {
    try {
      await Database.query(
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
      Logger.error("Error logging admin action:", error)
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
      const result = await Database.query(
        "SELECT id FROM player_bans WHERE player_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW())",
        [playerId],
      )
      return result.length > 0
    } catch (error) {
      Logger.error("Error checking ban status:", error)
      return false
    }
  }

  public async isPlayerMuted(playerId: number): Promise<boolean> {
    try {
      const result = await Database.query(
        "SELECT id FROM player_mutes WHERE player_id = ? AND active = 1 AND expires_at > NOW()",
        [playerId],
      )
      return result.length > 0
    } catch (error) {
      Logger.error("Error checking mute status:", error)
      return false
    }
  }

  private async getCharacterName(playerId: number): Promise<string> {
    try {
      const result = await Database.query("SELECT name FROM characters WHERE id = ?", [playerId])
      return result.length > 0 ? result[0].name : "Unknown"
    } catch (error) {
      Logger.error("Error getting character name:", error)
      return "Unknown"
    }
  }

  // Event handlers
  private async handleKick(data: any): Promise<void> {
    const result = await this.kickPlayer(data.targetId, data.adminId, data.reason)
    EventManager.emit("admin:kickResult", { adminId: data.adminId, result })
  }

  private async handleBan(data: any): Promise<void> {
    const result = await this.banPlayer(data.targetId, data.adminId, data.reason, data.duration)
    EventManager.emit("admin:banResult", { adminId: data.adminId, result })
  }

  private async handleUnban(data: any): Promise<void> {
    const result = await this.unbanPlayer(data.targetId, data.adminId, data.reason)
    EventManager.emit("admin:unbanResult", { adminId: data.adminId, result })
  }

  private async handleMute(data: any): Promise<void> {
    const result = await this.mutePlayer(data.targetId, data.adminId, data.reason, data.duration)
    EventManager.emit("admin:muteResult", { adminId: data.adminId, result })
  }

  private async handleUnmute(data: any): Promise<void> {
    const result = await this.unmutePlayer(data.targetId, data.adminId, data.reason)
    EventManager.emit("admin:unmuteResult", { adminId: data.adminId, result })
  }

  private async handleWarn(data: any): Promise<void> {
    const result = await this.warnPlayer(data.targetId, data.adminId, data.reason)
    EventManager.emit("admin:warnResult", { adminId: data.adminId, result })
  }

  private async handleTeleport(data: any): Promise<void> {
    // This would be handled by RageMP teleportation
    EventManager.emit("player:teleport", data)
  }

  private async handleSpectate(data: any): Promise<void> {
    // This would be handled by RageMP spectate mode
    EventManager.emit("player:spectate", data)
  }

  private async handleCreateReport(data: any): Promise<void> {
    const result = await this.createReport(data.reporterId, data.reportedId, data.reason, data.description)
    EventManager.emit("report:createResult", { playerId: data.reporterId, result })
  }

  private async handleAcceptReport(data: any): Promise<void> {
    const result = await this.acceptReport(data.reportId, data.adminId)
    EventManager.emit("report:acceptResult", { adminId: data.adminId, result })
  }

  private async handleCloseReport(data: any): Promise<void> {
    const result = await this.closeReport(data.reportId, data.adminId, data.resolution)
    EventManager.emit("report:closeResult", { adminId: data.adminId, result })
  }
}
