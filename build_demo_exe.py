import sys
import os
import shutil
import PyInstaller.__main__

def build():
    print("Starting PyInstaller compilation of PHANTOM_ROGUE_MALWARE_DEMO...")
    src = os.path.abspath(r"d:\PHANTOOM\tools\phantom_rogue_payload.py")
    dist = os.path.abspath(r"d:\PHANTOOM\demo_malware")
    work = os.path.abspath(r"d:\PHANTOOM\demo_malware\build")
    spec = os.path.abspath(r"d:\PHANTOOM\demo_malware")

    os.makedirs(dist, exist_ok=True)
    os.makedirs(work, exist_ok=True)

    args = [
        src,
        '--onefile',
        '--console',
        '--name=PHANTOM_ROGUE_MALWARE_DEMO',
        f'--distpath={dist}',
        f'--workpath={work}',
        f'--specpath={spec}',
        '--noconfirm',
        '--clean'
    ]
    
    print("Running with args:", args)
    PyInstaller.__main__.run(args)

    built_exe = os.path.join(dist, "PHANTOM_ROGUE_MALWARE_DEMO.exe")
    if os.path.exists(built_exe):
        size_mb = os.path.getsize(built_exe) / (1024 * 1024)
        print(f"[SUCCESS] Compiled binary created: {built_exe} ({size_mb:.2f} MB)")
        
        # Also copy to tools directory
        tools_dest = r"d:\PHANTOOM\tools\phantom_rogue_payload.exe"
        shutil.copy2(built_exe, tools_dest)
        print(f"[COPIED] {tools_dest}")

        # Also copy directly to User's Desktop
        desktop_dest = r"C:\Users\Yashwanth H B\Desktop\PHANTOM_ROGUE_MALWARE_DEMO.exe"
        try:
            shutil.copy2(built_exe, desktop_dest)
            print(f"[COPIED TO DESKTOP] {desktop_dest}")
        except Exception as e:
            print(f"[WARNING] Could not copy to desktop: {e}")
    else:
        print("[ERROR] Built executable not found!")

if __name__ == "__main__":
    build()
