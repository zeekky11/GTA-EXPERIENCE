# American Roleplay Gamemode for RageMP

A complete, professional American Roleplay gamemode for RageMP with heavy text-based roleplay systems.

## 🚀 Features

### Core Systems
- **Player & Character Management** - Complete character creation, authentication, and session management
- **Advanced Chat System** - Multiple chat channels (Local, Global, Faction, Job, Admin, OOC)
- **Job & Economy System** - 25+ realistic jobs with automatic payroll and progression
- **Faction System** - Gangs, Mafia, Government, and Business organizations with territories
- **Property System** - Houses, businesses, garages with ownership and rental systems
- **Vehicle System** - Complete vehicle management with dealerships, keys, and maintenance
- **Admin & Moderation Tools** - Comprehensive admin system with reports and logging

### Advanced Features
- **Heavy Text Roleplay** - Focus on immersive text-based interactions
- **Realistic Economy** - Balanced pricing, taxes, and financial systems
- **Territory Control** - Faction wars and area control mechanics
- **Property Investment** - Real estate market with appreciation and rental income
- **Vehicle Customization** - Full modification and personalization system
- **Admin Hierarchy** - 10-level admin system with granular permissions

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- RageMP Server

### Quick Setup

1. **Clone and Install**
\`\`\`bash
git clone <repository-url>
cd american-roleplay-gamemode
npm run setup
\`\`\`

2. **Configure Environment**
Create a `.env` file:
\`\`\`env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=american_roleplay
\`\`\`

3. **Database Setup**
\`\`\`bash
npm run setup-db
\`\`\`

4. **Build and Start**
\`\`\`bash
npm run build
npm start
\`\`\`

## 🎮 System Overview

### Player Systems
- **Authentication**: Secure login/register with bcrypt encryption
- **Character Creation**: Detailed character customization and background
- **Session Management**: Persistent data and automatic saving
- **Multi-Character**: Support for multiple characters per account

### Economy Systems
- **Jobs**: Police, EMS, Mechanic, Taxi, Trucker, and 20+ more
- **Payroll**: Automatic hourly wages based on job and level
- **Banking**: Secure money transfers and transaction logging
- **Taxes**: Realistic tax system for properties and income

### Faction Systems
- **Gang Territories**: Controllable areas with income generation
- **Hierarchy**: Customizable ranks with specific permissions
- **Wars**: Faction conflict system with territory battles
- **Economics**: Faction banks and shared resources

### Property Systems
- **Ownership**: Buy, sell, and rent properties
- **Types**: Houses, businesses, garages, warehouses
- **Investment**: Property value appreciation over time
- **Customization**: Interior decoration and modifications

### Vehicle Systems
- **Dealerships**: Multiple dealerships with different vehicle types
- **Ownership**: Complete ownership transfer and key management
- **Maintenance**: Fuel, repairs, and insurance systems
- **Impound**: Police impound system with recovery fees

### Admin Systems
- **Moderation**: Kick, ban, mute, warn with duration support
- **Reports**: Player reporting system with admin assignment
- **Logging**: Complete audit trail of all admin actions
- **Permissions**: Granular permission system for different admin levels

## 🛠️ Commands

### Player Commands
- `/register [password]` - Register new account
- `/login [password]` - Login to account
- `/me [action]` - Roleplay action
- `/do [description]` - Environmental description
- `/ooc [message]` - Out of character chat
- `/report [id] [reason] [description]` - Report player

### Job Commands
- `/job apply [job]` - Apply for job
- `/job quit` - Quit current job
- `/job info` - View job information
- `/duty` - Toggle job duty status

### Vehicle Commands
- `/veh` - Vehicle information
- `/vlock` / `/vunlock` - Lock/unlock vehicle
- `/engine` - Toggle engine
- `/vgivekey [id]` - Give vehicle key
- `/vmyvehicles` - List owned vehicles

### Property Commands
- `/property buy` - Buy property
- `/property sell [id]` - Sell property
- `/property rent [id]` - Rent property
- `/property enter` - Enter property

### Faction Commands
- `/faction create [name]` - Create faction
- `/faction invite [id]` - Invite player
- `/faction promote [id]` - Promote member
- `/faction territory claim` - Claim territory

### Admin Commands
- `/akick [id] [reason]` - Kick player
- `/aban [id] [hours] [reason]` - Ban player
- `/amute [id] [minutes] [reason]` - Mute player
- `/goto [id]` - Teleport to player
- `/spec [id]` - Spectate player
- `/setadmin [id] [level]` - Set admin level

## 📊 Database Schema

The gamemode uses a comprehensive MySQL database with the following main tables:

- **accounts** - User account information
- **characters** - Character data and stats
- **jobs** - Available jobs and requirements
- **job_applications** - Job application system
- **factions** - Faction information and settings
- **faction_members** - Faction membership and ranks
- **properties** - Property ownership and details
- **vehicles** - Vehicle ownership and status
- **admin_levels** - Admin permissions and levels
- **player_reports** - Player reporting system

## 🔧 Configuration

### Server Settings
Edit `server/config.ts` to customize:
- Server name and description
- Maximum players
- Economy settings
- Job configurations
- Admin permissions

### Database Settings
Configure database connection in environment variables or `server/core/database.ts`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord server
- Check the documentation wiki

## 🎯 Roadmap

- [ ] Web panel for server management
- [ ] Mobile app for server statistics
- [ ] Advanced faction war mechanics
- [ ] Real estate investment system
- [ ] Business management expansion
- [ ] Custom interior system
- [ ] Advanced vehicle modifications
- [ ] Player housing customization

---

**American Roleplay Gamemode** - The most complete roleplay experience for RageMP
