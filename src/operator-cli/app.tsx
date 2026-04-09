import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { BrowserInfo } from '../services/browser/types.js';
import type { OperatorSnapshot, SessionInfo } from './types.js';
import { OperatorService } from './operator-service.js';

type Pane = 'cmd' | 'pwsh' | 'browsers';

function summarizeSession(session: SessionInfo): string {
  return `${session.tabTitle} (${session.terminalKind})`;
}

function summarizeBrowser(browser: BrowserInfo): string {
  return `${browser.displayName} [${browser.installed ? 'installed' : 'missing'}]`;
}

export function OperatorDashboard({ service }: { service: OperatorService }) {
  const { exit } = useApp();
  const [snapshot, setSnapshot] = useState<OperatorSnapshot>(() => service.captureSnapshot());
  const [pane, setPane] = useState<Pane>('cmd');
  const [selection, setSelection] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => {
    if (pane === 'cmd') return snapshot.cmdSessions.map(summarizeSession);
    if (pane === 'pwsh') return snapshot.pwshSessions.map(summarizeSession);
    return snapshot.browsers.map(summarizeBrowser);
  }, [pane, snapshot]);

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        setSnapshot(service.captureSnapshot());
        setError(null);
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [service]);

  useEffect(() => {
    if (selection >= items.length) {
      setSelection(Math.max(0, items.length - 1));
    }
  }, [items.length, selection]);

  useInput((input: string, key: { upArrow?: boolean; downArrow?: boolean }) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (input === 'r') {
      setSnapshot(service.captureSnapshot());
      return;
    }
    if (input === '1') {
      setPane('cmd');
      setSelection(0);
      return;
    }
    if (input === '2') {
      setPane('pwsh');
      setSelection(0);
      return;
    }
    if (input === '3') {
      setPane('browsers');
      setSelection(0);
      return;
    }
    if (key.upArrow || input === 'k') {
      setSelection((current: number) => Math.max(0, current - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelection((current: number) => Math.min(items.length - 1, current + 1));
    }
  });

  const selectedDetail = (() => {
    if (pane === 'cmd') return snapshot.cmdSessions[selection];
    if (pane === 'pwsh') return snapshot.pwshSessions[selection];
    return snapshot.browsers[selection];
  })();

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="cyanBright">Sidofun Operator</Text>
        <Text color="gray">Updated {new Date(snapshot.capturedAt).toLocaleTimeString()}</Text>
      </Box>

      <Box marginBottom={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={1} marginRight={1}>
          <Text>Browsers: {snapshot.browsers.filter((browser: BrowserInfo) => browser.installed).length}/{snapshot.browsers.length}</Text>
        </Box>
        <Box borderStyle="round" borderColor="green" paddingX={1} marginRight={1}>
          <Text>CMD: {snapshot.cmdSessions.length}</Text>
        </Box>
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>PowerShell: {snapshot.pwshSessions.length}</Text>
        </Box>
      </Box>

      <Box flexGrow={1}>
        <Box width="40%" flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginRight={1}>
          <Text color="magentaBright">
            {pane === 'cmd' ? 'Tracked CMD Sessions' : pane === 'pwsh' ? 'Tracked PowerShell Sessions' : 'Browsers'}
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {items.length === 0 ? (
              <Text color="gray">No entries.</Text>
            ) : (
              items.map((item: string, index: number) => (
                <Text key={`${pane}-${index}`} color={index === selection ? 'greenBright' : undefined}>
                  {index === selection ? '>' : ' '} {item}
                </Text>
              ))
            )}
          </Box>
        </Box>

        <Box width="60%" flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text color="magentaBright">Details</Text>
          <Box marginTop={1} flexDirection="column">
            {!selectedDetail && <Text color="gray">Nothing selected.</Text>}
            {selectedDetail && pane !== 'browsers' && (
              <>
                <Text>ID: {(selectedDetail as SessionInfo).id}</Text>
                <Text>Title: {(selectedDetail as SessionInfo).tabTitle}</Text>
                <Text>Kind: {(selectedDetail as SessionInfo).terminalKind}</Text>
                <Text>
                  Rect: {(selectedDetail as SessionInfo).rect.width}x{(selectedDetail as SessionInfo).rect.height} @ {(selectedDetail as SessionInfo).rect.x},{(selectedDetail as SessionInfo).rect.y}
                </Text>
                <Text>Host: {(selectedDetail as SessionInfo).hostProcessName || 'unknown'}</Text>
                <Text>Commands: {(selectedDetail as SessionInfo).commandCount}</Text>
              </>
            )}
            {selectedDetail && pane === 'browsers' && (
              <>
                <Text>ID: {(selectedDetail as BrowserInfo).id}</Text>
                <Text>Display: {(selectedDetail as BrowserInfo).displayName}</Text>
                <Text>Installed: {(selectedDetail as BrowserInfo).installed ? 'yes' : 'no'}</Text>
                <Text>Launch Mode: {(selectedDetail as BrowserInfo).launchMode}</Text>
                <Text>Private: {(selectedDetail as BrowserInfo).supportsPrivateMode ? 'yes' : 'no'}</Text>
                <Text>Headless: {(selectedDetail as BrowserInfo).supportsHeadless ? 'yes' : 'no'}</Text>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray">1 CMD  2 PowerShell  3 Browsers  j/k move  r refresh  q quit</Text>
        {error ? <Text color="red">Error: {error}</Text> : <Text color="gray">Windows operator console</Text>}
      </Box>
    </Box>
  );
}
