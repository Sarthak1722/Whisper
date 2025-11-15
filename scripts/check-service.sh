#!/bin/bash

# Diagnostic script to check Vysper service status

SERVICE_NAME="com.apple.vysper"
PLIST_FILE="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔍 Vysper Service Diagnostic"
echo "=============================="
echo ""

# Check if plist exists
if [ -f "$PLIST_FILE" ]; then
    echo "✅ Plist file exists: $PLIST_FILE"
    echo ""
    echo "Plist contents:"
    cat "$PLIST_FILE"
    echo ""
    echo ""
    
    # Check for problematic flags
    if grep -q "--background" "$PLIST_FILE"; then
        echo "⚠️  WARNING: Plist contains --background flag (this hides windows!)"
    fi
    
    if grep -q "ProcessType.*Background" "$PLIST_FILE"; then
        echo "⚠️  WARNING: Plist has ProcessType: Background (this prevents GUI access!)"
    fi
else
    echo "❌ Plist file not found: $PLIST_FILE"
fi

echo ""
echo "Service Status:"
echo "---------------"

# Check service status
if launchctl print "gui/$(id -u)/${SERVICE_NAME}" &>/dev/null; then
    echo "✅ Service is loaded (modern method)"
    launchctl print "gui/$(id -u)/${SERVICE_NAME}" | head -30
elif launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "✅ Service is loaded (legacy method)"
    launchctl list | grep "${SERVICE_NAME}"
else
    echo "❌ Service is NOT loaded"
fi

echo ""
echo "Recent Logs:"
echo "-----------"
if [ -f "$PROJECT_DIR/error.log" ]; then
    echo "Last 10 lines of error.log:"
    tail -10 "$PROJECT_DIR/error.log"
else
    echo "No error.log found"
fi

echo ""
if [ -f "$PROJECT_DIR/output.log" ]; then
    echo "Last 10 lines of output.log:"
    tail -10 "$PROJECT_DIR/output.log"
else
    echo "No output.log found"
fi

echo ""
echo "Process Check:"
echo "-------------"
if pgrep -f "Electron.*Vysper\|Electron.*Whisper" > /dev/null; then
    echo "✅ Electron process is running:"
    ps aux | grep -i "electron.*$(basename "$PROJECT_DIR")" | grep -v grep
else
    echo "❌ No Electron process found for this app"
fi

echo ""
echo "macOS Permissions:"
echo "-----------------"
echo "Note: GUI apps launched via LaunchAgent may need Accessibility permissions"
echo "Check: System Settings > Privacy & Security > Accessibility"
echo "Make sure Electron or Terminal has accessibility access"

