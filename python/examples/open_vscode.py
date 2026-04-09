"""
Open VS Code and load project.

This script demonstrates:
- Key combination automation (Win+R, Ctrl+K, Ctrl+O)
- Text typing with delays
- Window management
"""

from sidofun_desktop import DesktopWinClient
import time


def open_vscode(project_path: str = "."):
    """Open VS Code and load a project.
    
    Args:
        project_path: Path to the project folder to open
    """
    print(f"Opening VS Code with project: {project_path}")
    
    with DesktopWinClient() as client:
        # Method 1: Using Run dialog (Win+R)
        print("  → Opening Run dialog (Win+R)...")
        client.key_combo(["win"], "r")
        time.sleep(0.5)
        
        # Type "code" and press Enter
        print("  → Typing 'code'...")
        client.type("code\n")
        time.sleep(3)  # Wait for VS Code to launch
        
        # Open folder dialog (Ctrl+K, Ctrl+O)
        print("  → Opening folder dialog...")
        client.key_combo(["ctrl"], "k")
        time.sleep(0.2)
        client.key_combo(["ctrl"], "o")
        time.sleep(0.5)
        
        # Type project path
        print(f"  → Typing project path: {project_path}")
        client.type(f"{project_path}\n")
        time.sleep(1)
        
        print("✅ VS Code opened successfully!")


def open_vscode_direct(project_path: str = "."):
    """Alternative: Open VS Code directly via command.
    
    Args:
        project_path: Path to the project folder
    """
    print(f"Opening VS Code directly: {project_path}")
    
    with DesktopWinClient() as client:
        # Spawn PowerShell
        ps = client.pwsh_spawn("VSCode Launcher")
        
        # Use code command to open VS Code
        print("  → Running 'code' command...")
        result = client.pwsh_exec(
            ps,
            f'code "{project_path}"',
            wait=True,
            timeout=10000
        )
        
        print(f"  → Command completed in {result.get('duration', 0)}ms")
        
        # Close PowerShell session
        client.pwsh_close(ps)
        
        print("✅ VS Code opened successfully!")


if __name__ == "__main__":
    import sys
    
    # Default project path
    default_path = "."
    
    # Use command line argument if provided
    project_path = sys.argv[1] if len(sys.argv) > 1 else default_path
    
    print("=== VS Code Opener ===\n")
    print("Choose method:")
    print("1. Run dialog (Win+R)")
    print("2. Direct command (code)")
    print()
    
    method = input("Enter method (1 or 2): ").strip()
    
    if method == "2":
        open_vscode_direct(project_path)
    else:
        open_vscode(project_path)
    
    print("\n✅ Done!")
