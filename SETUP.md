# 🚀 Guía de Instalación - American Roleplay

## Requisitos Previos

### 1. Software Necesario
- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **MySQL 8.0+** - [Descargar aquí](https://dev.mysql.com/downloads/)
- **RageMP Server** - [Descargar aquí](https://rage.mp/)

### 2. Configuración de Base de Datos

#### Crear la base de datos (opcional):
\`\`\`sql
CREATE DATABASE american_roleplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

#### Crear usuario MySQL (recomendado):
\`\`\`sql
CREATE USER 'ragemp_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON american_roleplay.* TO 'ragemp_user'@'localhost';
FLUSH PRIVILEGES;
\`\`\`

### 3. Variables de Entorno

Copia `.env.example` a `.env` y configura:

\`\`\`bash
cp .env.example .env
\`\`\`

Edita `.env` con tus datos:
\`\`\`env
DB_HOST=localhost
DB_PORT=3306
DB_USER=ragemp_user
DB_PASSWORD=tu_contraseña_segura
DB_NAME=american_roleplay
\`\`\`

## 🎯 Instalación

### Paso 1: Instalar y configurar
\`\`\`bash
npm run setup
\`\`\`

Este comando hace:
- ✅ Instala todas las dependencias
- ✅ Compila TypeScript a JavaScript
- ✅ Ejecuta todos los scripts SQL
- ✅ Crea las tablas y datos iniciales

### Paso 2: Verificar instalación
\`\`\`bash
npm run dev
\`\`\`

## 🎮 Uso en RageMP

### Estructura de archivos para RageMP:
\`\`\`
tu-servidor-ragemp/
├── packages/
│   ├── gamemode/
│   │   └── [copiar archivos de server/]
│   └── client/
│       └── [copiar archivos de packages/client/]
└── conf.json
\`\`\`

### Configurar conf.json:
\`\`\`json
{
  "maxplayers": 100,
  "name": "American Roleplay Server",
  "gamemode": "American Roleplay",
  "streamdistance": 500,
  "disallow-multiple-connections-per-ip": true
}
\`\`\`

## 🔧 Comandos Disponibles

\`\`\`bash
npm run setup      # Instalación completa
npm run build      # Compilar TypeScript
npm run dev        # Desarrollo con hot reload
npm start          # Producción
npm run setup-db   # Solo configurar base de datos
\`\`\`

## 🎯 Primeros Pasos en el Servidor

### Como Administrador:
1. Conéctate al servidor
2. Registra tu cuenta: `/register usuario contraseña`
3. Hazte admin: Edita la tabla `users` en MySQL y pon `admin_level = 10`
4. Reconéctate y usa: `/setadmin [id] [nivel]`

### Comandos Básicos:
- `/register` - Registrarse
- `/login` - Iniciar sesión
- `/help` - Ver comandos disponibles
- `/me [acción]` - Roleplay
- `/job apply [trabajo]` - Aplicar a trabajo

## 🆘 Solución de Problemas

### Error de conexión MySQL:
- Verifica que MySQL esté corriendo
- Comprueba las credenciales en `.env`
- Asegúrate de que el usuario tenga permisos

### Error "Cannot find module":
\`\`\`bash
npm install
npm run build
\`\`\`

### Tablas no creadas:
\`\`\`bash
npm run setup-db
