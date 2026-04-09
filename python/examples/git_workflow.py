"""
Automate Git workflow: status, add, commit, push.

This script demonstrates:
- Sequential command execution
- Command output capture
- Error handling
- Interactive parameters
"""

from sidofun_desktop import DesktopWinClient
import sys


def git_workflow(commit_message: str, push: bool = True):
    """Execute Git workflow: status, add, commit, push.
    
    Args:
        commit_message: Commit message to use
        push: Whether to push after commit (default: True)
    """
    print("=== Git Workflow Automation ===\n")
    
    with DesktopWinClient() as client:
        # Spawn PowerShell session
        ps = client.pwsh_spawn("Git Automation")
        
        # Step 1: Git status
        print("📋 Step 1: Git Status")
        print("-" * 50)
        status_result = client.pwsh_exec(ps, "git status", wait=True)
        print(status_result.get("output", ""))
        print()
        
        # Step 2: Git add
        print("📋 Step 2: Adding Changes")
        print("-" * 50)
        add_result = client.pwsh_exec(ps, "git add .", wait=True)
        print("All changes staged.\n")
        
        # Step 3: Git commit
        print(f"📋 Step 3: Committing: {commit_message}")
        print("-" * 50)
        commit_result = client.pwsh_exec(
            ps,
            f'git commit -m "{commit_message}"',
            wait=True
        )
        commit_output = commit_result.get("output", "")
        
        if "nothing to commit" in commit_output.lower():
            print("⚠️  Nothing to commit, working tree clean.")
            client.pwsh_close(ps)
            return
        
        print(commit_output)
        print()
        
        # Step 4: Git push (optional)
        if push:
            print("📋 Step 4: Pushing to Remote")
            print("-" * 50)
            push_result = client.pwsh_exec(
                ps,
                "git push",
                wait=True,
                timeout=60000  # 1 minute timeout
            )
            print(push_result.get("output", ""))
        else:
            print("⏭️  Skipping push (push=False)")
        
        # Close session
        client.pwsh_close(ps)
        
        print("\n✅ Git workflow completed!")


def git_status_only():
    """Just show git status without making changes."""
    print("=== Git Status ===\n")
    
    with DesktopWinClient() as client:
        ps = client.pwsh_spawn("Git Status")
        
        result = client.pwsh_exec(ps, "git status", wait=True)
        print(result.get("output", ""))
        
        client.pwsh_close(ps)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Git Workflow Automation")
    parser.add_argument(
        "-m", "--message",
        type=str,
        help="Commit message (required)",
        required=True
    )
    parser.add_argument(
        "--no-push",
        action="store_true",
        help="Skip git push"
    )
    parser.add_argument(
        "--status-only",
        action="store_true",
        help="Only show git status"
    )
    
    args = parser.parse_args()
    
    if args.status_only:
        git_status_only()
    else:
        if not args.message:
            print("❌ Error: Commit message required (-m \"message\")")
            sys.exit(1)
        
        try:
            git_workflow(
                commit_message=args.message,
                push=not args.no_push
            )
        except Exception as e:
            print(f"\n❌ Error: {e}")
            sys.exit(1)
