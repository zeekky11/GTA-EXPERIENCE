// RageMP module wrapper for TypeScript
// This file provides type-safe access to RageMP APIs

// Mock mp object for development/testing
// In production, this would be replaced by the actual RageMP mp object
export const mp = {
  events: {
    add: (eventName: string, handler: Function) => {
      console.log(`[RageMP] Event registered: ${eventName}`)
    },
    call: (eventName: string, ...args: any[]) => {
      console.log(`[RageMP] Event called: ${eventName}`, args)
    },
    callRemote: (eventName: string, ...args: any[]) => {
      console.log(`[RageMP] Remote event called: ${eventName}`, args)
    },
  },
  players: {
    broadcast: (message: string) => {
      console.log(`[RageMP] Broadcast: ${message}`)
    },
    getById: (id: number) => {
      console.log(`[RageMP] Get player by ID: ${id}`)
      return null
    },
    forEach: (callback: Function) => {
      console.log(`[RageMP] Iterating players`)
    },
  },
  vehicles: {
    new: (model: any, position: any) => {
      console.log(`[RageMP] Creating vehicle: ${model}`, position)
      return {
        setVariable: (name: string, value: any) => {},
        numberPlate: "",
        destroy: () => {},
      }
    },
    forEach: (callback: Function) => {
      console.log(`[RageMP] Iterating vehicles`)
    },
  },
  Vector3: class {
    x: number
    y: number
    z: number

    constructor(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
    }
  },
  joaat: (str: string) => {
    console.log(`[RageMP] JOAAT hash: ${str}`)
    return 0
  },
}

// Type definitions for RageMP
export interface Player {
  id: number
  name: string
  position: Vector3
  vehicle: Vehicle | null
  outputChatBox: (message: string) => void
  kick: (reason?: string) => void
  getVariable: (name: string) => any
  setVariable: (name: string, value: any) => void
  call: (eventName: string, ...args: any[]) => void
  freezePosition: (freeze: boolean) => void
  setAlpha: (alpha: number) => void
  setInvincible: (invincible: boolean) => void
  setVisible: (visible: boolean, locally: boolean) => void
  attachTo: (
    entity: any,
    bone: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    softPinning: boolean,
    collision: boolean,
    isPed: boolean,
    vertexIndex: number,
    fixedRot: number,
    p13: boolean,
  ) => void
  detach: (dynamic: boolean, collision: boolean) => void
}

export interface Vehicle {
  id: number
  position: Vector3
  rotation: Vector3
  engine: boolean
  locked: boolean
  handle: number
  getVariable: (name: string) => any
  setVariable: (name: string, value: any) => void
  repair: () => void
  destroy: () => void
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export default mp
