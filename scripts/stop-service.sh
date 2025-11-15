#!/bin/bash

# Stop Vysper LaunchAgent service (without uninstalling)

set -e

SERVICE_NAME="com.apple.vysper"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/${SERVICE_NAME}.plist"

echo "⏹️  Stopping Vysper background service..."

# Unload the service if it's running (using modern launchctl commands)
if launchctl list | grep -q "${SERVICE_NAME}"; then
    launchctl bootout "gui/$(id -u)/${SERVICE_NAME}" 2>/dev/null || launchctl unload "$PLIST_FILE" 2>/dev/null || true
    echo "✅ Service stopped successfully!"
    echo ""
    echo "The app is now stopped."
    echo "To start it again: ./scripts/start-service.sh"
    echo "To uninstall completely: ./scripts/uninstall-service.sh"
else
    echo "⚠️  Service is not currently running"
fi

