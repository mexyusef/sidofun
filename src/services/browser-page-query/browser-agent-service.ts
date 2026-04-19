import type {
  BrowserAgentPlanStep,
  BrowserAgentRunResult,
  BrowserPageRecordedAction,
  BrowserPageReplayResult
} from '../browser-automation/types.js';
import type { BrowserContentGuardrailsService } from './browser-content-guardrails-service.js';
import type { BrowserPageReplayService } from './browser-page-replay-service.js';
import type { TelemetryService } from '../telemetry/telemetry-service.js';

export interface BrowserAgentRunOptions {
  runtimeId: string;
  url?: string;
  goal?: string;
  steps: BrowserAgentPlanStep[];
  maxSteps?: number;
  maxFailures?: number;
  trajectoryId?: string;
}

export class BrowserAgentService {
  constructor(
    private readonly replayService: BrowserPageReplayService,
    private readonly guardrails: BrowserContentGuardrailsService,
    private readonly telemetryService?: TelemetryService
  ) {}

  async run(options: BrowserAgentRunOptions): Promise<BrowserAgentRunResult> {
    const maxSteps = options.maxSteps ?? 50;
    const maxFailures = options.maxFailures ?? 3;
    const result: BrowserAgentRunResult = {
      runtimeId: options.runtimeId,
      goal: options.goal,
      completed: false,
      plannerSteps: 0,
      navigatorActions: 0,
      failures: 0,
      steps: []
    };

    let pageId: string | undefined;

    for (const step of options.steps.slice(0, maxSteps)) {
      result.plannerSteps += 1;
      const sanitizedGoal = this.guardrails.sanitize(step.goal);
      const replay = pageId
        ? await this.replayService.replay(pageId, step.actions)
        : await this.replayService.openAndReplay(options.runtimeId, options.url, step.actions);

      pageId = replay.page.id;
      const actionResults = replay.steps.map((entry) => ({
        kind: entry.action.kind,
        matched: entry.matched,
        detail: entry.detail
      }));

      result.navigatorActions += actionResults.length;
      const ok = actionResults.every((entry) => entry.matched);
      if (!ok) {
        result.failures += 1;
      }

      result.steps.push({
        goal: sanitizedGoal.sanitized,
        ok,
        actions: actionResults
      });

      if (options.trajectoryId) {
        await this.telemetryService?.appendTurn(options.trajectoryId, {
          turnId: `browser_agent_step_${result.plannerSteps}`,
          role: 'browser_agent',
          prompt: sanitizedGoal.sanitized,
          response: ok ? 'step_ok' : 'step_failed',
          actions: step.actions,
          metadata: {
            threats: sanitizedGoal.threats,
            modified: sanitizedGoal.modified
          }
        });
      }

      if (result.failures >= maxFailures) {
        break;
      }

      if (step.actions.some((action) => action.kind === 'done')) {
        result.completed = ok;
        result.page = replay.page;
        return result;
      }
    }

    if (pageId) {
      const terminalReplay = await this.replayService.replay(pageId, []);
      result.page = terminalReplay.page;
    }
    result.completed = result.failures === 0 && result.steps.length > 0;
    return result;
  }
}
