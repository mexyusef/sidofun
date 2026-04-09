"""
PowerShell Automation Example

This example demonstrates:
1. Spawning a PowerShell window
2. Typing commands
3. Taking a screenshot of the output
"""

import sys
from sidofun_desktop import DesktopWinClient
import time

def main():
    print("=" * 60)
    print("PowerShell Automation Example")
    print("=" * 60)
    print()

    try:
        with DesktopWinClient() as client:
            # 1. Spawn PowerShell window
            print("1. Spawning PowerShell window...")
            session = client.pwsh_spawn("PowerShell Demo")
            print(f"   ✓ Session ID: {session.id}")
            print()
            
            # Give PowerShell time to start
            time.sleep(2)
            
            # 2. Maximize the window
            print("2. Maximizing window...")
            session.maximize()
            time.sleep(0.5)
            print("   ✓ Window maximized")
            print()
            
            # 3. Type and execute commands
            print("3. Running commands...")
            
            # Command 1: Get system info
            print("   - Getting system info...")
            session.send("Write-Host '=== System Information ===' -ForegroundColor Cyan")
            time.sleep(0.5)
            
            session.send("Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsArchitecture")
            time.sleep(2)
            
            # Command 2: Get processes
            print("   - Getting top 5 processes by CPU...")
            session.send("")
            time.sleep(0.5)
            session.send("Write-Host '=== Top 5 Processes by CPU ===' -ForegroundColor Green")
            time.sleep(0.5)
            session.send("Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, CPU, WorkingSet")
            time.sleep(2)
            
            # Command 3: Get services
            print("   - Getting running services...")
            session.send("")
            time.sleep(0.5)
            session.send("Write-Host '=== Running Services ===' -ForegroundColor Yellow")
            time.sleep(0.5)
            session.send("Get-Service | Where-Object Status -eq 'Running' | Select-Object -First 10 Name, Status, DisplayName")
            time.sleep(2)
            
            # 4. Take screenshot
            print()
            print("4. Taking screenshot...")
            screenshot = session.screenshot(filename="pwsh-demo-output.png", return_base64=False)
            print(f"   ✓ Screenshot saved to: {screenshot['filepath']}")
            print(f"   ✓ Size: {screenshot['width']}x{screenshot['height']}")
            print()
            
            # 5. Get session info
            print("5. Session info:")
            info = session.info()
            print(f"   - Title: {info['title']}")
            print(f"   - Commands run: {info['commandCount']}")
            print(f"   - Age: {info['age']}ms")
            print()
            
            # 6. Keep window open for viewing
            print("6. PowerShell window will remain open for 10 seconds...")
            print("   (You can view the output)")
            time.sleep(10)
            
            # 7. Close session
            print()
            print("7. Closing session...")
            session.close()
            print("   ✓ Session closed")
            print()
            
        print("=" * 60)
        print("Example completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
