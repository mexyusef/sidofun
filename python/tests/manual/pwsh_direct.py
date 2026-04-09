from sidofun_desktop import DesktopWinClient
import subprocess
import time
import json
from pathlib import Path

# Start Bun manually to see errors
print("=" * 60)
print("Starting Bun CLI manually to see errors...")
print("=" * 60)

BACKEND_ROOT = Path(__file__).resolve().parents[3]

proc = subprocess.Popen(
    ['bun', 'run', 'src/cli-ipc.ts'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=str(BACKEND_ROOT),
    shell=True
)

time.sleep(3)

# Check if it's running
if proc.poll() is None:
    print("[OK] Bun is running!")
    
    # Send a test JSON request
    test_request = json.dumps({
        "id": 1,
        "action": "pwsh_spawn",
        "params": {"title": "Test"}
    }) + "\n"
    
    print("Sending test request...")
    proc.stdin.write(test_request.encode())
    proc.stdin.flush()
    
    time.sleep(2)
    
    # Read response
    try:
        response = proc.stdout.readline().decode().strip()
        print("Response:", response)
    except Exception as e:
        print("Read error:", e)
    
    proc.terminate()
else:
    print("[ERROR] Bun died!")
    stdout, stderr = proc.communicate()
    print("Return code:", proc.poll())
    print("STDOUT:", stdout.decode() if stdout else "(empty)")
    print("STDERR:", stderr.decode() if stderr else "(empty)")
