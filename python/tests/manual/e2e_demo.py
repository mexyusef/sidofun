"""
End-to-End test for Sidofun Desktop automation.

Tests: PowerShell spawn, exec, typing, screenshots, cleanup
"""

from sidofun_desktop import DesktopWinClient
import time
import sys


def main():
    """Run all E2E tests with single client instance"""
    print("\n" + "=" * 60)
    print("E2E TEST SUITE - AgentAssist + Sidofun")
    print("=" * 60)
    print(f"Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    results = {}
    
    try:
        # Use single client instance to maintain sessions
        print("Initializing DesktopWinClient...")
        client = DesktopWinClient()
        client.start()
        print("[OK] Client initialized\n")
        
        # Test 1: PowerShell Spawn
        print("=" * 60)
        print("TEST 1: PowerShell Spawn")
        print("=" * 60)
        try:
            ps = client.pwsh_spawn(
                title="E2E Test Session",
                execution_policy="Bypass",
                use_pwsh7=True
            )
            print(f"[OK] PowerShell spawned: {ps}")
            results["PowerShell Spawn"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["PowerShell Spawn"] = False
            return False
        
        # Test 2: Command Execution
        print("\n" + "=" * 60)
        print("TEST 2: Command Execution")
        print("=" * 60)
        try:
            print("Executing: Write-Host 'Hello from E2E Test'")
            result = client.pwsh_exec(
                ps,
                "Write-Host 'Hello from E2E Test' -ForegroundColor Green",
                wait=True,
                timeout=5000
            )
            print(f"[OK] Command executed in {result.get('duration', 0)}ms")
            print(f"    Output: {result.get('output', 'N/A')[:80]}")
            results["Command Execution"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["Command Execution"] = False
        
        # Test 3: System Command
        print("\n" + "=" * 60)
        print("TEST 3: System Command (Get-Process)")
        print("=" * 60)
        try:
            print("Executing: Get-Process | Select-Object -First 3 Name")
            result = client.pwsh_exec(
                ps,
                "Get-Process | Select-Object -First 3 Name | Format-Table",
                wait=True,
                timeout=10000
            )
            print(f"[OK] Process list retrieved")
            print(f"    Output:\n{result.get('output', 'N/A')[:200]}")
            results["System Command"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["System Command"] = False
        
        # Test 4: Typing
        print("\n" + "=" * 60)
        print("TEST 4: Typing with Escape Sequences")
        print("=" * 60)
        try:
            print("Typing: Write-Host 'Testing typing'")
            client.pwsh_type(ps, "Write-Host 'Testing typing'\n")
            time.sleep(1)
            print("[OK] Typing successful")
            results["Typing"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["Typing"] = False
        
        # Test 5: Screenshot
        print("\n" + "=" * 60)
        print("TEST 5: Screenshot")
        print("=" * 60)
        try:
            print("Taking screenshot...")
            screenshot = client.pwsh_screenshot(
                ps,
                filename="e2e-test-screenshot.png",
                return_base64=False
            )
            filepath = screenshot.get('filepath', 'unknown')
            print(f"[OK] Screenshot saved: {filepath}")
            results["Screenshot"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["Screenshot"] = False
        
        # Test 6: Session Cleanup
        print("\n" + "=" * 60)
        print("TEST 6: Session Cleanup")
        print("=" * 60)
        try:
            print(f"Closing session: {ps}")
            client.pwsh_close(ps)
            print("[OK] Session closed successfully")
            results["Session Cleanup"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["Session Cleanup"] = False
        
        # Test 7: CMD Execution
        print("\n" + "=" * 60)
        print("TEST 7: CMD Execution")
        print("=" * 60)
        try:
            cmd = client.cmd_spawn(title="CMD Test")
            print(f"[OK] CMD spawned: {cmd}")
            
            result = client.cmd_exec(
                cmd,
                "echo Hello from CMD",
                wait=True
            )
            print(f"[OK] CMD executed")
            
            client.cmd_close(cmd)
            print("[OK] CMD closed")
            results["CMD Execution"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["CMD Execution"] = False
        
        # Test 8: Desktop Screenshot
        print("\n" + "=" * 60)
        print("TEST 8: Desktop Screenshot")
        print("=" * 60)
        try:
            print("Taking desktop screenshot...")
            screenshot = client.screenshot(filename="desktop-screenshot.png")
            print(f"[OK] Screenshot: {screenshot.get('filepath', 'unknown')}")
            results["Desktop Screenshot"] = True
        except Exception as e:
            print(f"[FAIL] {e}")
            results["Desktop Screenshot"] = False
        
        # Cleanup
        print("\n" + "=" * 60)
        print("Cleaning up...")
        print("=" * 60)
        client = None  # Context manager cleanup
        print("[OK] Client cleaned up\n")
        
    except Exception as e:
        print(f"\n[FAIL] Test suite error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Print summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 60)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
