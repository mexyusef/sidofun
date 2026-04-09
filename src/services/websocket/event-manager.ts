/**
 * WebSocket Event Manager
 *
 * Manages event streaming and subscriptions for real-time updates.
 * Handles continuous screenshot streams and other event broadcasts.
 */

import type { StreamType } from '../../types/websocket.js';
import { ConnectionManager } from './connection-manager.js';

interface StreamInfo {
  streamId: string;
  sessionId: string;
  streamType: StreamType;
  interval: number;
  intervalId?: ReturnType<typeof setInterval>;
  stop?: () => void;
  startedAt: Date;
  params?: Record<string, unknown>;
}

export class EventManager {
  private connectionManager: ConnectionManager;
  private activeStreams: Map<string, StreamInfo>;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.activeStreams = new Map();
  }

  /**
   * Subscribe a session to an event stream
   */
  subscribe(sessionId: string, event: StreamType): void {
    this.connectionManager.subscribeToEvent(sessionId, event);
    console.log(`📡 Session ${sessionId} subscribed to ${event}`);
  }

  /**
   * Unsubscribe a session from an event stream
   */
  unsubscribe(sessionId: string, event: StreamType): void {
    this.connectionManager.unsubscribeFromEvent(sessionId, event);
    console.log(`📡 Session ${sessionId} unsubscribed from ${event}`);
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: StreamType, data: unknown): void {
    const message = {
      id: this.generateId('evt'),
      type: 'event' as const,
      timestamp: new Date().toISOString(),
      payload: {
        event,
        data
      }
    };

    this.connectionManager.broadcast(event, message);
  }

  /**
   * Start a screenshot stream for a session
   * @param sessionId The session ID
   * @param interval Interval in milliseconds
   * @param screenshotFn Function to capture screenshot
   * @returns Stream ID
   */
  startScreenshotStream(
    sessionId: string,
    interval: number,
    screenshotFn: () => Promise<unknown>
  ): string {
    const streamId = `screenshot_${sessionId}_${Date.now()}`;

    const intervalId = setInterval(async () => {
      try {
        const screenshot = await screenshotFn();
        this.emit('screenshot', {
          timestamp: new Date().toISOString(),
          screenshot
        });
      } catch (error) {
        console.error(`❌ Screenshot stream error for ${streamId}:`, error);
        this.stopStream(streamId);
      }
    }, interval);

    const streamInfo: StreamInfo = {
      streamId,
      sessionId,
      streamType: 'screenshot',
      interval,
      intervalId,
      startedAt: new Date()
    };

    this.activeStreams.set(streamId, streamInfo);
    console.log(`📸 Started screenshot stream ${streamId} for session ${sessionId} (${interval}ms)`);

    return streamId;
  }

  /**
   * Start a generic event stream
   * @param sessionId The session ID
   * @param streamType The type of stream
   * @param interval Interval in milliseconds
   * @param emitFn Function to call on each interval
   * @returns Stream ID
   */
  startStream(
    sessionId: string,
    streamType: StreamType,
    interval: number,
    emitFn: () => void | Promise<void>,
    params?: Record<string, unknown>
  ): string {
    const streamId = `${streamType}_${sessionId}_${Date.now()}`;

    const intervalId = setInterval(async () => {
      try {
        await emitFn();
      } catch (error) {
        console.error(`❌ Stream error for ${streamId}:`, error);
        this.stopStream(streamId);
      }
    }, interval);

    const streamInfo: StreamInfo = {
      streamId,
      sessionId,
      streamType,
      interval,
      intervalId,
      startedAt: new Date(),
      params
    };

    this.activeStreams.set(streamId, streamInfo);
    console.log(`🔄 Started ${streamType} stream ${streamId} for session ${sessionId} (${interval}ms)`);

    return streamId;
  }

  startManagedStream(
    sessionId: string,
    streamType: StreamType,
    stop: () => void,
    params?: Record<string, unknown>
  ): string {
    const streamId = `${streamType}_${sessionId}_${Date.now()}`;
    const streamInfo: StreamInfo = {
      streamId,
      sessionId,
      streamType,
      interval: 0,
      stop,
      startedAt: new Date(),
      params
    };
    this.activeStreams.set(streamId, streamInfo);
    console.log(`🔄 Started managed ${streamType} stream ${streamId} for session ${sessionId}`);
    return streamId;
  }

  /**
   * Stop a specific stream
   */
  stopStream(streamId: string): boolean {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      return false;
    }

    if (streamInfo.intervalId) {
      clearInterval(streamInfo.intervalId);
    }
    streamInfo.stop?.();
    this.activeStreams.delete(streamId);
    console.log(`🛑 Stopped stream ${streamId}`);

    return true;
  }

  /**
   * Stop all streams for a specific session
   */
  stopAllStreamsForSession(sessionId: string): void {
    const streamsToRemove = Array.from(this.activeStreams.entries())
      .filter(([_, info]) => info.sessionId === sessionId);

    streamsToRemove.forEach(([streamId]) => {
      this.stopStream(streamId);
    });

    if (streamsToRemove.length > 0) {
      console.log(`🛑 Stopped ${streamsToRemove.length} stream(s) for session ${sessionId}`);
    }
  }

  /**
   * Stop all streams (for shutdown)
   */
  stopAllStreams(): void {
    this.activeStreams.forEach((_, streamId) => {
      this.stopStream(streamId);
    });
  }

  /**
   * Get active streams for a session
   */
  getStreamsForSession(sessionId: string): StreamInfo[] {
    return Array.from(this.activeStreams.values())
      .filter(info => info.sessionId === sessionId);
  }

  /**
   * Get all active streams
   */
  getAllStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Get stream count
   */
  getStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Get stream statistics
   */
  getStats(): {
    totalStreams: number;
    byType: Record<string, number>;
    bySession: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const bySession: Record<string, number> = {};

    this.activeStreams.forEach(info => {
      byType[info.streamType] = (byType[info.streamType] || 0) + 1;
      bySession[info.sessionId] = (bySession[info.sessionId] || 0) + 1;
    });

    return {
      totalStreams: this.activeStreams.size,
      byType,
      bySession
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
