import type { DialogueEvent } from '@/types';

export type EventListener = (event: DialogueEvent) => void | Promise<void>;

export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private eventHistory: DialogueEvent[] = [];
  private maxHistorySize = 100;

  on(eventType: string, listener: EventListener): void {
    const listeners = this.listeners.get(eventType) || [];
    listeners.push(listener);
    this.listeners.set(eventType, listeners);
  }

  off(eventType: string, listener: EventListener): void {
    const listeners = this.listeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.listeners.set(eventType, listeners);
    }
  }

  async emit(event: DialogueEvent): Promise<void> {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const listeners = this.listeners.get(event.type) || [];
    const wildcardListeners = this.listeners.get('*') || [];
    const allListeners = [...listeners, ...wildcardListeners];

    for (const listener of allListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    }
  }

  getEventHistory(eventType?: string): DialogueEvent[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}