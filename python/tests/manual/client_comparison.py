"""
Comparison: DesktopWinClient vs DesktopWin Singleton

Shows the difference between the two approaches and when to use each.
"""

import time
from sidofun_desktop import DesktopWinClient, DesktopWin

print("=== Approach Comparison ===\n")

# ==================== Approach 1: DesktopWinClient (Context Manager) ====================
print("Approach 1: DesktopWinClient (Context Manager)")
print("-" * 50)
print("Use when: You want explicit lifecycle management")
print("         or need isolated operations")
print()

print("Example:")
print("  with DesktopWinClient() as client:")
print("      client.screenshot()")
print("      session = client.cmd_spawn('MyTerminal')")
print("      client.cmd_type(session, 'echo hello\\n')")
print("  # Process automatically stops when exiting 'with' block")
print()

# Demonstrate
start = time.time()
with DesktopWinClient() as client:
    client.screenshot()
    elapsed = time.time() - start
    print(f"  Execution time: {elapsed:.2f}s")
    print("  Note: First call has startup overhead (~100-300ms)")
print()


# ==================== Approach 2: DesktopWin (Singleton) ====================
print("\nApproach 2: DesktopWin (Singleton)")
print("-" * 50)
print("Use when: You make many calls throughout your application")
print("         or need shared CMD sessions")
print()

print("Example:")
print("  # First call starts the process")
print("  DesktopWin.screenshot()")
print("  session = DesktopWin.cmd_spawn('MyTerminal')")
print()
print("  # Subsequent calls reuse the running process")
print("  DesktopWin.cmd_type(session, 'echo hello\\n')")
print("  DesktopWin.cmd_new_tab(session)")
print()
print("  # Optional explicit cleanup (or auto-cleanup on exit)")
print("  DesktopWin.stop()")
print()

# Demonstrate
start = time.time()
DesktopWin.screenshot()
elapsed = time.time() - start
print(f"  First call time: {elapsed:.2f}s (includes startup)")

start = time.time()
DesktopWin.screenshot()
elapsed = time.time() - start
print(f"  Second call time: {elapsed:.2f}s (reuses process)")

# Cleanup
DesktopWin.stop()
print()


# ==================== Comparison Table ====================
print("\n" + "=" * 50)
print("Comparison Summary")
print("=" * 50)
print()
print(f"{'Feature':<30} {'DesktopWinClient':<20} {'DesktopWin':<15}")
print("-" * 65)
print(f"{'Startup overhead':<30} {'Every instance':<20} {'First call only':<15}")
print(f"{'Best for':<30} {'One-off scripts':<20} {'Long-running apps':<15}")
print(f"{'State persistence':<30} {'No':<20} {'Yes':<15}")
print(f"{'Thread-safe':<30} {'N/A (one thread)':<20} {'Yes (locked)':<15}")
print(f"{'Manual cleanup':<30} {'No (auto)':<20} {'Optional':<15}")
print(f"{'Context manager':<30} {'Yes':<20} {'Yes':<15}")
print(f"{'Import syntax':<30} {'from sidofun_desktop import DesktopWinClient':<20} {'from sidofun_desktop import DesktopWin':<15}")
print()


# ==================== Usage Recommendations ====================
print("\n" + "=" * 50)
print("When to Use Each")
print("=" * 50)
print()
print("Use DesktopWinClient when:")
print("  - Writing simple one-off scripts")
print("  - You want explicit lifecycle control")
print("  - Each operation should be isolated")
print("  - You prefer the 'with' statement pattern")
print()
print("Use DesktopWin singleton when:")
print("  - Building long-running applications")
print("  - Making many calls throughout your program")
print("  - Need CMD sessions to persist")
print("  - Using multiple modules that share the client")
print("  - Working in a multi-threaded environment")
print()


# ==================== Advanced: Mixing Both ====================
print("\n" + "=" * 50)
print("Advanced: You Can Mix Both Approaches")
print("=" * 50)
print()
print("Example - Use singleton for main app, client for isolated tasks:")
print()
print("  # Main application uses singleton")
print("  DesktopWin.screenshot()")
print("  session = DesktopWin.cmd_spawn('Main')")
print()
print("  # Isolated one-off task uses its own client")
print("  with DesktopWinClient() as isolated:")
print("      isolated.click(500, 500)  # Different process")
print()
print("  # Back to singleton")
print("  DesktopWin.cmd_type(session, 'echo hello\\n')")
print()
