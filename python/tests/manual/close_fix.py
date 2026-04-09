"""Quick test for pwsh_close fix"""
from sidofun_desktop import DesktopWinClient
import time

print("Starting quick test...")
client = DesktopWinClient()
client.start()
print("Client started")

# Test PowerShell
print("\n=== Testing PowerShell ===")
ps = client.pwsh_spawn("QuickTest")
print(f"Spawned: {ps}")

result = client.pwsh_exec(ps, "Write-Host 'Hello from PowerShell'", wait=True, timeout=10000)
print(f"Executed in {result.get('duration', 0)}ms")

print("Closing PowerShell session...")
client.pwsh_close(ps)
print("PowerShell closed successfully!")

# Test CMD
print("\n=== Testing CMD ===")
cmd = client.cmd_spawn("QuickTest")
print(f"Spawned: {cmd}")

result = client.cmd_exec(cmd, "echo Hello from CMD", wait=True)
print(f"Executed in {result.get('duration', 0)}ms")

print("Closing CMD session...")
client.cmd_close(cmd)
print("CMD closed successfully!")

# Cleanup
print("\n=== Cleanup ===")
client = None
print("All tests passed!")
