/**
 * WebSocket Connection Manager
 *
 * Manages WebSocket connections, session state, and event subscriptions.
 * Provides broadcasting capabilities for event streaming.
 */

import type { WSSession, WSSocket } from '../../types/websocket.js';
import type { StreamType } from '../../types/websocket.js';

export class ConnectionManager {
  private connections: Map<string, WSSession>;
  private eventSubscriptions: Map<StreamType, Set<string>>;

  constructor() {
    this.connections = new Map();
    this.eventSubscriptions = new Map();
  }

  /**
   * Add a new WebSocket connection
   */
  addConnection(session: WSSession): void {
    this.connections.set(session.id, session);
    console.log(`✅ WebSocket connected: ${session.id}`);
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(sessionId: string): void {
    const session = this.connections.get(sessionId);
    if (session) {
      // Remove from all event subscriptions
      session.subscriptions.forEach(event => {
        const subs = this.eventSubscriptions.get(event);
        if (subs) {
          subs.delete(sessionId);
        }
      });

      this.connections.delete(sessionId);
      console.log(`🔌 WebSocket disconnected: ${sessionId}`);
    }
  }

  /**
   * Get a connection by ID
   */
  getConnection(sessionId: string): WSSession | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WSSession[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Subscribe a session to an event stream
   */
  subscribeToEvent(sessionId: string, event: StreamType): void {
    const session = this.connections.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Cannot subscribe: session ${sessionId} not found`);
      return;
    }

    session.subscriptions.add(event);

    if (!this.eventSubscriptions.has(event)) {
      this.eventSubscriptions.set(event, new Set());
    }
    this.eventSubscriptions.get(event)!.add(sessionId);

    console.log(`📡 Session ${sessionId} subscribed to ${event}`);
  }

  /**
   * Unsubscribe a session from an event stream
   */
  unsubscribeFromEvent(sessionId: string, event: StreamType): void {
    const session = this.connections.get(sessionId);
    if (!session) {
      return;
    }

    session.subscriptions.delete(event);

    const subs = this.eventSubscriptions.get(event);
    if (subs) {
      subs.delete(sessionId);
    }

    console.log(`📡 Session ${sessionId} unsubscribed from ${event}`);
  }

  /**
   * Get all subscribers for an event
   */
  getSubscribers(event: StreamType): WSSession[] {
    const subscriberIds = this.eventSubscriptions.get(event);
    if (!subscriberIds) {
      return [];
    }

    return Array.from(subscriberIds)
      .map(id => this.connections.get(id))
      .filter((s): s is WSSession => s !== undefined);
  }

  /**
   * Broadcast a message to all subscribers of an event
   */
  broadcast(event: StreamType, data: unknown): void {
    const subscribers = this.getSubscribers(event);

    if (subscribers.length === 0) {
      return;
    }

    const message = JSON.stringify(data);
    const failedToSend: string[] = [];

    subscribers.forEach(session => {
      try {
        if (session.socket.readyState === WebSocket.OPEN) {
          session.socket.send(message);
        } else {
          failedToSend.push(session.id);
        }
      } catch (error) {
        console.error(`❌ Failed to send to ${session.id}:`, error);
        failedToSend.push(session.id);
      }
    });

    // Clean up failed connections
    failedToSend.forEach(id => this.removeConnection(id));
  }

  /**
   * Send a message to a specific session
   */
  sendTo(sessionId: string, data: unknown): boolean {
    const session = this.connections.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      if (session.socket.readyState === WebSocket.OPEN) {
        session.socket.send(JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to send to ${sessionId}:`, error);
      this.removeConnection(sessionId);
      return false;
    }
  }

  /**
   * Update session's last activity time
   */
  updateActivity(sessionId: string): void {
    const session = this.connections.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Get session by socket reference
   */
  findSessionBySocket(socket: WSSocket): WSSession | undefined {
    for (const session of this.connections.values()) {
      if (session.socket === socket) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Clean up stale connections (inactive for more than specified milliseconds)
   */
  cleanupStaleConnections(maxInactiveMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const staleIds: string[] = [];

    this.connections.forEach((session, id) => {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > maxInactiveMs) {
        staleIds.push(id);
      }
    });

    staleIds.forEach(id => {
      console.log(`🧹 Cleaning up stale connection: ${id}`);
      this.removeConnection(id);
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    subscriptions: Record<string, number>;
  } {
    const subscriptions: Record<string, number> = {};

    this.eventSubscriptions.forEach((subs, event) => {
      subscriptions[event] = subs.size;
    });

    return {
      totalConnections: this.connections.size,
      subscriptions
    };
  }
}
