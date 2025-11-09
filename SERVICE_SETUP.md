# Running Vysper as a macOS Background Service

This guide explains how to run Vysper as a hidden background service on macOS.

## ⚠️ Important Security Notes

**Complete invisibility from Activity Monitor is extremely difficult** without:
- Root access (LaunchDaemon)
- Kernel-level modifications (very advanced, risky)
- Process name spoofing (limited effectiveness)

However, this setup provides **maximum stealth** using legitimate macOS features:
- ✅ Runs as background service (no Dock icon)
- ✅ Disguised process name ("Terminal")
- ✅ Auto-starts at login
- ✅ Auto-restarts if crashed
- ✅ Hidden from most casual inspections

## Installation

### Option 1: Using the Install Script (Recommended)

```bash
# Make scripts executable
chmod +x scripts/install-service.sh
chmod +x scripts/uninstall-service.sh

# Install the service
./scripts/install-service.sh
```

### Option 2: Manual Installation

1. **Create the LaunchAgent plist:**

```bash
mkdir -p ~/Library/LaunchAgents
```

2. **Create `~/Library/LaunchAgents/com.apple.vysper.plist`:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.apple.vysper</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/your/project/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron</string>
        <string>/path/to/your/project</string>
        <string>--no-sandbox</string>
        <string>--background</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>StandardOutPath</key>
    <string>/path/to/your/project/output.log</string>
    
    <key>StandardErrorPath</key>
    <string>/path/to/your/project/error.log</string>
    
    <key>WorkingDirectory</key>
    <string>/path/to/your/project</string>
</dict>
</plist>
```

3. **Load the service:**

```bash
launchctl load ~/Library/LaunchAgents/com.apple.vysper.plist
```

## Service Management

### Check Status
```bash
launchctl list | grep com.apple.vysper
```

### Stop Service
```bash
launchctl unload ~/Library/LaunchAgents/com.apple.vysper.plist
```

### Start Service
```bash
launchctl load ~/Library/LaunchAgents/com.apple.vysper.plist
```

### Restart Service
```bash
launchctl unload ~/Library/LaunchAgents/com.apple.vysper.plist
launchctl load ~/Library/LaunchAgents/com.apple.vysper.plist
```

### Uninstall Service
```bash
./scripts/uninstall-service.sh
# OR manually:
launchctl unload ~/Library/LaunchAgents/com.apple.vysper.plist
rm ~/Library/LaunchAgents/com.apple.vysper.plist
```

## Stealth Features

The app includes several stealth features:

1. **Process Name Disguise**: Appears as "Terminal" in process lists
2. **Dock Hiding**: No Dock icon when running
3. **Background Mode**: Runs as background process
4. **Window Stealth**: Windows are hidden from screen capture
5. **Auto-Restart**: Automatically restarts if killed

## Limitations

**Activity Monitor Detection:**
- The process WILL appear in Activity Monitor
- However, it will be named "Terminal" or "Electron" (disguised)
- Advanced users can still find it by:
  - Checking CPU/Memory usage
  - Looking at network connections
  - Examining process arguments

**Complete Hiding:**
- Requires root access (LaunchDaemon)
- May violate macOS security policies
- Could trigger security warnings
- Not recommended for production use

## Advanced: System-Wide Service (Requires Root)

For system-wide installation (all users), use LaunchDaemon:

```bash
sudo cp com.apple.vysper.plist /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.apple.vysper.plist
```

⚠️ **Warning**: This requires root access and may trigger security warnings.

## Troubleshooting

### Service Won't Start
- Check logs: `tail -f output.log error.log`
- Verify paths in plist are correct
- Check permissions: `ls -la ~/Library/LaunchAgents/`

### Service Keeps Crashing
- Check error logs
- Verify all dependencies are installed
- Ensure API keys are set in `.env`

### Process Still Visible
- This is expected - complete hiding requires kernel-level access
- The process name is disguised as "Terminal"
- Advanced detection methods will still find it

## Security Considerations

1. **File Permissions**: Ensure plist file is readable only by you
   ```bash
   chmod 600 ~/Library/LaunchAgents/com.apple.vysper.plist
   ```

2. **Log Files**: Consider disabling or securing log files
   ```bash
   chmod 600 output.log error.log
   ```

3. **Environment Variables**: Don't store sensitive data in plist files

## Best Practices

1. Use LaunchAgent (user-level) instead of LaunchDaemon (system-level)
2. Keep logs minimal and secure
3. Use environment variables for sensitive data
4. Regularly check service status
5. Monitor resource usage

## Legal & Ethical Considerations

⚠️ **Important**: 
- Only use this on systems you own or have explicit permission to modify
- Be aware of local laws regarding system monitoring
- Consider privacy implications
- Use responsibly and ethically

