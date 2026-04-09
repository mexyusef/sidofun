"""
Type hints for Sidofun Desktop Python client.
"""

from typing import TypedDict, Optional, Any


class Point(TypedDict):
    x: int
    y: int


class Rect(TypedDict):
    x: int
    y: int
    width: int
    height: int


class ScreenSize(TypedDict):
    width: int
    height: int


class ScreenshotResult(TypedDict):
    filepath: str
    data: Optional[str]  # base64 data URL if returnBase64 is true
    width: int
    height: int
    format: str


class ActiveWindowResult(TypedDict):
    title: str
    handle: int
    rect: Rect
    pid: Optional[int]
    processName: Optional[str]
    executablePath: Optional[str]


class ProcessInfo(TypedDict):
    pid: int
    processName: str
    executablePath: Optional[str]
    hasWindow: bool
    isVisible: bool
    mainWindowHandle: Optional[int]
    mainWindowTitle: Optional[str]


class WindowInfo(TypedDict):
    handle: int
    title: str
    pid: Optional[int]
    processName: Optional[str]
    executablePath: Optional[str]
    visible: bool
    isForeground: bool
    rect: Rect


class LocalCoderWindowInfo(TypedDict):
    handle: int
    title: str
    rect: Rect


class LocalCoderAppStatus(TypedDict):
    id: str
    displayName: str
    installed: bool
    executablePath: str
    workingDirectory: str
    processName: str
    running: bool
    focused: bool
    pid: Optional[int]
    window: Optional[LocalCoderWindowInfo]


class LocalCoderRunResult(TypedDict):
    id: str
    displayName: str
    executablePath: str
    workingDirectory: str
    prompt: str
    exitCode: int
    success: bool
    summary: str
    stdout: str
    stderr: str
    timedOut: bool
    command: list[str]


class ClipboardStatus(TypedDict):
    text: str
    length: int
    hasText: bool


class OwnedResource(TypedDict):
    type: str
    id: str
    metadata: Optional[dict[str, Any]]
    ownedAt: str


class ClientSession(TypedDict):
    id: str
    clientKind: str
    name: Optional[str]
    createdAt: str
    lastActivity: str
    shutdown: bool
    resources: list[OwnedResource]


class ClientSessionList(TypedDict):
    sessions: list[ClientSession]
    count: int


class ShellRunResult(TypedDict):
    shell: str
    command: str
    cwd: str
    stdout: str
    stderr: str
    exitCode: int
    success: bool
    timedOut: bool
    durationMs: int
    argv: list[str]


class GenericTerminalSession(TypedDict):
    kind: str
    session: dict[str, Any]


class GenericTerminalList(TypedDict):
    sessions: list[GenericTerminalSession]
    count: int


class DesktopScopeRecord(TypedDict):
    id: str
    name: str
    createdAt: str
    updatedAt: str
    selectors: dict[str, Any]


class DesktopScopeWindow(WindowInfo):
    relativeRect: Rect


class DesktopScopeInfo(DesktopScopeRecord):
    alive: bool
    bounds: Rect
    windows: list[DesktopScopeWindow]
    activeWindowHandle: Optional[int]


class DesktopScopeList(TypedDict):
    scopes: list[DesktopScopeInfo]
    count: int


class CMDSessionInfo(TypedDict):
    id: str
    title: str
    tabTitle: str
    handle: int
    currentDirectory: str
    commandCount: int
    age: int
    lastActivity: str  # ISO datetime string
    rect: Rect
    terminalKind: str
    hostProcessName: Optional[str]
    hostPid: Optional[int]
    hostExecutablePath: Optional[str]
    hostWindowTitle: Optional[str]


class TerminalStatusResult(TypedDict):
    session: CMDSessionInfo
    screenshot: Optional[ScreenshotResult]


class CMDSessionList(TypedDict):
    sessions: list[CMDSessionInfo]
    count: int


