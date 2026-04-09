import { describe, expect, test } from 'bun:test';
import { SessionManagerService } from '../src/services/session-manager/session-manager-service.js';

describe('SessionManagerService', () => {
  test('claims exclusive ownership and supports takeover', () => {
    const service = new SessionManagerService();
    const first = service.createSession({ clientKind: 'operator', name: 'first' });
    const second = service.createSession({ clientKind: 'operator', name: 'second' });

    service.ownResource(first.id, { type: 'terminal', id: 'cmd_1' });

    expect(() =>
      service.claimResource(second.id, { type: 'terminal', id: 'cmd_1' }, { exclusive: true })
    ).toThrow('already owned');

    const claimed = service.claimResource(second.id, { type: 'terminal', id: 'cmd_1' }, {
      exclusive: true,
      takeover: true
    });

    expect(claimed.resources).toHaveLength(1);
    expect(service.getSession(first.id).resources).toHaveLength(0);
    expect(service.getResourceOwners('terminal', 'cmd_1')).toEqual({
      type: 'terminal',
      id: 'cmd_1',
      owners: [
        expect.objectContaining({
          sessionId: second.id,
          clientKind: 'operator'
        })
      ],
      ownerCount: 1
    });
  });

  test('lists owned resources with filters', () => {
    const service = new SessionManagerService();
    const first = service.createSession({ clientKind: 'operator', name: 'first' });
    const second = service.createSession({ clientKind: 'mcp', name: 'second' });

    service.ownResource(first.id, { type: 'terminal', id: 'cmd_1' });
    service.ownResource(first.id, { type: 'desktop_scope', id: 'scope_1' });
    service.ownResource(second.id, { type: 'trace', id: 'trace_1' });

    expect(service.listOwnedResources().count).toBe(3);
    expect(service.listOwnedResources({ type: 'terminal' })).toEqual({
      resources: [
        expect.objectContaining({
          sessionId: first.id,
          clientKind: 'operator',
          resource: expect.objectContaining({
            type: 'terminal',
            id: 'cmd_1'
          })
        })
      ],
      count: 1
    });
    expect(service.listOwnedResources({ sessionId: second.id })).toEqual({
      resources: [
        expect.objectContaining({
          sessionId: second.id,
          clientKind: 'mcp',
          resource: expect.objectContaining({
            type: 'trace',
            id: 'trace_1'
          })
        })
      ],
      count: 1
    });
  });

  test('lists and reaps idle sessions by threshold and client kind', async () => {
    const service = new SessionManagerService();
    const closed: string[] = [];
    service.registerCleanupHandler('desktop_scope', async (resource) => {
      closed.push(resource.id);
    });

    const oldSession = service.createSession({ clientKind: 'mcp', name: 'old' });
    const freshSession = service.createSession({ clientKind: 'mcp', name: 'fresh' });
    const otherKind = service.createSession({ clientKind: 'operator', name: 'operator' });

    service.ownResource(oldSession.id, { type: 'desktop_scope', id: 'scope_old' });
    service.ownResource(freshSession.id, { type: 'desktop_scope', id: 'scope_fresh' });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    service.getSession(oldSession.id).lastActivity = tenMinutesAgo;
    service.getSession(otherKind.id).lastActivity = tenMinutesAgo;

    const idle = service.listIdleSessions(5 * 60 * 1000, { clientKind: 'mcp' });
    expect(idle.sessions.map((session) => session.id)).toEqual([oldSession.id]);

    const reaped = await service.reapIdleSessions(5 * 60 * 1000, { clientKind: 'mcp' });
    expect(reaped).toEqual({
      closedSessionIds: [oldSession.id],
      closedCount: 1
    });
    expect(closed).toEqual(['scope_old']);
    expect(service.listSessions().sessions.map((session) => session.id).sort()).toEqual([freshSession.id, otherKind.id].sort());
  });
});
