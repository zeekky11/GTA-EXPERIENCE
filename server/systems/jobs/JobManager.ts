/**
 * Job Manager - Handles all job-related functionality including hiring, firing, and job progression
 */

import type { Database } from "../../core/database"
import type { EventManager } from "../../core/EventManager"
import { Logger } from "../../utils/Logger"
import type { Job } from "../../types"
import { EconomyManager } from "../economy/EconomyManager"

export interface JobApplication {
  characterId: number
  jobId: number
  applicationDate: Date
  status: "pending" | "approved" | "rejected"
}

export class JobManager {
  private database: Database
  private eventManager: EventManager
  private economyManager: EconomyManager
  private logger: Logger
  private availableJobs: Map<number, Job> = new Map()
  private jobApplications: Map<number, JobApplication> = new Map()

  constructor(database: Database, eventManager: EventManager) {
    this.database = database
    this.eventManager = eventManager
    this.economyManager = new EconomyManager(database, eventManager)
    this.logger = new Logger("JobManager")

    this.registerEvents()
    this.loadJobs()
    this.startPayrollSystem()
  }

  private registerEvents(): void {
    this.eventManager.on("job:apply", this.handleJobApplication.bind(this))
    this.eventManager.on("job:quit", this.handleJobQuit.bind(this))
    this.eventManager.on("job:fire", this.handleJobFire.bind(this))
    this.eventManager.on("job:promote", this.handleJobPromotion.bind(this))
    this.eventManager.on("job:demote", this.handleJobDemotion.bind(this))
  }

  private async loadJobs(): Promise<void> {
    try {
      const jobs = await this.database.query("SELECT * FROM jobs ORDER BY name")

      for (const job of jobs) {
        this.availableJobs.set(job.id, job)
      }

      this.logger.success(`Loaded ${jobs.length} jobs`)
    } catch (error) {
      this.logger.error("Error loading jobs:", error)
    }
  }

  private startPayrollSystem(): void {
    // Run payroll every hour (3600000 ms)
    setInterval(() => {
      this.processPayroll()
    }, 3600000)

    this.logger.info("Payroll system started (runs every hour)")
  }

  public async handleJobApplication(player: any, jobId: number): Promise<void> {
    try {
      if (!player.characterData) {
        this.sendJobMessage(player, "You must have a character to apply for jobs.", "error")
        return
      }

      if (player.characterData.job_id) {
        this.sendJobMessage(player, "You already have a job. Quit your current job first.", "error")
        return
      }

      const job = this.availableJobs.get(jobId)
      if (!job) {
        this.sendJobMessage(player, "Invalid job selected.", "error")
        return
      }

      // Check if job has available slots
      const currentEmployees = await this.getJobEmployeeCount(jobId)
      if (job.max_employees > 0 && currentEmployees >= job.max_employees) {
        this.sendJobMessage(player, "This job has no available positions.", "error")
        return
      }

      // Check level requirement
      const characterLevel = await this.getCharacterLevel(player.characterData.id)
      if (characterLevel < job.required_level) {
        this.sendJobMessage(player, `You need to be level ${job.required_level} to apply for this job.`, "error")
        return
      }

      // Government jobs require approval
      if (job.is_government) {
        await this.createJobApplication(player.characterData.id, jobId)
        this.sendJobMessage(player, "Your application has been submitted for review.", "success")
        this.notifyJobSupervisors(
          jobId,
          `${player.characterData.first_name} ${player.characterData.last_name} applied for ${job.name}`,
        )
      } else {
        // Civilian jobs are auto-approved
        await this.hirePlayer(player, jobId)
      }
    } catch (error) {
      this.logger.error("Error handling job application:", error)
      this.sendJobMessage(player, "An error occurred while processing your application.", "error")
    }
  }

  private async handleJobQuit(player: any): Promise<void> {
    try {
      if (!player.characterData || !player.characterData.job_id) {
        this.sendJobMessage(player, "You don't have a job to quit.", "error")
        return
      }

      const job = this.availableJobs.get(player.characterData.job_id)
      await this.database.query("UPDATE characters SET job_id = NULL WHERE id = ?", [player.characterData.id])

      player.characterData.job_id = null
      player.jobData = null

      this.sendJobMessage(player, `You have quit your job as ${job?.name || "Unknown"}.`, "success")
      this.logger.info(`${player.characterData.first_name} ${player.characterData.last_name} quit job: ${job?.name}`)

      this.eventManager.emit("job:player_quit", player, job)
    } catch (error) {
      this.logger.error("Error handling job quit:", error)
      this.sendJobMessage(player, "An error occurred while quitting your job.", "error")
    }
  }

