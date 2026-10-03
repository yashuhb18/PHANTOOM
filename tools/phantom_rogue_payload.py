"""
PHANTOM Rogue Test Payload v1.0
===============================
Simulates a rogue cryptominer / high-CPU malware payload with UDP exfiltration.
Spikes CPU utilization across multiple cores so PHANTOM's Hunter-Killer agent
can detect abnormal processor load, correlate with process attribution, and
surgically kill the rogue process tree.
"""

import os
import sys
import time
import socket
import hashlib
import threading

RUNNING = True

def cpu_stress_worker(worker_id):
    """Generates intensive multi-core CPU load via cryptographic hashing."""
    hasher = hashlib.sha256()
    data = os.urandom(1024)
    while RUNNING:
        data = hashlib.sha256(data).digest()

def udp_beacon_worker():
    """Generates anomalous outbound UDP exfiltration beacons."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    payload = b"PHANTOM_ROGUE_EXFILTRATION_BURST_METRIC_DATA_0xDEADBEEF"
    target = ("127.0.0.1", 5353)
    while RUNNING:
        try:
            sock.sendto(payload, target)
        except Exception:
            pass
        time.sleep(0.4)

def main():
    pid = os.getpid()
    print("=" * 68)
    print(f" [!] PHANTOM ROGUE TEST PAYLOAD ONLINE")
    print(f" [+] PID: {pid}")
    print(f" [+] Executable: {sys.executable}")
    print(f" [+] Spawning CPU stress threads across all processor cores...")
    print(f" [+] Emitting UDP exfiltration beacons to port 5353...")
    print("=" * 68)

    # Multi-threaded CPU burn across all cores
    num_threads = max(2, os.cpu_count() or 4)
    threads = []
    for i in range(num_threads):
        t = threading.Thread(target=cpu_stress_worker, args=(i,), daemon=True)
        t.start()
        threads.append(t)

    # UDP beacon thread
    net_t = threading.Thread(target=udp_beacon_worker, daemon=True)
    net_t.start()

    print("[*] Multi-core stress active. Generating 70-95% CPU load.")
    print("[*] Awaiting PHANTOM autonomous detection and hunter-killer termination...")

    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
