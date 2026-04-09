/**
 * WebSocket CMD Handlers
 *
 * WebSocket message handlers specific to CMD.exe automation.
 * Bridges WebSocket messages with CMDSessionService.
 */

import type { ExecOptions } from '../cmd/cmd-session-service.js';
import type { ResponsePayload, WSSocket } from '../../types/websocket.js';
import { CMDTerminalCore } from '../terminal/cmd-terminal-core.js';

export class WebSocketCMDHandlers {
  constructor(private readonly terminalCore: CMDTerminalCore) {}

  /**
   * Handle spawn request - create new CMD window
   */
  async handleSpawn(
    socket: WSSocket,
    messageId: string,
    params: { title?: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.spawn(params.title);

      this.sendResponse(socket, messageId, {
        success: true,
        sessionId: result.sessionId,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'SPAWN_FAILED', error.message);
    }
  }

  /**
   * Handle attach request - attach to existing CMD window
   */
  async handleAttach(
    socket: WSSocket,
    messageId: string,
    params: { titlePattern: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.attach(params.titlePattern);

      this.sendResponse(socket, messageId, {
        success: true,
        sessionId: result.sessionId,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'ATTACH_FAILED', error.message);
    }
  }

  /**
   * Handle exec request - execute command in CMD
   */
  async handleExec(
    socket: WSSocket,
    messageId: string,
    params: {
      sessionId: string;
      command: string;
      options?: ExecOptions;
    }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.exec(params.sessionId, params.command, params.options || {});

      this.sendResponse(socket, messageId, {
        success: true,
        result
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'EXEC_FAILED', error.message);
    }
  }

  /**
   * Handle type request - type text into CMD with escape sequences
   * Supports: \n (enter), \t (tab), \\ (backslash), \" (quote), \dN (delay N milliseconds),
   *          \M (maximize), \m (minimize), \r (restore), \f (focus)
   */
  async handleType(
    socket: WSSocket,
    messageId: string,
    params: {
      sessionId: string;
      text: string;
    }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.typeEscaped(params.sessionId, params.text);

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'TYPE_FAILED', error.message);
    }
  }

  /**
   * Handle key press request
   */
  async handlePress(
    socket: WSSocket,
    messageId: string,
    params: {
      sessionId: string;
      key: string;
    }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.press(params.sessionId, params.key);

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PRESS_FAILED', error.message);
    }
  }

  /**
   * Handle screenshot request
   */
  async handleScreenshot(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string; filename?: string; returnBase64?: boolean }
  ): Promise<void> {
    try {
      const screenshot = await this.terminalCore.screenshot(params.sessionId, {
        filename: params.filename,
        returnBase64: params.returnBase64
      });

      this.sendResponse(socket, messageId, {
        success: true,
        filepath: screenshot.filepath,
        data: screenshot.data,  // only included if returnBase64 is true
        width: screenshot.width,
        height: screenshot.height
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'SCREENSHOT_FAILED', error.message);
    }
  }

  /**
   * Handle break signal request (Ctrl+C)
   */
  async handleBreak(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.sendBreak(params.sessionId);

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'BREAK_FAILED', error.message);
    }
  }

  /**
   * Handle EOF signal request (Ctrl+Z)
   */
  async handleEOF(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.sendEOF(params.sessionId);

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'EOF_FAILED', error.message);
    }
  }

  /**
   * Handle close session request
   */
  async handleClose(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.close(params.sessionId);

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'CLOSE_FAILED', error.message);
    }
  }

  /**
   * Handle list sessions request
   */
  async handleList(
    socket: WSSocket,
    messageId: string
  ): Promise<void> {
    try {
      const result = await this.terminalCore.listSessions();

      this.sendResponse(socket, messageId, {
        success: true,
        sessions: result.sessions,
        count: result.count
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'LIST_FAILED', error.message);
    }
  }

  /**
   * Handle get session info request
   */
  async handleGetInfo(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const info = await this.terminalCore.getSessionInfo(params.sessionId);

      this.sendResponse(socket, messageId, {
        success: true,
        session: info
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'GET_INFO_FAILED', error.message);
    }
  }

  // ==================== Terminal Shortcuts ====================

  /**
   * Handle new tab request (Ctrl+Shift+T)
   */
  async handleNewTab(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'new_tab');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'NEW_TAB_FAILED', error.message);
    }
  }

  /**
   * Handle next tab request (Ctrl+Tab)
   */
  async handleNextTab(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'next_tab');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'NEXT_TAB_FAILED', error.message);
    }
  }

  /**
   * Handle previous tab request (Ctrl+Shift+Tab)
   */
  async handlePrevTab(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'prev_tab');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PREV_TAB_FAILED', error.message);
    }
  }

  /**
   * Handle split vertical request (Shift+Alt+-)
   */
  async handleSplitVertical(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'split_vertical');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'SPLIT_VERTICAL_FAILED', error.message);
    }
  }

  /**
   * Handle split horizontal request (Shift+Alt++)
   */
  async handleSplitHorizontal(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'split_horizontal');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'SPLIT_HORIZONTAL_FAILED', error.message);
    }
  }

  /**
   * Handle pane up request (Alt+Up)
   */
  async handlePaneUp(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'pane_up');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PANE_UP_FAILED', error.message);
    }
  }

  /**
   * Handle pane down request (Alt+Down)
   */
  async handlePaneDown(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'pane_down');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PANE_DOWN_FAILED', error.message);
    }
  }

  /**
   * Handle pane left request (Alt+Left)
   */
  async handlePaneLeft(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'pane_left');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PANE_LEFT_FAILED', error.message);
    }
  }

  /**
   * Handle pane right request (Alt+Right)
   */
  async handlePaneRight(
    socket: WSSocket,
    messageId: string,
    params: { sessionId: string }
  ): Promise<void> {
    try {
      const result = await this.terminalCore.executeShortcut(params.sessionId, 'pane_right');

      this.sendResponse(socket, messageId, {
        success: true,
        message: result.message
      });
    } catch (error: any) {
      this.sendError(socket, messageId, 'PANE_RIGHT_FAILED', error.message);
    }
  }

  /**
   * Send a response message
   */
  private sendResponse(
    socket: WSSocket,
    messageId: string,
    payload: ResponsePayload
  ): void {
    const response = {
      id: messageId,
      type: 'response' as const,
      timestamp: new Date().toISOString(),
      payload
    };

    socket.send(JSON.stringify(response));
  }

  /**
   * Send an error message
   */
  private sendError(
    socket: WSSocket,
    messageId: string,
    code: string,
    message: string,
    details?: any
  ): void {
    const error = {
      id: messageId,
      type: 'error' as const,
      timestamp: new Date().toISOString(),
      payload: {
        code,
        message,
        details
      }
    };

    socket.send(JSON.stringify(error));
  }
}
