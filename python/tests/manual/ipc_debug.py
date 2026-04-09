"""
Debug test to see what Bun outputs.
"""

import sys
import os
import subprocess
import time
import json

PACKAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

sys.path.insert(0, PACKAGE_ROOT)

cli_path = os.path.abspath(
    os.path.join(
        BACKEND_ROOT,
        "src",
        "cli-ipc.ts"
    )
)

print("=== Debug: Running Bun CLI directly ===")
print(f"CLI path: {cli_path}")
print(f"Working dir: {os.getcwd()}")
print()

# Start Bun process
proc = subprocess.Popen(
    ["bun", "run", cli_path],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=False,
    bufsize=0,
    cwd=BACKEND_ROOT,
)

print("Bun process started, waiting 1 second...")
time.sleep(1)

print("\n--- Sending request ---")
request = {"id": 1, "action": "screen_size"}
request_line = json.dumps(request) + "\n"
print(f"Sending: {request_line.strip()}")
proc.stdin.write(request_line.encode('utf-8'))
proc.stdin.flush()

print("\n--- Reading stdout (with timeout) ---")
import select

# Wait for data with timeout
if hasattr(select, 'select'):
    ready, _, _ = select.select([proc.stdout], [], [], 5)
    if ready:
        response_line = proc.stdout.readline()
        print(f"Raw stdout bytes: {response_line}")
        if response_line:
            print(f"Decoded: {response_line.decode('utf-8').strip()}")
    else:
        print("Timeout - no data on stdout")
else:
    # Windows doesn't have select.select for files
    response_line = proc.stdout.readline()
    print(f"Raw stdout bytes: {response_line}")
    if response_line:
        print(f"Decoded: {response_line.decode('utf-8').strip()}")

print("\n--- Reading stderr ---")
# Try to read stderr
try:
    proc.stdin.close()
    # Read any stderr output
    import threading
    def read_stderr():
        data = proc.stderr.read()
        if data:
            print(f"Stderr output:\n{data.decode('utf-8', errors='replace')}")

    t = threading.Thread(target=read_stderr)
    t.daemon = True
    t.start()
    t.join(timeout=2)
except Exception as e:
    print(f"Error reading stderr: {e}")

print("\n--- Process status ---")
poll_result = proc.poll()
print(f"Process poll() result: {poll_result}")

print("\n--- Killing process ---")
proc.terminate()
try:
    proc.wait(timeout=5)
except:
    proc.kill()

import json
