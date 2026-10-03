import subprocess
import time
import os
import psutil

exe_path = r"d:\PHANTOOM\demo_malware\PHANTOM_ROGUE_MALWARE_DEMO.exe"
print(f"Launching test instance of: {exe_path}")

p = subprocess.Popen([exe_path], creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
pid = p.pid
print(f"Spawned Rogue Malware Demo PID: {pid}")

try:
    proc = psutil.Process(pid)
    for second in range(1, 10):
        time.sleep(1.0)
        if proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE:
            cpu = proc.cpu_percent(interval=None)
            threads = proc.num_threads()
            print(f"[T+{second}s] Rogue Process {pid} ALIVE | CPU: {cpu}% | Threads: {threads}")
        else:
            print(f"[T+{second}s] Rogue Process {pid} HAS BEEN TERMINATED BY PHANTOM!")
            break
except psutil.NoSuchProcess:
    print(f"Process {pid} has been terminated.")

time.sleep(1)
is_alive = psutil.pid_exists(pid)
print(f"Final Status: PID {pid} is_alive = {is_alive}")
if not is_alive:
    print("SUCCESS: PHANTOM autonomously intercepted and killed the rogue high-CPU executable!")
else:
    print("WARNING: Process is still alive, manual kill...")
    try:
        proc.kill()
    except Exception:
        pass
