export interface ProcessInfo {
  pid: number;
  processName: string;
  executablePath?: string;
  hasWindow: boolean;
  isVisible: boolean;
  mainWindowHandle?: number;
  mainWindowTitle?: string;
}

export interface WindowInfo {
  handle: number;
  title: string;
  pid?: number;
  processName?: string;
  executablePath?: string;
  visible: boolean;
  isForeground: boolean;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
