"""
Gather system information.

This script demonstrates:
- Multiple PowerShell commands
- JSON output parsing
- System metrics collection
- Formatted reporting
"""

from sidofun_desktop import DesktopWinClient
import json
from datetime import datetime


def get_system_info():
    """Gather comprehensive system information."""
    print("=== System Information ===\n")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    with DesktopWinClient() as client:
        # Spawn PowerShell session
        ps = client.pwsh_spawn("System Info")
        
        # CPU Usage
        print("📊 Collecting CPU usage...")
        cpu_result = client.pwsh_exec(
            ps,
            """
            Get-Counter '\\Processor(_Total)\\% Processor Time' | 
            Select-Object -ExpandProperty CounterSamples | 
            Select-Object CookedValue | 
            ConvertTo-Json
            """,
            wait=True,
            output_format="json"
        )
        cpu_usage = cpu_result.get("CookedValue", 0) if isinstance(cpu_result, dict) else 0
        
        # Memory Usage
        print("💾 Collecting memory usage...")
        memory_result = client.pwsh_exec(
            ps,
            """
            Get-CimInstance Win32_OperatingSystem | 
            Select-Object TotalVisibleMemorySize, FreePhysicalMemory | 
            ConvertTo-Json
            """,
            wait=True,
            output_format="json"
        )
        total_mem = memory_result.get("TotalVisibleMemorySize", 0)
        free_mem = memory_result.get("FreePhysicalMemory", 0)
        mem_usage = ((total_mem - free_mem) / total_mem * 100) if total_mem > 0 else 0
        
        # Disk Space
        print("💿 Collecting disk space...")
        disk_result = client.pwsh_exec(
            ps,
            """
            Get-Volume | 
            Where-Object {$_.DriveType -eq 'Fixed'} | 
            Select-Object DriveLetter, SizeRemaining, Size | 
            ConvertTo-Json
            """,
            wait=True,
            output_format="json"
        )
        
        # Top Processes by CPU
        print("🔄 Collecting top processes...")
        processes_result = client.pwsh_exec(
            ps,
            """
            Get-Process | 
            Sort-Object CPU -Descending | 
            Select-Object -First 10 Name, CPU, WorkingSet, Id | 
            ConvertTo-Json
            """,
            wait=True,
            output_format="json"
        )
        
        # Close session
        client.pwsh_close(ps)
        
        # Display results
        print("\n" + "=" * 60)
        print("SYSTEM HEALTH REPORT")
        print("=" * 60)
        
        # CPU
        cpu_status = "⚠️ HIGH" if cpu_usage > 80 else "✅ Normal"
        print(f"\n📊 CPU Usage: {cpu_usage:.1f}% {cpu_status}")
        
        # Memory
        mem_status = "⚠️ HIGH" if mem_usage > 80 else "✅ Normal"
        print(f"💾 Memory Usage: {mem_usage:.1f}% {mem_status}")
        print(f"   Total: {total_mem / 1024 / 1024:.2f} GB")
        print(f"   Free: {free_mem / 1024 / 1024:.2f} GB")
        
        # Disk
        print(f"\n💿 Disk Volumes:")
        if isinstance(disk_result, list):
            for disk in disk_result[:5]:  # Show first 5 volumes
                drive = disk.get("DriveLetter", "Unknown")
                size = disk.get("Size", 0) / 1024 / 1024 / 1024  # GB
                remaining = disk.get("SizeRemaining", 0) / 1024 / 1024 / 1024
                usage = ((size - remaining) / size * 100) if size > 0 else 0
                status = "⚠️" if usage > 90 else "✅"
                print(f"   {drive}: {remaining:.1f}GB / {size:.1f}GB ({usage:.1f}%) {status}")
        
        # Top Processes
        print(f"\n🔄 Top 5 Processes by CPU:")
        if isinstance(processes_result, list):
            for i, proc in enumerate(processes_result[:5], 1):
                name = proc.get("Name", "Unknown")
                cpu = proc.get("CPU", 0)
                mem_kb = proc.get("WorkingSet", 0)
                mem_mb = mem_kb / 1024 / 1024
                print(f"   {i}. {name}: CPU={cpu:.1f}s, Memory={mem_mb:.1f}MB")
        
        # Summary
        print("\n" + "=" * 60)
        issues = []
        if cpu_usage > 80:
            issues.append("High CPU usage")
        if mem_usage > 80:
            issues.append("High memory usage")
        
        if issues:
            print("⚠️  ISSUES DETECTED:")
            for issue in issues:
                print(f"   • {issue}")
            print("\n💡 Recommendations:")
            if cpu_usage > 80:
                print("   • Check for runaway processes")
                print("   • Consider closing unnecessary applications")
            if mem_usage > 80:
                print("   • Close unused browser tabs")
                print("   • Restart memory-intensive applications")
        else:
            print("✅ System health looks good!")
        
        print("=" * 60)
        
        return {
            "cpu_usage": cpu_usage,
            "memory_usage": mem_usage,
            "memory_total_gb": total_mem / 1024 / 1024,
            "memory_free_gb": free_mem / 1024 / 1024,
            "disk_info": disk_result,
            "processes": processes_result
        }


if __name__ == "__main__":
    try:
        get_system_info()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
