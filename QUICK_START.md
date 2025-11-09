# Quick Start Guide

## 🚀 Running the App

### Option 1: Run as Background Service (Recommended)

This runs the app as a hidden background service that starts automatically at login.

```bash
# Install the service
./scripts/install-service.sh

# The app will start automatically!
```

**Verify it's running:**
```bash
# Check service status
launchctl list | grep com.apple.vysper

# View logs
tail -f output.log
```

### Option 2: Run Manually (Development/Testing)

```bash
# Start the app normally
npm start
```

## 🎯 Using the App

Once the app is running (as service or manually):

### Keyboard Shortcuts

- **`⌘ + Shift + S`** - Take screenshot and extract text → Send to Gemini
- **`⌘ + X`** - Toggle show/hide the answer window (and top bar)
- **`⌘ + ,`** - Open settings
- **`Alt + R`** - Toggle speech recognition
- **`⌘ + Shift + V`** - Toggle all windows visibility

### Workflow

1. **Take Screenshot**: Press `⌘ + Shift + S`
   - App captures screen
   - Shows OCR preview with extracted text
   - Sends to Gemini 2.5 Pro
   - Displays answer in overlay window

2. **View Answer**: Press `⌘ + X` to show/hide the answer window

3. **Hide Everything**: Press `⌘ + X` again to hide

## 📊 Service Management

### Check Status
```bash
launchctl list | grep com.apple.vysper
```

### View Logs
```bash
# Real-time logs
tail -f output.log

# Error logs
tail -f error.log
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
```

## ⚙️ Configuration

### Set API Keys

Create a `.env` file in the project root:

```bash
# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Azure Speech (Optional - for voice features)
AZURE_SPEECH_KEY=your_azure_key_here
AZURE_SPEECH_REGION=your_azure_region_here
```

### Settings

Press `⌘ + ,` to open settings and configure:
- **Coding Language**: Set to C++ (or your preferred language)
- **Active Skill**: Choose DSA, Programming, System Design, etc.
- **API Keys**: Enter your Gemini API key

## 🔍 Troubleshooting

### Service Won't Start

1. **Check logs:**
   ```bash
   tail -f output.log error.log
   ```

2. **Verify Electron is installed:**
   ```bash
   npm install
   ```

3. **Check plist file:**
   ```bash
   cat ~/Library/LaunchAgents/com.apple.vysper.plist
   ```

4. **Verify paths are correct** in the plist file

### App Not Responding to Shortcuts

1. **Check if app is running:**
   ```bash
   launchctl list | grep com.apple.vysper
   ```

2. **Restart the service:**
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.apple.vysper.plist
   launchctl load ~/Library/LaunchAgents/com.apple.vysper.plist
   ```

3. **Check for permission issues** - macOS may require accessibility permissions

### No Response from Gemini

1. **Check API key** in settings (`⌘ + ,`)
2. **Check logs** for API errors:
   ```bash
   tail -f output.log | grep -i "gemini\|llm\|api"
   ```
3. **Verify internet connection**

### Windows Not Showing

1. **Press `⌘ + X`** to toggle visibility
2. **Check if windows are hidden:**
   ```bash
   # The app should be running but windows may be hidden
   ```
3. **Restart the service** if needed

## 🎓 Example Usage

1. **Open a DSA problem** on your screen
2. **Press `⌘ + Shift + S`** - Screenshot is taken
3. **Wait for OCR** - You'll see the extracted text preview
4. **Wait for Gemini** - Answer appears in overlay (about 20 seconds)
5. **Press `⌘ + X`** to show/hide the answer window
6. **Read the solution** - It will be in C++ (or your configured language)

## 📝 Notes

- The app runs in the background - you won't see it in Dock
- Process appears as "Terminal" in Activity Monitor
- Windows are hidden from screen capture
- Auto-restarts if it crashes
- Starts automatically at login (when installed as service)

## 🆘 Need Help?

- Check `SERVICE_SETUP.md` for detailed service setup
- Check `output.log` and `error.log` for errors
- Verify API keys are set correctly
- Make sure all dependencies are installed: `npm install`

