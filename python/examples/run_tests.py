"""
Run tests and capture output.

This script demonstrates:
- PowerShell session management
- Command execution with timeout
- JSON output parsing
- Screenshot capture
"""

from sidofun_desktop import DesktopWinClient
import json
import sys


def run_tests(project_path: str = None, test_command: str = "npm test"):
    """Run tests and capture output.
    
    Args:
        project_path: Path to project directory (optional)
        test_command: Test command to run (default: npm test)
    """
    print("=== Test Runner ===\n")
    
    with DesktopWinClient() as client:
        # Spawn PowerShell session
        print(" Spawning PowerShell session...")
        ps = client.pwsh_spawn("Test Runner", execution_policy="Bypass")
        print(f"  Session ID: {ps}\n")
        
        # Navigate to project directory if provided
        if project_path:
            print(f" Navigating to: {project_path}")
            client.pwsh_exec(ps, f'cd "{project_path}"', wait=True)
            print()
        
        # Run tests
        print(f" Running: {test_command}")
        print("-" * 50)
        
        result = client.pwsh_exec(
            ps,
            f"{test_command} 2>&1 | Tee-Object -Variable output; $LASTEXITCODE",
            wait=True,
            timeout=120000,  # 2 minute timeout
            output_format="text"
        )
        
        # Display results
        output = result.get("output", "")
        duration = result.get("duration", 0)
        
        print(f"\n⏱️  Duration: {duration}ms")
        print(f"\n📄 Test Output:\n{output}")
        
        # Take screenshot
        print("\n📸 Capturing screenshot...")
        screenshot = client.pwsh_screenshot(ps, filename="test-results.png")
        print(f"  Screenshot saved: {screenshot.get('filepath', 'unknown')}")
        
        # Close session
        client.pwsh_close(ps)
        print("\n✅ Test run completed!")
        
        return {
            "output": output,
            "duration": duration,
            "screenshot": screenshot.get("filepath")
        }


def run_tests_json(project_path: str = None):
    """Run tests and get structured JSON output.
    
    Args:
        project_path: Path to project directory
    """
    print("=== Test Runner (JSON Output) ===\n")
    
    with DesktopWinClient() as client:
        ps = client.pwsh_spawn("Test Runner JSON")
        
        if project_path:
            client.pwsh_exec(ps, f'cd "{project_path}"', wait=True)
        
        # Run tests with JSON output
        result = client.pwsh_exec(
            ps,
            "npm test -- --json 2>&1 | ConvertFrom-Json | ConvertTo-Json -Depth 5",
            wait=True,
            timeout=120000,
            output_format="json"
        )
        
        print("Test Results (JSON):")
        print(json.dumps(result, indent=2, default=str))
        
        client.pwsh_close(ps)
        return result


if __name__ == "__main__":
    # Default values
    default_project = "."
    default_command = "npm test"
    
    # Parse command line arguments
    project = sys.argv[1] if len(sys.argv) > 1 else default_project
    command = sys.argv[2] if len(sys.argv) > 2 else default_command
    
    print("Test Runner for Sidofun Desktop")
    print("=" * 50)
    print()
    
    try:
        run_tests(project, command)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
