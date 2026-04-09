export type SidofunClientKind = 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal';
export type SidofunResourceType = 'terminal' | 'browser_runtime' | 'browser_page' | 'desktop_scope' | 'trace' | 'trajectory';

export interface OwnedResource {
  type: SidofunResourceType;
  id: string;
  metadata?: Record<string, unknown>;
  ownedAt: string;
}

export interface SidofunClientSession {
  id: string;
  clientKind: SidofunClientKind;
  name?: string;
  createdAt: string;
  lastActivity: string;
  shutdown: boolean;
  resources: OwnedResource[];
}

type CleanupHandler = (resource: OwnedResource) => Promise<void>;

export interface SessionSweepResult {
  closedSessionIds: string[];
  closedCount: number;
}

export interface ResourceOwnerInfo {
  type: SidofunResourceType;
  id: string;
  owners: Array<{
    sessionId: string;
    clientKind: SidofunClientKind;
    name?: string;
    ownedAt: string;
    metadata?: Record<string, unknown>;
  }>;
  ownerCount: number;
}

export class SessionManagerService {
  private readonly sessions = new Map<string, SidofunClientSession>();
  private readonly cleanupHandlers = new Map<SidofunResourceType, CleanupHandler>();

  registerCleanupHandler(type: SidofunResourceType, handler: CleanupHandler) {
    this.cleanupHandlers.set(type, handler);
  }

  createSession(options?: { clientKind?: SidofunClientKind; name?: string }) {
    const now = new Date().toISOString();
    const session: SidofunClientSession = {
      id: `client_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      clientKind: options?.clientKind ?? 'internal',
      name: options?.name,
      createdAt: now,
      lastActivity: now,
      shutdown: false,
      resources: []
    };
    this.sessions.set(session.id, session);
    return session;
  }

  registerSession(session: SidofunClientSession) {
    this.sessions.set(session.id, {
      ...session,
      resources: [...session.resources]
    });
    return this.getSession(session.id);
  }

  listSessions() {
    return {
      sessions: [...this.sessions.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      count: this.sessions.size
    };
  }

  hasSession(sessionId: string) {
    return this.sessions.has(sessionId);
  }

  getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Client session not found: ${sessionId}`);
    }
    return session;
  }

  touchSession(sessionId: string) {
    const session = this.getSession(sessionId);
    session.lastActivity = new Date().toISOString();
    return session;
  }

  ownResource(sessionId: string, resource: { type: SidofunResourceType; id: string; metadata?: Record<string, unknown> }) {
    return this.claimResource(sessionId, resource, { exclusive: false });
  }

  claimResource(
    sessionId: string,
    resource: { type: SidofunResourceType; id: string; metadata?: Record<string, unknown> },
    options?: { exclusive?: boolean; takeover?: boolean }
  ) {
    const session = this.touchSession(sessionId);
    const owners = this.getResourceOwners(resource.type, resource.id).owners;
    const foreignOwners = owners.filter((owner) => owner.sessionId !== sessionId);

    if (options?.exclusive && foreignOwners.length > 0) {
      if (!options.takeover) {
        throw new Error(`Resource ${resource.type}:${resource.id} is already owned by ${foreignOwners.map((owner) => owner.sessionId).join(', ')}`);
      }
      for (const owner of foreignOwners) {
        this.releaseResource(owner.sessionId, resource.type, resource.id);
      }
    }

    const existing = session.resources.find((item) => item.type === resource.type && item.id === resource.id);
    if (!existing) {
      session.resources.push({
        ...resource,
        ownedAt: new Date().toISOString()
      });
    }
    return session;
  }

  listOwnedResources(options?: { type?: SidofunResourceType; sessionId?: string }) {
    const resources = this.listSessions().sessions.flatMap((session) =>
      session.resources
        .filter((resource) => !options?.type || resource.type === options.type)
        .filter(() => !options?.sessionId || session.id === options.sessionId)
        .map((resource) => ({
          sessionId: session.id,
          clientKind: session.clientKind,
          sessionName: session.name,
          resource
        }))
    );

    return {
      resources,
      count: resources.length
    };
  }

  getResourceOwners(type: SidofunResourceType, id: string): ResourceOwnerInfo {
    const owners = this.listSessions().sessions.flatMap((session) =>
      session.resources
        .filter((resource) => resource.type === type && resource.id === id)
        .map((resource) => ({
          sessionId: session.id,
          clientKind: session.clientKind,
          name: session.name,
          ownedAt: resource.ownedAt,
          metadata: resource.metadata
        }))
    );

    return {
      type,
      id,
      owners,
      ownerCount: owners.length
    };
  }

  releaseResource(sessionId: string, type: SidofunResourceType, id: string) {
    const session = this.touchSession(sessionId);
    session.resources = session.resources.filter((item) => !(item.type === type && item.id === id));
    return session;
  }

  setSessionResources(sessionId: string, resources: OwnedResource[]) {
    const session = this.getSession(sessionId);
    session.resources = [...resources];
    session.lastActivity = new Date().toISOString();
    return session;
  }

  async closeSession(sessionId: string, options?: { cleanupOwnedResources?: boolean }) {
    const session = this.getSession(sessionId);
    if (!session.shutdown && options?.cleanupOwnedResources !== false) {
      for (const resource of [...session.resources].reverse()) {
        const handler = this.cleanupHandlers.get(resource.type);
        if (!handler) {
          continue;
        }
        try {
          await handler(resource);
        } catch {
          // Resource cleanup is best-effort at this layer.
        }
      }
    }

    session.shutdown = true;
    session.lastActivity = new Date().toISOString();
    this.sessions.delete(sessionId);
    return {
      id: session.id,
      closed: true,
      cleanedUpResources: session.resources.length
    };
  }

  listIdleSessions(maxIdleMs: number, options?: { clientKind?: SidofunClientKind }) {
    const now = Date.now();
    const sessions = [...this.sessions.values()].filter((session) => {
      if (options?.clientKind && session.clientKind !== options.clientKind) {
        return false;
      }
      const idleMs = now - new Date(session.lastActivity).getTime();
      return idleMs >= maxIdleMs;
    });

    return {
      sessions,
      count: sessions.length
    };
  }

  async reapIdleSessions(maxIdleMs: number, options?: { clientKind?: SidofunClientKind; cleanupOwnedResources?: boolean }): Promise<SessionSweepResult> {
    const idleSessions = this.listIdleSessions(maxIdleMs, { clientKind: options?.clientKind }).sessions;
    const closedSessionIds: string[] = [];

    for (const session of idleSessions) {
      await this.closeSession(session.id, { cleanupOwnedResources: options?.cleanupOwnedResources });
      closedSessionIds.push(session.id);
    }

    return {
      closedSessionIds,
      closedCount: closedSessionIds.length
    };
  }
}