  private async handleJobFire(supervisor: any, targetName: string): Promise<void> {
    try {
      if (!supervisor.jobData || !this.canManageEmployees(supervisor)) {
        this.sendJobMessage(supervisor, "You don't have permission to fire employees.", "error")
        return
      }

      const targetPlayer = global.AmericanRP.getPlayerManager().getPlayerByName(targetName)
      if (!targetPlayer || !targetPlayer.characterData) {
        this.sendJobMessage(supervisor, "Player not found or not logged in.", "error")
        return
      }

      if (targetPlayer.characterData.job_id !== supervisor.characterData.job_id) {
        this.sendJobMessage(supervisor, "This player is not in your department.", "error")
        return
      }

      await this.database.query("UPDATE characters SET job_id = NULL WHERE id = ?", [targetPlayer.characterData.id])

      targetPlayer.characterData.job_id = null
      targetPlayer.jobData = null

      this.sendJobMessage(
        supervisor,
        `You have fired ${targetPlayer.characterData.first_name} ${targetPlayer.characterData.last_name}.`,
        "success",
      )
      this.sendJobMessage(
        targetPlayer,
        `You have been fired from your job by ${supervisor.characterData.first_name} ${supervisor.characterData.last_name}.`,
        "error",
      )

      this.logger.info(
        `${supervisor.characterData.first_name} fired ${targetPlayer.characterData.first_name} from ${supervisor.jobData.name}`,
      )
    } catch (error) {
      this.logger.error("Error handling job fire:", error)
      this.sendJobMessage(supervisor, "An error occurred while firing the employee.", "error")
    }
  }

  private async hirePlayer(player: any, jobId: number): Promise<void> {
    try {
      const job = this.availableJobs.get(jobId)
      if (!job) return

      await this.database.query("UPDATE characters SET job_id = ? WHERE id = ?", [jobId, player.characterData.id])

      player.characterData.job_id = jobId
      player.jobData = job

      this.sendJobMessage(player, `Congratulations! You have been hired as ${job.name}.`, "success")
      this.logger.success(`${player.characterData.first_name} ${player.characterData.last_name} hired as ${job.name}`)

      // Give starting equipment/uniform if applicable
      await this.giveJobEquipment(player, job)

      this.eventManager.emit("job:player_hired", player, job)
    } catch (error) {
      this.logger.error("Error hiring player:", error)
    }
  }

  private async giveJobEquipment(player: any, job: Job): Promise<void> {
    // This would give job-specific equipment
    // For now, just give some starting money as a signing bonus
    const bonus = Math.floor(job.salary_per_hour * 2)
    await this.economyManager.addMoney(player.characterData.id, bonus, "cash", `Signing bonus for ${job.name}`)

    this.sendJobMessage(player, `You received a signing bonus of $${bonus.toLocaleString()}.`, "success")
  }

  private async processPayroll(): Promise<void> {
    try {
      this.logger.info("Processing hourly payroll...")

      const employees = await this.database.query(`
        SELECT c.*, j.salary_per_hour, j.name as job_name 
        FROM characters c 
        JOIN jobs j ON c.job_id = j.id 
        WHERE c.job_id IS NOT NULL
      `)

      let totalPaid = 0
      let employeesPaid = 0

      for (const employee of employees) {
        const salary = employee.salary_per_hour
        const tax = Math.floor(salary * 0.15) // 15% tax
        const netPay = salary - tax

        // Add money to character
        await this.economyManager.addMoney(employee.id, netPay, "bank", `Hourly salary - ${employee.job_name}`)

        // Add tax to government funds
        await this.economyManager.addGovernmentFunds(
          tax,
          `Income tax from ${employee.first_name} ${employee.last_name}`,
        )

        totalPaid += salary
        employeesPaid++

        // Notify online players
        const onlinePlayer = global.AmericanRP.getPlayerManager().getConnectedPlayers().get(employee.user_id)
        if (onlinePlayer && onlinePlayer.isLoggedIn) {
          this.sendJobMessage(onlinePlayer, `Salary received: $${netPay.toLocaleString()} (after tax)`, "success")
        }
      }

      this.logger.success(`Payroll processed: ${employeesPaid} employees paid, total: $${totalPaid.toLocaleString()}`)
    } catch (error) {
      this.logger.error("Error processing payroll:", error)
    }
  }

  private async getJobEmployeeCount(jobId: number): Promise<number> {
    try {
      const result = await this.database.query("SELECT COUNT(*) as count FROM characters WHERE job_id = ?", [jobId])
      return result[0].count
    } catch (error) {
      this.logger.error("Error getting job employee count:", error)
      return 0
    }
  }

