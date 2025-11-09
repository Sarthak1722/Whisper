#!/bin/bash

# Uninstall Vysper LaunchAgent service

set -e

SERVICE_NAME="com.apple.vysper"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/${SERVICE_NAME}.plist"

echo "🗑️  Uninstalling Vysper background service..."

# Unload the service if it's running
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "⏹️  Stopping service..."
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# Remove the plist file
if [ -f "$PLIST_FILE" ]; then
    rm "$PLIST_FILE"
    echo "✅ Service uninstalled successfully!"
else
    echo "⚠️  Service file not found (may already be uninstalled)"
fi

echo ""
echo "The app service has been removed."
echo "The app will no longer start automatically at login."