class CMDSpawnResult(TypedDict):
    sessionId: str
    message: str


class CMDExecResult(TypedDict):
    command: str
    duration: int
    exitCode: Optional[int]
    screenshot: Optional[ScreenshotResult]
    success: bool


class BrowserInfo(TypedDict):
    id: str
    displayName: str
    installed: bool
    executablePath: Optional[str]
    userDataPath: Optional[str]
    profileStrategy: str
    supportsProfiles: bool
    supportsProfileLaunch: bool
    notes: Optional[str]


class BrowserProfileInfo(TypedDict):
    id: str
    browserId: str
    name: str
    displayName: str
    path: str
    isDefault: bool
    emails: list[str]
    lastUsedAt: Optional[str]


class BrowserLaunchResult(TypedDict):
    browserId: str
    executablePath: str
    command: list[str]
    pid: Optional[int]
    usedProfile: Optional[BrowserProfileInfo]


class BrowserLaunchAndFocusResult(TypedDict):
    launch: BrowserLaunchResult
    window: "BrowserWindowInfo"


class BrowserRuntimeInfo(TypedDict):
    id: str
    browserId: str
    automationMode: str
    createdAt: str
    closedAt: Optional[str]
    status: str
    pid: Optional[int]
    debugPort: int
    remoteDebuggingUrl: str
    executablePath: str
    command: list[str]
    usedProfile: Optional[BrowserProfileInfo]
    launchResult: BrowserLaunchResult


class BrowserRuntimeCloseResult(TypedDict):
    id: str
    closed: bool
    status: str
    closedAt: Optional[str]
    pid: Optional[int]


class BrowserPageInfo(TypedDict):
    id: str
    runtimeId: str
    url: str
    title: str
    createdAt: str
    closedAt: Optional[str]
    status: str


class BrowserPageActionResult(TypedDict):
    page: BrowserPageInfo


class BrowserPageContentResult(TypedDict):
    page: BrowserPageInfo
    content: str


class BrowserPageScreenshotResult(TypedDict):
    page: BrowserPageInfo
    path: Optional[str]


class BrowserPageEvaluateResult(TypedDict):
    page: BrowserPageInfo
    value: Any


class BrowserPageWaitResult(TypedDict):
    page: BrowserPageInfo
    matched: bool
    waitFor: str
    query: Optional[str]


class BrowserPagePdfResult(TypedDict):
    page: BrowserPageInfo
    path: str


class BrowserPageDownloadResult(TypedDict):
    page: BrowserPageInfo
    path: str
    url: str


class BrowserNetworkEvent(TypedDict):
    pageId: str
    kind: str
    url: str
    method: Optional[str]
    status: Optional[int]
    timestamp: str
    errorText: Optional[str]


class BrowserExtensionNetworkEvent(TypedDict):
    id: str
    tabId: Optional[int]
    windowId: Optional[int]
    url: str
    method: Optional[str]
    type: Optional[str]
    stage: str
    statusCode: Optional[int]
    statusLine: Optional[str]
    error: Optional[str]
    timestamp: str


class BrowserConsoleEvent(TypedDict):
    pageId: str
    type: str
    text: str
    timestamp: str


class BrowserNetworkWaitResult(TypedDict):
    page: BrowserPageInfo
    matched: bool
    urlIncludes: Optional[str]
    kind: Optional[str]
    status: Optional[int]


class BrowserPageEvent(TypedDict):
    id: int
    pageId: str
    category: str
    timestamp: str
    payload: dict[str, Any]


class BrowserPageEventCursorResult(TypedDict):
    page: BrowserPageInfo
    events: list[BrowserPageEvent]
    nextCursor: int


class BrowserWindowBounds(TypedDict):
    x: int
    y: int
    width: int
    height: int


class BrowserWindowInfo(TypedDict):
    handle: int
    title: str
    processName: str
    pid: int
    browserId: Optional[str]
    bounds: Optional[BrowserWindowBounds]
