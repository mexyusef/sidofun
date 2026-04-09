"""
Demonstration of Fluent Session API

Shows the new session-based interface where you don't need to
pass session_id repeatedly.
"""

from sidofun_desktop import DesktopWin

print("=== Fluent Session API Demo ===\n")

# ==================== Method 1: cmd_spawn returns session ====================
print("1. Using cmd_spawn() - returns session object:")
session = DesktopWin.cmd_spawn("MyTerminal")

# No need to pass session_id - it's bound to the session object
session.type(r"echo Hello from session API!\n")
session.press("enter")

# Wait and screenshot
result = session.exec("dir", wait=True, timeout=3000)
screenshot = session.screenshot()
print(f"   Screenshot: {screenshot['width']}x{screenshot['height']}\n")

# ==================== Method 2: Using sessions manager ====================
print("2. Using sessions manager:")
session2 = DesktopWin.sessions.spawn("SecondTerminal")
session2.send("echo Using sessions manager")
session2.send("dir")
print(f"   Created: {session2.id}\n")

# ==================== Index-based access ====================
print("3. Access sessions by index (1-based):")
first_session = DesktopWin.sessions[1]  # First session
first_session.send("echo This is session 1")
print(f"   Accessed: {first_session.id}\n")

# ==================== Iterate all sessions ====================
print("4. Iterate over all sessions:")
for i, sess in enumerate(DesktopWin.sessions, 1):
    info = sess.info()
    print(f"   Session {i}: {info['title']} ({sess.id})")
print()

# ==================== Context manager for auto-cleanup ====================
print("5. Use session as context manager (auto-close on exit):")
with DesktopWin.cmd_spawn("TemporaryTerminal") as temp_session:
    temp_session.send("echo This will auto-close")
    temp_session.screenshot()
print("   Session auto-closed\n")

# ==================== Convenience methods ====================
print("6. Convenience methods:")
session3 = DesktopWin.cmd_spawn("DemoTerminal")

# run() = exec with wait=True
session3.run("ping localhost -n 2", timeout=5000)

# send() = type + enter
session3.send("echo Convenience methods work!")

# shell() = alias for exec
session3.shell("whoami")
print()

# ==================== Window control ====================
print("7. Window control on session:")
session4 = DesktopWin.cmd_spawn("WindowControl")

session4.maximize()   # Maximize the window
session4.send("echo Maximized")

session4.minimize()   # Minimize the window
session4.send("echo Minimized (but won't see it)")

session4.restore()    # Restore the window
session4.send("echo Restored")

session4.focus()      # Bring to front
session4.send("echo Focused")
print()

# ==================== Terminal shortcuts ====================
print("8. Terminal shortcuts on session:")
session5 = DesktopWin.cmd_spawn("ShortcutsDemo")

# These work on the session object directly
session5.new_tab()
session5.next_tab()
session5.split_vertical()
session5.pane_right()
print()

# ==================== Key combos ====================
print("9. Key combinations:")
session.key_combo(["control", "shift"], "t")  # New tab
session.key_combo(["alt"], "f4")              # Close (might not work in CMD)
print()

print("=== Demo Complete ===\n")

print("Summary of Session API Benefits:")
print("  - No repetitive session_id parameter")
print("  - Cleaner, more readable code")
print("  - IDE autocomplete support")
print("  - Context manager for auto-cleanup")
print("  - Convenience methods (run, send, shell)")
print("  - Window control methods (maximize, minimize, etc.)")
print("  - Session manager with index access and iteration")
