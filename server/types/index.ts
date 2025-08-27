/**
 * Type definitions for American Roleplay Gamemode
 */

// Character related types
export interface Character {
  id: number
  user_id: number
  first_name: string
  last_name: string
  age: number
  gender: "Male" | "Female"
  phone_number?: string
  money: number
  bank_money: number
  job_id?: number
  faction_id?: number
  faction_rank: number
  position_x: number
  position_y: number
  position_z: number
  dimension: number
  health: number
  armor: number
  hunger: number
  thirst: number
  created_at: Date
  updated_at: Date
}

// Job related types
export interface Job {
  id: number
  name: string
  description?: string
  salary_per_hour: number
  required_level: number
  max_employees: number
  is_government: boolean
  spawn_x: number
  spawn_y: number
  spawn_z: number
  created_at: Date
}

// Faction related types
export interface Faction {
  id: number
  name: string
  tag: string
  type: "Gang" | "Mafia" | "Government" | "Business" | "Other"
  leader_id?: number
  max_members: number
  money: number
  spawn_x: number
  spawn_y: number
  spawn_z: number
  created_at: Date
}

// Property related types
export interface Property {
  id: number
  owner_id?: number | null
  name: string
  type: "House" | "Business" | "Garage" | "Warehouse"
  price: number
  position: Position
  interior: number
  locked: boolean
  for_sale: boolean
  for_rent: boolean
  rent_price?: number
  rented_by?: number | null
  rent_expires?: Date | null
  tax_rate: number
  last_tax_paid?: Date
  created_at: Date
}

// Vehicle related types
export interface Vehicle {
  id: number
  owner_id: number
  model: string
  plate: string
  color_primary: { r: number; g: number; b: number }
  color_secondary: { r: number; g: number; b: number }
  position: Position
  rotation: Position
  fuel: number
  engine_health: number
  body_health: number
  locked: boolean
  impounded: boolean
  insurance_expires?: Date
  modifications: Map<number, number>
}

// User related types
export interface User {
  id: number
  username: string
  password_hash: string
  email: string
  registration_date: Date
  last_login?: Date
  admin_level: number
  banned: boolean
  ban_reason?: string
  created_at: Date
  updated_at: Date
}

// Command related types
export interface Command {
  name: string
  description: string
  usage: string
  adminLevel: number
  execute: (player: any, args: string[]) => void // Updated to use 'any' type as PlayerMp is undeclared
}

// Chat related types
export interface ChatMessage {
  player: any // Updated to use 'any' type as PlayerMp is undeclared
  message: string
  type: "local" | "global" | "faction" | "job" | "admin" | "ooc"
  timestamp: Date
}

// Position related types
export interface Position {
  x: number
  y: number
  z: number
  dimension?: number
  rotation?: number
}

// Economy related types
export interface Transaction {
  id: number
  from_character_id?: number
  to_character_id?: number
  amount: number
  type: "salary" | "purchase" | "transfer" | "fine" | "bonus"
  description: string
  created_at: Date
}

// PropertyKey related types
export interface PropertyKey {
  property_id: number
  player_id: number
  key_type: "owner" | "renter" | "spare"
  created_at: Date
}

// VehicleKey related types
export interface VehicleKey {
  vehicle_id: number
  player_id: number
  key_type: "owner" | "spare"
  created_at: Date
}

// AdminLevel related types
export interface AdminLevel {
  player_id: number
  level: number
  permissions: string[]
  active: boolean
}

// AdminAction related types
export interface AdminAction {
  id: number
  admin_id: number
  action: string
  target_id: number
  details: string
  created_at: Date
}

// PlayerReport related types
export interface PlayerReport {
  id: number
  reporter_id: number
  reported_id: number
  reason: string
  description: string
  status: "open" | "in_progress" | "closed"
  assigned_admin?: number | null
  created_at: Date
  reporter_name?: string
  reported_name?: string
}
