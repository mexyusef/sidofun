"""Simple PowerShell test"""

from sidofun_desktop import DesktopWinClient

print("Starting client...")
with DesktopWinClient() as client:
    print("Client started!")
    print("Spawning PowerShell...")
    session = client.pwsh_spawn("Test")
    print(f"Session: {session.id}")
    print("Typing command...")
    session.send("Write-Host 'Hello from PowerShell!' -ForegroundColor Green")
    print("Done! Check for PowerShell window.")
