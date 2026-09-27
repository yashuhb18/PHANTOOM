import os
import sys
import time
import threading
import urllib.request
import webbrowser
import subprocess
from pathlib import Path

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

def run_backend():
    import uvicorn
    from backend.main import app
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

def wait_for_backend(url="http://127.0.0.1:8001/health", timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False

def open_native_window(app_url="http://127.0.0.1:8001"):
    # 1. Try pywebview if installed
    try:
        import webview
        webview.create_window(
            title="PHANTOM: Autonomous USB Threat Hunting Platform",
            url=app_url,
            width=1440,
            height=900,
            min_size=(1024, 700),
            text_select=True,
            zoomable=True
        )
        webview.start()
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"pywebview failed: {e}, falling back to Edge App mode.")

    # 2. Try Linux browsers in App Mode (Chromeless window)
    if sys.platform.startswith("linux"):
        linux_browsers = [
            "chromium-browser",
            "chromium",
            "google-chrome",
            "google-chrome-stable",
            "brave-browser",
            "firefox",
        ]
        for browser_cmd in linux_browsers:
            try:
                import shutil
                if shutil.which(browser_cmd):
                    if "firefox" in browser_cmd:
                        cmd = [browser_cmd, "--new-window", app_url]
                    else:
                        cmd = [browser_cmd, f"--app={app_url}", "--window-size=1440,900"]
                    proc = subprocess.Popen(cmd)
                    proc.wait()
                    return True
            except Exception:
                continue

    # 3. Try Microsoft Edge in App Mode (Chromeless native window on Windows)
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "msedge.exe"
    ]
    for edge_exe in edge_paths:
        try:
            cmd = [edge_exe, f"--app={app_url}", "--window-size=1440,900"]
            proc = subprocess.Popen(cmd)
            proc.wait()
            return True
        except FileNotFoundError:
            continue
        except Exception:
            pass

    # 3. Fallback: Default system browser
    webbrowser.open(app_url)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    return True

def main():
    print("=" * 60)
    print("   PHANTOM: Autonomous USB Threat Hunting Platform")
    print("=" * 60)
    print("Initializing embedded backend engine...")

    # Start FastAPI backend in background daemon thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()

    # Wait for backend readiness
    if wait_for_backend():
        print("Backend ready. Launching native desktop application window...")
        open_native_window("http://127.0.0.1:8001")
    else:
        print("Error: Backend failed to start.")

if __name__ == "__main__":
    main()
