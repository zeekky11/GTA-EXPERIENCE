/**
 * Event Manager - Centralized event handling system
 */

import { Logger } from "../utils/Logger"

export type EventCallback = (...args: any[]) => void

export class EventManager {
  private events: Map<string, EventCallback[]>
  private logger: Logger

  constructor() {
    this.events = new Map()
    this.logger = new Logger("EventManager")
  }

  public on(eventName: string, callback: EventCallback): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, [])
    }

    this.events.get(eventName)!.push(callback)
    this.logger.debug(`Registered event listener for: ${eventName}`)
  }

  public off(eventName: string, callback: EventCallback): void {
    const callbacks = this.events.get(eventName)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
        this.logger.debug(`Removed event listener for: ${eventName}`)
      }
    }
  }

  public emit(eventName: string, ...args: any[]): void {
    const callbacks = this.events.get(eventName)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args)
        } catch (error) {
          this.logger.error(`Error in event callback for ${eventName}:`, error)
        }
      })
    }
  }

  public once(eventName: string, callback: EventCallback): void {
    const onceCallback = (...args: any[]) => {
      callback(...args)
      this.off(eventName, onceCallback)
    }

    this.on(eventName, onceCallback)
  }

  public removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.events.delete(eventName)
      this.logger.debug(`Removed all listeners for: ${eventName}`)
    } else {
      this.events.clear()
      this.logger.debug("Removed all event listeners")
    }
  }

  public getEventNames(): string[] {
    return Array.from(this.events.keys())
  }

  public getListenerCount(eventName: string): number {
    const callbacks = this.events.get(eventName)
    return callbacks ? callbacks.length : 0
  }
}
