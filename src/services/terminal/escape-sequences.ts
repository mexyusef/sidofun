export interface TextSegment {
  type: 'text';
  value: string;
}

export interface DelaySegment {
  type: 'delay';
  value: number;
}

export interface WindowActionSegment {
  type: 'window_action';
  value: 'maximize' | 'minimize' | 'restore' | 'focus';
}

export type EscapeSequenceSegment = TextSegment | DelaySegment | WindowActionSegment;

/**
 * Parse escaped terminal text into text, delay, and window-action segments.
 * Supports: \n, \t, \\, \", \dN, \M, \m, \r, \f
 */
export function parseEscapeSequences(text: string): EscapeSequenceSegment[] {
  const segments: EscapeSequenceSegment[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1];

      switch (next) {
        case 'n':
          currentText += '\n';
          i += 2;
          break;
        case 't':
          currentText += '\t';
          i += 2;
          break;
        case '\\':
          currentText += '\\';
          i += 2;
          break;
        case '"':
          currentText += '"';
          i += 2;
          break;
        case 'd': {
          i += 2;
          let delayStr = '';
          while (i < text.length && /[0-9.]/.test(text[i])) {
            delayStr += text[i];
            i += 1;
          }
          if (currentText) {
            segments.push({ type: 'text', value: currentText });
            currentText = '';
          }
          segments.push({
            type: 'delay',
            value: delayStr ? parseFloat(delayStr) : 500
          });
          break;
        }
        case 'M':
        case 'm':
        case 'r':
        case 'f': {
          if (currentText) {
            segments.push({ type: 'text', value: currentText });
            currentText = '';
          }
          const actionMap = {
            M: 'maximize',
            m: 'minimize',
            r: 'restore',
            f: 'focus'
          } as const;
          segments.push({ type: 'window_action', value: actionMap[next] });
          i += 2;
          break;
        }
        default:
          currentText += `\\${next}`;
          i += 2;
          break;
      }
    } else {
      currentText += text[i];
      i += 1;
    }
  }

  if (currentText) {
    segments.push({ type: 'text', value: currentText });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}
