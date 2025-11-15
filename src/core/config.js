const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.appDataDir = path.join(os.homedir(), '.Vysper');
    this.loadConfiguration();
  }

  loadConfiguration() {
    this.config = {
      app: {
        name: 'Vysper',
        version: '1.0.0',
        processTitle: 'Vysper',
        dataDir: this.appDataDir,
        isDevelopment: this.env === 'development',
        isProduction: this.env === 'production'
      },
      
      window: {
        defaultWidth: 400,
        defaultHeight: 600,
        minWidth: 300,
        minHeight: 400,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, '../../preload.js')
        }
      },

      ocr: {
        language: 'eng',
        tempDir: os.tmpdir(),
        cleanupDelay: 5000
      },

      llm: {
        gemini: {
          model: 'gemini-2.5-pro',
          apiVersion: 'v1beta',
          maxRetries: 5, // Increased from 3 to 5 for better reliability
          timeout: 60000, // Increased from 45s to 60s for complex requests with gemini-2.5-pro
          fallbackEnabled: true,
          enableFallbackMethod: true
        }
      },

      speech: {
        azure: {
          language: 'en-US',
          enableDictation: true,
          enableAudioLogging: false,
          outputFormat: 'detailed'
        }
      },

      session: {
        maxMemorySize: 1000,
        compressionThreshold: 500,
        clearOnRestart: false
      },

      stealth: {
        hideFromDock: true,
        noAttachConsole: true,
        disguiseProcess: true
      }
    };
  }

  get(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  set(keyPath, value) {
    const keys = keyPath.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this.config);
    target[lastKey] = value;
  }

  getApiKey(service) {
    const envKey = `${service.toUpperCase()}_API_KEY`;
    const apiKeyValue = process.env[envKey];
    
    if (!apiKeyValue) {
      return null;
    }
    
    // If comma-separated, return the first one for backward compatibility
    const keys = this.getApiKeys(service);
    return keys.length > 0 ? keys[0] : null;
  }

  getApiKeys(service) {
    const envKey = `${service.toUpperCase()}_API_KEY`;
    const apiKeyValue = process.env[envKey];
    
    if (!apiKeyValue) {
      return [];
    }
    
    // Support multiple formats:
    // 1. Comma-separated: GEMINI_API_KEY=key1,key2,key3
    // 2. Newline-separated: GEMINI_API_KEY=key1\nkey2\nkey3
    // 3. Single key: GEMINI_API_KEY=key1
    
    const keys = apiKeyValue
      .split(/[,\n]/) // Split by comma or newline
      .map(key => key.trim()) // Trim whitespace
      .filter(key => key.length > 0 && key !== 'your-api-key-here'); // Remove empty and placeholder values
    
    return keys;
  }

  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`) !== false;
  }
}

module.exports = new ConfigManager(); 