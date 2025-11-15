#!/bin/bash

# Start Vysper LaunchAgent service

set -e

SERVICE_NAME="com.apple.vysper"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/${SERVICE_NAME}.plist"

echo "▶️  Starting Vysper background service..."

# Check if plist exists
if [ ! -f "$PLIST_FILE" ]; then
    echo "❌ Service not installed!"
    echo "Please run ./scripts/install-service.sh first"
    exit 1
fi

# Load the service (using modern launchctl commands)
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "⚠️  Service is already running"
else
    launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || launchctl load "$PLIST_FILE"
    echo "✅ Service started successfully!"
    echo ""
    echo "The app is now running in the background."
    echo "To check status: launchctl list | grep ${SERVICE_NAME}"
    echo "To view logs: tail -f output.log"
fi

