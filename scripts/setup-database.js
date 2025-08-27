const mysql = require("mysql2/promise")
const fs = require("fs")
const path = require("path")

async function setupDatabase() {
  try {
    console.log("🚀 Setting up American Roleplay Database...")

    // Database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "american_roleplay",
    })

    console.log("✅ Connected to database")

    // Get all SQL files from scripts directory
    const scriptsDir = path.join(__dirname, "../scripts")
    const sqlFiles = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    console.log(`📁 Found ${sqlFiles.length} SQL files to execute`)

    // Execute each SQL file
    for (const file of sqlFiles) {
      console.log(`⚡ Executing ${file}...`)
      const filePath = path.join(scriptsDir, file)
      const sql = fs.readFileSync(filePath, "utf8")

      // Split by semicolon and execute each statement
      const statements = sql.split(";").filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement)
        }
      }

      console.log(`✅ ${file} executed successfully`)
    }

    await connection.end()
    console.log("🎉 Database setup completed successfully!")
    console.log("")
    console.log("📋 Next steps:")
    console.log("1. Configure your environment variables")
    console.log("2. Start your RageMP server")
    console.log("3. Connect and enjoy your American Roleplay server!")
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    process.exit(1)
  }
}

setupDatabase()
