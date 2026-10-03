import os
import sys
import psutil

paths = [
    r"C:\Users\Yashwanth H B\Desktop\PHANTOM_ROGUE_MALWARE_DEMO.exe",
    r"d:\PHANTOOM\demo_malware\PHANTOM_ROGUE_MALWARE_DEMO.exe",
    r"d:\PHANTOOM\tools\phantom_rogue_payload.exe"
]

print("=== CHECKING COMPILED BINARIES ===")
for p in paths:
    if os.path.exists(p):
        size = os.path.getsize(p) / (1024 * 1024)
        print(f"[FOUND] {p} ({size:.2f} MB)")
    else:
        print(f"[MISSING] {p}")
