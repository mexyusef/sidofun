export interface BrowserContentGuardrailResult {
  original: string;
  sanitized: string;
  modified: boolean;
  threats: string[];
}

const THREAT_PATTERNS: Array<{ kind: string; pattern: RegExp }> = [
  { kind: 'prompt_override', pattern: /ignore (all|any|previous|prior) instructions/gi },
  { kind: 'prompt_override', pattern: /disregard (all|any|previous|prior) instructions/gi },
  { kind: 'credential_request', pattern: /enter (your )?(password|credentials|api key)/gi },
  { kind: 'data_exfiltration', pattern: /send .* to (http|https):\/\//gi },
  { kind: 'script_tag', pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi }
];

export class BrowserContentGuardrailsService {
  sanitize(content: string | undefined): BrowserContentGuardrailResult {
    const original = content ?? '';
    let sanitized = original;
    const threats: string[] = [];

    for (const entry of THREAT_PATTERNS) {
      if (entry.pattern.test(sanitized)) {
        threats.push(entry.kind);
        sanitized = sanitized.replace(entry.pattern, '[filtered]');
      }
    }

    sanitized = sanitized.replace(/<\/?(system|assistant|user|tool)>/gi, '');
    return {
      original,
      sanitized,
      modified: sanitized !== original,
      threats
    };
  }
}

