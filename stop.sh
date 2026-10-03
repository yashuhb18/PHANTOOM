#!/bin/bash
# PHANTOM: Autonomous USB Threat Hunting Platform — Stopper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/phantom_ctl.sh" stop
