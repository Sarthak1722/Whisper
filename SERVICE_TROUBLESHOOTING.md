# Service Troubleshooting Guide

## Issue: GUI Window Not Opening When Running as Service

### Root Cause
The plist file had two problematic settings:
1. `--background` flag - This causes the app to hide windows initially
2. `ProcessType: Background` - This prevents GUI access on macOS

### Fix Applied
✅ Updated `install-service.sh` to:
- Remove `--background` flag from ProgramArguments
- Remove `ProcessType: Background` 
- Ensure `LimitLoadToSessionType: Aqua` is set (for GUI access)

### Current Status
The plist file has been regenerated correctly. The service shows "spawn scheduled" which means launchd is trying to start it.

### If Windows Still Don't Appear

#### 1. Check Service Status
```bash
./scripts/check-service.sh
```

#### 2. Manually Start the Service
```bash
./scripts/start-service.sh
```

Or manually:
```bash
launchctl kickstart "gui/$(id -u)/com.apple.vysper"
```

#### 3. Check macOS Permissions
GUI apps launched via LaunchAgent may need Accessibility permissions:

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** > **Accessibility**
3. Make sure **Electron** or **Terminal** has accessibility access
4. If not listed, you may need to add it manually

#### 4. Check Logs
```bash
# Check error log
tail -f error.log

# Check output log  
tail -f output.log
```

#### 5. Verify App Works Manually
```bash
npm start
```
If this works but the service doesn't, it's likely a permissions issue.

#### 6. Restart the Service
```bash
./scripts/stop-service.sh
./scripts/start-service.sh
```

#### 7. Check if Process is Running
```bash
ps aux | grep -i electron | grep -i whisper
```

### Common Issues

**Service shows "spawn scheduled" but doesn't start:**
- Check macOS Accessibility permissions
- Try manually starting: `launchctl kickstart "gui/$(id -u)/com.apple.vysper"`
- Check error.log for startup errors

**Windows are hidden:**
- The app might be in background mode. Try the toggle shortcut: `Cmd+Shift+V`
- Check if `--background` flag is in the plist (it shouldn't be)

**Service crashes immediately:**
- Check error.log for crash details
- Verify Electron path is correct in plist
- Make sure all dependencies are installed (`npm install`)

### Verification Commands

```bash
# Check plist contents
cat ~/Library/LaunchAgents/com.apple.vysper.plist

# Check service status
launchctl print "gui/$(id -u)/com.apple.vysper"

# Check if process is running
ps aux | grep -i "electron.*whisper"

# View recent logs
tail -20 output.log
tail -20 error.log
```