  private async getCharacterLevel(characterId: number): Promise<number> {
    // For now, return a basic level calculation based on play time
    // In a real server, this would be more complex
    try {
      const result = await this.database.query("SELECT created_at FROM characters WHERE id = ?", [characterId])
      if (result.length === 0) return 1

      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(result[0].created_at).getTime()) / (1000 * 60 * 60 * 24),
      )
      return Math.max(1, Math.floor(daysSinceCreation / 7) + 1) // 1 level per week
    } catch (error) {
      this.logger.error("Error getting character level:", error)
      return 1
    }
  }

  private async createJobApplication(characterId: number, jobId: number): Promise<void> {
    try {
      await this.database.query(
        `
        INSERT INTO job_applications (character_id, job_id, application_date, status) 
        VALUES (?, ?, NOW(), 'pending')
      `,
        [characterId, jobId],
      )
    } catch (error) {
      this.logger.error("Error creating job application:", error)
    }
  }

  private canManageEmployees(player: any): boolean {
    if (!player.jobData) return false

    // Government jobs with management permissions
    const managementJobs = ["Police Chief", "Sheriff", "Fire Chief", "EMS Chief", "Mayor", "Judge"]
    return managementJobs.includes(player.jobData.name) || player.adminLevel >= 3
  }

  private notifyJobSupervisors(jobId: number, message: string): void {
    global.AmericanRP.getPlayerManager()
      .getConnectedPlayers()
      .forEach((player) => {
        if (player.isLoggedIn && player.jobData && player.jobData.id === jobId && this.canManageEmployees(player)) {
          this.sendJobMessage(player, `[JOB NOTIFICATION] ${message}`, "info")
        }
      })
  }

  public async getAvailableJobs(): Promise<Job[]> {
    return Array.from(this.availableJobs.values())
  }

  public async getJobById(jobId: number): Promise<Job | null> {
    return this.availableJobs.get(jobId) || null
  }

  public isJobCommand(command: string): boolean {
    const jobCommands = ["job", "jobs", "apply", "quit", "fire", "hire", "salary", "employees"]
    return jobCommands.includes(command)
  }

  public async handleCommand(player: any, command: string, args: string[]): Promise<void> {
    switch (command) {
      case "jobs":
        await this.showAvailableJobs(player)
        break
      case "apply":
        if (args.length < 1) {
          this.sendJobMessage(player, "Usage: /apply [job_id]", "error")
          return
        }
        await this.handleJobApplication(player, Number.parseInt(args[0]))
        break
      case "quit":
        await this.handleJobQuit(player)
        break
      case "fire":
        if (args.length < 1) {
          this.sendJobMessage(player, "Usage: /fire [player_name]", "error")
          return
        }
        await this.handleJobFire(player, args[0])
        break
      case "employees":
        await this.showJobEmployees(player)
        break
      default:
        this.sendJobMessage(player, "Unknown job command.", "error")
    }
  }

  private async showAvailableJobs(player: any): Promise<void> {
    const jobs = await this.getAvailableJobs()
    let message = "=== Available Jobs ===\n"

    for (const job of jobs) {
      const employeeCount = await this.getJobEmployeeCount(job.id)
      const maxEmployees = job.max_employees > 0 ? job.max_employees : "Unlimited"

      message += `ID: ${job.id} | ${job.name}\n`
      message += `Salary: $${job.salary_per_hour.toLocaleString()}/hour\n`
      message += `Employees: ${employeeCount}/${maxEmployees}\n`
      message += `Required Level: ${job.required_level}\n`
      message += `Type: ${job.is_government ? "Government" : "Civilian"}\n\n`
    }

    message += "Use /apply [job_id] to apply for a job."
    this.sendJobMessage(player, message, "info")
  }

  private async showJobEmployees(player: any): Promise<void> {
    if (!player.jobData || !this.canManageEmployees(player)) {
      this.sendJobMessage(player, "You don't have permission to view employees.", "error")
      return
    }

    const employees = await this.database.query(
      `
      SELECT first_name, last_name, created_at 
      FROM characters 
      WHERE job_id = ? 
      ORDER BY created_at ASC
    `,
      [player.jobData.id],
    )

    let message = `=== ${player.jobData.name} Employees ===\n`

    for (const employee of employees) {
      const hireDate = new Date(employee.created_at).toLocaleDateString()
      message += `${employee.first_name} ${employee.last_name} (Hired: ${hireDate})\n`
    }

    this.sendJobMessage(player, message, "info")
  }

  private sendJobMessage(player: any, message: string, type: "success" | "error" | "info"): void {
    const colors = {
      success: "#00FF00",
      error: "#FF0000",
      info: "#00BFFF",
    }

    global.AmericanRP.getChatManager().sendMessage(player, `[JOB] ${message}`, colors[type])
  }
}
