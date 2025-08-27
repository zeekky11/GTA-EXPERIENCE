/**
 * Database Manager - Handles all database operations
 * Supports MySQL/MariaDB for production environments
 */

import mysql from "mysql2/promise"
import { Logger } from "../utils/Logger"

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
}

export class Database {
  private pool: mysql.Pool
  private logger: Logger
  private config: DatabaseConfig

  constructor() {
    this.logger = new Logger("Database")
    this.config = {
      host: process.env.DB_HOST || "localhost",
      port: Number.parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "american_roleplay",
      connectionLimit: 10,
    }

    this.initializeConnection()
    this.createTables()
  }

  private initializeConnection(): void {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.connectionLimit,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
      })

      this.logger.success("Database connection pool created successfully")
    } catch (error) {
      this.logger.error("Failed to create database connection pool:", error)
      throw error
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        admin_level INT DEFAULT 0,
        banned BOOLEAN DEFAULT FALSE,
        ban_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Characters table
      `CREATE TABLE IF NOT EXISTS characters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        age INT NOT NULL,
        gender ENUM('Male', 'Female') NOT NULL,
        phone_number VARCHAR(20) UNIQUE,
        money DECIMAL(15,2) DEFAULT 5000.00,
        bank_money DECIMAL(15,2) DEFAULT 0.00,
        job_id INT NULL,
        faction_id INT NULL,
        faction_rank INT DEFAULT 0,
        position_x FLOAT DEFAULT 0,
        position_y FLOAT DEFAULT 0,
        position_z FLOAT DEFAULT 0,
        dimension INT DEFAULT 0,
        health INT DEFAULT 100,
        armor INT DEFAULT 0,
        hunger INT DEFAULT 100,
        thirst INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Jobs table
      `CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        salary_per_hour DECIMAL(10,2) DEFAULT 0,
        required_level INT DEFAULT 1,
        max_employees INT DEFAULT -1,
        is_government BOOLEAN DEFAULT FALSE,
        spawn_x FLOAT DEFAULT 0,
        spawn_y FLOAT DEFAULT 0,
        spawn_z FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Factions table
      `CREATE TABLE IF NOT EXISTS factions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        tag VARCHAR(10) NOT NULL,
        type ENUM('Gang', 'Mafia', 'Government', 'Business', 'Other') NOT NULL,
        leader_id INT NULL,
        max_members INT DEFAULT 50,
        money DECIMAL(15,2) DEFAULT 0,
        spawn_x FLOAT DEFAULT 0,
        spawn_y FLOAT DEFAULT 0,
        spawn_z FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leader_id) REFERENCES characters(id) ON DELETE SET NULL
      )`,

      // Properties table
      `CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('House', 'Business', 'Garage', 'Warehouse') NOT NULL,
        owner_id INT NULL,
        price DECIMAL(15,2) NOT NULL,
        rent_price DECIMAL(10,2) DEFAULT 0,
        entrance_x FLOAT NOT NULL,
        entrance_y FLOAT NOT NULL,
        entrance_z FLOAT NOT NULL,
        exit_x FLOAT DEFAULT 0,
        exit_y FLOAT DEFAULT 0,
        exit_z FLOAT DEFAULT 0,
        interior_id INT DEFAULT 0,
        locked BOOLEAN DEFAULT TRUE,
        for_sale BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES characters(id) ON DELETE SET NULL
      )`,

      // Vehicles table
      `CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NULL,
        model VARCHAR(50) NOT NULL,
        plate VARCHAR(10) UNIQUE NOT NULL,
        color1 INT DEFAULT 0,
        color2 INT DEFAULT 0,
        position_x FLOAT DEFAULT 0,
        position_y FLOAT DEFAULT 0,
        position_z FLOAT DEFAULT 0,
        rotation FLOAT DEFAULT 0,
        dimension INT DEFAULT 0,
        fuel FLOAT DEFAULT 100,
        engine_health FLOAT DEFAULT 1000,
        body_health FLOAT DEFAULT 1000,
        locked BOOLEAN DEFAULT TRUE,
        impounded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES characters(id) ON DELETE SET NULL
      )`,
    ]

    try {
      for (const table of tables) {
        await this.query(table)
      }
      this.logger.success("All database tables created/verified successfully")
    } catch (error) {
      this.logger.error("Failed to create database tables:", error)
      throw error
    }
  }

  public async query(sql: string, params: any[] = []): Promise<any> {
    try {
      const [results] = await this.pool.execute(sql, params)
      return results
    } catch (error) {
      this.logger.error("Database query error:", error)
      this.logger.error("SQL:", sql)
      this.logger.error("Params:", params)
      throw error
    }
  }

  public async getConnection(): Promise<mysql.PoolConnection> {
    return await this.pool.getConnection()
  }

  public async close(): Promise<void> {
    await this.pool.end()
    this.logger.info("Database connection pool closed")
  }
}
