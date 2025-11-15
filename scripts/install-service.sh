#!/bin/bash

# Install Vysper as a macOS LaunchAgent (background service)
# This script installs the app to run automatically at login

set -e

APP_NAME="Vysper"
SERVICE_NAME="com.apple.vysper"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/${SERVICE_NAME}.plist"
APP_PATH="$PROJECT_DIR"

echo "🔧 Installing $APP_NAME as a background service..."

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Find Electron executable
ELECTRON_PATH=""
if [ -f "$APP_PATH/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
    ELECTRON_PATH="$APP_PATH/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
elif command -v electron &> /dev/null; then
    ELECTRON_PATH=$(which electron)
else
    echo "❌ Error: Electron not found!"
    echo "Please run 'npm install' first."
    exit 1
fi

echo "📦 Using Electron at: $ELECTRON_PATH"

# Create the plist file
# NOTE: We do NOT add --background flag so windows will be visible
cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${ELECTRON_PATH}</string>
        <string>${APP_PATH}</string>
        <string>--no-sandbox</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>LimitLoadToSessionType</key>
    <string>Aqua</string>
    
    <key>StandardOutPath</key>
    <string>${APP_PATH}/output.log</string>
    
    <key>StandardErrorPath</key>
    <string>${APP_PATH}/error.log</string>
    
    <key>WorkingDirectory</key>
    <string>${APP_PATH}</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>Nice</key>
    <integer>1</integer>
</dict>
</plist>
EOF

# Unload existing service if it exists (try multiple methods for compatibility)
echo "🔄 Checking for existing service..."
if launchctl print "gui/$(id -u)/${SERVICE_NAME}" &>/dev/null; then
    echo "   Stopping existing service..."
    launchctl bootout "gui/$(id -u)/${SERVICE_NAME}" 2>/dev/null || true
    sleep 1
fi

# Also try legacy unload method
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "   Stopping service (legacy method)..."
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    sleep 1
fi

echo "📦 Loading service..."
# Use bootstrap for modern macOS (10.11+), fallback to load for older systems
if launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE" 2>&1; then
    echo "   Service loaded successfully with bootstrap"
else
    echo "   Bootstrap failed, trying legacy load method..."
    launchctl load "$PLIST_FILE" 2>&1 || {
        echo "❌ Failed to load service"
        echo "   Check error.log and output.log for details"
        exit 1
    }
fi

# Wait a moment for service to start
sleep 2

# Verify service is running
if launchctl print "gui/$(id -u)/${SERVICE_NAME}" &>/dev/null || launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "✅ Service is running"
else
    echo "⚠️  Warning: Service may not have started properly"
    echo "   Check logs: tail -f ${APP_PATH}/error.log"
fi

echo "✅ Service installed successfully!"
echo ""
echo "The app will now:"
echo "  • Start automatically at login"
echo "  • Restart automatically if it crashes"
echo "  • Run in the background"
echo ""
echo "To check status: launchctl list | grep ${SERVICE_NAME}"
echo "To stop: launchctl unload $PLIST_FILE"
echo "To start: launchctl load $PLIST_FILE"
echo "To uninstall: ./scripts/uninstall-service.sh"

