#!/bin/bash
# PHANTOM AUTONOMOUS SENTINEL LIVE VERIFICATION PROBE (Kali Linux)

echo "======================================================================"
echo "     PHANTOM AUTONOMOUS SENTINEL LIVE VERIFICATION PROBE"
echo "                     Kali Linux Edition"
echo "======================================================================"
echo ""
echo "[1] Simulating suspicious script host execution..."
echo "[2] Spawning background evasive bash task (PID will be monitored)..."
echo "[3] If PHANTOM is active, this task will be SURGICALLY KILLED within 1s!"
echo ""

# Spawn a suspicious-looking process that PHANTOM's Process Monitor should detect
# This simulates a USB-launched reverse shell attempt
python3 -c 'import time; print("PHANTOM-TEST: Simulating unauthorized USB execution from /media/usb..."); time.sleep(60)' &
TEST_PID=$!
echo "Spawned test process with PID: $TEST_PID"
echo "Waiting 3 seconds for PHANTOM to detect and neutralize..."
sleep 3

# Check if process was killed
if kill -0 $TEST_PID 2>/dev/null; then
    echo "[RESULT] Process is still running — PHANTOM may not be active."
    kill $TEST_PID 2>/dev/null
else
    echo "[RESULT] Process was TERMINATED by PHANTOM! Autonomous containment verified!"
fi

echo ""
echo "======================================================================"
echo "Check your PHANTOM Dashboard: Neutralizations should now be +1!"
echo "======================================================================"
