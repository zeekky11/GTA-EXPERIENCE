/**
 * Logger Utility - Centralized logging system with colors and timestamps
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

export class Logger {
  private context: string
  private logLevel: LogLevel

  constructor(context = "AmericanRP", logLevel: LogLevel = LogLevel.INFO) {
    this.context = context
    this.logLevel = logLevel
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const formattedArgs =
      args.length > 0
        ? " " + args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg))).join(" ")
        : ""

    return `[${timestamp}] [${this.context}] [${level}] ${message}${formattedArgs}`
  }

  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log("\x1b[36m%s\x1b[0m", this.formatMessage("DEBUG", message, ...args))
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log("\x1b[37m%s\x1b[0m", this.formatMessage("INFO", message, ...args))
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.log("\x1b[33m%s\x1b[0m", this.formatMessage("WARN", message, ...args))
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.log("\x1b[31m%s\x1b[0m", this.formatMessage("ERROR", message, ...args))
    }
  }

  public success(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.SUCCESS) {
      console.log("\x1b[32m%s\x1b[0m", this.formatMessage("SUCCESS", message, ...args))
    }
  }
}
