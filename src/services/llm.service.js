const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../core/logger').createServiceLogger('LLM');
const config = require('../core/config');
const { promptLoader } = require('../../prompt-loader');

class LLMService {
  constructor() {
    this.client = null;
    this.model = null;
    this.isInitialized = false;
    this.requestCount = 0;
    this.errorCount = 0;
    
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = config.getApiKey('GEMINI');
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      logger.warn('Gemini API key not configured', { 
        keyExists: !!apiKey,
        isPlaceholder: apiKey === 'your-api-key-here'
      });
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ 
        model: config.get('llm.gemini.model') 
      });
      this.isInitialized = true;
      
      logger.info('Gemini AI client initialized successfully', {
        model: config.get('llm.gemini.model')
      });
    } catch (error) {
      logger.error('Failed to initialize Gemini client', { 
        error: error.message 
      });
    }
  }

  async processTextWithSkill(text, activeSkill, sessionMemory = [], programmingLanguage = null) {
    if (!this.isInitialized) {
      throw new Error('LLM service not initialized. Check Gemini API key configuration.');
    }

    const startTime = Date.now();
    this.requestCount++;
    
    try {
      logger.info('Processing text with LLM', {
        activeSkill,
        textLength: text.length,
        hasSessionMemory: sessionMemory.length > 0,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      const geminiRequest = this.buildGeminiRequest(text, activeSkill, sessionMemory, programmingLanguage);
      
      // Try standard method first
      let response;
      let usedAlternativeMethod = false;
      try {
        response = await this.executeRequest(geminiRequest);
      } catch (error) {
        // If fetch failed, try alternative method
        if (error.message.includes('fetch failed') && config.get('llm.gemini.enableFallbackMethod')) {
          logger.info('Standard SDK request failed, switching to alternative HTTPS method', {
            error: error.message,
            requestId: this.requestCount,
            note: 'This is normal - alternative method will be used automatically'
          });
          try {
            response = await this.executeAlternativeRequest(geminiRequest);
            usedAlternativeMethod = true;
            logger.info('✅ Request succeeded via alternative HTTPS method', {
              requestId: this.requestCount,
              responseLength: response.length,
              method: 'alternative_https'
            });
          } catch (altError) {
            logger.error('Both standard and alternative methods failed', {
              standardError: error.message,
              alternativeError: altError.message,
              requestId: this.requestCount
            });
            throw altError;
          }
        } else {
          throw error;
        }
      }
      
      logger.logPerformance('LLM text processing', startTime, {
        activeSkill,
        textLength: text.length,
        responseLength: response.length,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount,
        method: usedAlternativeMethod ? 'alternative_https' : 'standard_sdk'
      });

      return {
        response,
        metadata: {
          skill: activeSkill,
          programmingLanguage,
          processingTime: Date.now() - startTime,
          requestId: this.requestCount,
          usedFallback: false,
          usedAlternativeMethod: usedAlternativeMethod
        }
      };
    } catch (error) {
      this.errorCount++;
      
      // Enhanced error analysis for fallback diagnosis
      const errorInfo = error.errorAnalysis || this.analyzeError(error);
      
      // Log error immediately (synchronously)
      logger.error('LLM processing failed - FALLBACK TRIGGERED', {
        error: error.message,
        errorType: errorInfo.type,
        errorName: error.name,
        activeSkill,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount,
        isNetworkError: errorInfo.isNetworkError,
        suggestedAction: errorInfo.suggestedAction,
        errorStack: error.stack,
        fallbackEnabled: config.get('llm.gemini.fallbackEnabled'),
        maxRetries: config.get('llm.gemini.maxRetries'),
        timeout: config.get('llm.gemini.timeout')
      });

      // Check network connectivity asynchronously (don't block fallback)
      this.checkNetworkConnectivity().then(networkCheck => {
        logger.debug('Network connectivity check completed after fallback', {
          requestId: this.requestCount,
          networkCheck
        });
      }).catch(() => {
        logger.debug('Network connectivity check failed', { requestId: this.requestCount });
      });

      if (config.get('llm.gemini.fallbackEnabled')) {
        logger.warn('Using fallback response due to LLM failure', {
          originalError: error.message,
          errorType: errorInfo.type,
          activeSkill,
          requestId: this.requestCount
        });
        return this.generateFallbackResponse(text, activeSkill);
      }
      
      throw error;
    }
  }

  async processTranscriptionWithIntelligentResponse(text, activeSkill, sessionMemory = [], programmingLanguage = null) {
    if (!this.isInitialized) {
      throw new Error('LLM service not initialized. Check Gemini API key configuration.');
    }

    const startTime = Date.now();
    this.requestCount++;
    
    try {
      logger.info('Processing transcription with intelligent response', {
        activeSkill,
        textLength: text.length,
        hasSessionMemory: sessionMemory.length > 0,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      const geminiRequest = this.buildIntelligentTranscriptionRequest(text, activeSkill, sessionMemory, programmingLanguage);
      
      // Try standard method first
      let response;
      let usedAlternativeMethod = false;
      try {
        response = await this.executeRequest(geminiRequest);
      } catch (error) {
        // If fetch failed, try alternative method
        if (error.message.includes('fetch failed') && config.get('llm.gemini.enableFallbackMethod')) {
          logger.info('Standard SDK request failed, switching to alternative HTTPS method', {
            error: error.message,
            requestId: this.requestCount,
            note: 'This is normal - alternative method will be used automatically'
          });
          try {
            response = await this.executeAlternativeRequest(geminiRequest);
            usedAlternativeMethod = true;
            logger.info('✅ Request succeeded via alternative HTTPS method', {
              requestId: this.requestCount,
              responseLength: response.length,
              method: 'alternative_https'
            });
          } catch (altError) {
            logger.error('Both standard and alternative methods failed', {
              standardError: error.message,
              alternativeError: altError.message,
              requestId: this.requestCount
            });
            throw altError;
          }
        } else {
          throw error;
        }
      }
      
      logger.logPerformance('LLM transcription processing', startTime, {
        activeSkill,
        textLength: text.length,
        responseLength: response.length,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      return {
        response,
        metadata: {
          skill: activeSkill,
          programmingLanguage,
          processingTime: Date.now() - startTime,
          requestId: this.requestCount,
          usedFallback: false,
          isTranscriptionResponse: true
        }
      };
    } catch (error) {
      this.errorCount++;
      
      // Enhanced error analysis for fallback diagnosis
      const errorInfo = error.errorAnalysis || this.analyzeError(error);
      
      logger.error('LLM transcription processing failed - FALLBACK TRIGGERED', {
        error: error.message,
        errorType: errorInfo.type,
        errorName: error.name,
        activeSkill,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount,
        isNetworkError: errorInfo.isNetworkError,
        suggestedAction: errorInfo.suggestedAction,
        errorStack: error.stack,
        fallbackEnabled: config.get('llm.gemini.fallbackEnabled'),
        maxRetries: config.get('llm.gemini.maxRetries'),
        timeout: config.get('llm.gemini.timeout')
      });

      if (config.get('llm.gemini.fallbackEnabled')) {
        logger.warn('Using intelligent fallback response due to LLM failure', {
          originalError: error.message,
          errorType: errorInfo.type,
          activeSkill,
          requestId: this.requestCount
        });
        return this.generateIntelligentFallbackResponse(text, activeSkill);
      }
      
      throw error;
    }
  }

  buildGeminiRequest(text, activeSkill, sessionMemory, programmingLanguage) {
    // Check if we have the new conversation history format
    const sessionManager = require('../managers/session.manager');
    
    if (sessionManager && typeof sessionManager.getConversationHistory === 'function') {
      const conversationHistory = sessionManager.getConversationHistory(15);
      const skillContext = sessionManager.getSkillContext(activeSkill, programmingLanguage);
      return this.buildGeminiRequestWithHistory(text, activeSkill, conversationHistory, skillContext, programmingLanguage);
    }

    // Fallback to old method for compatibility - now with programming language support
    const requestComponents = promptLoader.getRequestComponents(
      activeSkill, 
      text, 
      sessionMemory,
      programmingLanguage
    );

    const request = {
      contents: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased from 2048 to 8192 for longer responses
        topK: 40,
        topP: 0.95
      }
    };

    // Use the skill prompt that already has programming language injected
    if (requestComponents.shouldUseModelMemory && requestComponents.skillPrompt) {
      request.systemInstruction = {
        parts: [{ text: requestComponents.skillPrompt }]
      };
      
      logger.debug('Using language-enhanced system instruction for skill', {
        skill: activeSkill,
        programmingLanguage: programmingLanguage || 'not specified',
        promptLength: requestComponents.skillPrompt.length,
        requiresProgrammingLanguage: requestComponents.requiresProgrammingLanguage
      });
    }

    request.contents.push({
      role: 'user',
      parts: [{ text: this.formatUserMessage(text, activeSkill) }]
    });

    return request;
  }

  buildGeminiRequestWithHistory(text, activeSkill, conversationHistory, skillContext, programmingLanguage) {
    const request = {
      contents: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased from 2048 to 8192 for longer responses
        topK: 40,
        topP: 0.95
      }
    };

    // Use the skill prompt from context (which may already include programming language)
    if (skillContext.skillPrompt) {
      request.systemInstruction = {
        parts: [{ text: skillContext.skillPrompt }]
      };
      
      logger.debug('Using skill context prompt as system instruction', {
        skill: activeSkill,
        programmingLanguage: programmingLanguage || 'not specified',
        promptLength: skillContext.skillPrompt.length,
        requiresProgrammingLanguage: skillContext.requiresProgrammingLanguage || false,
        hasLanguageInjection: programmingLanguage && skillContext.requiresProgrammingLanguage
      });
    }

    // Add conversation history (excluding system messages) with validation
    const conversationContents = conversationHistory
      .filter(event => {
        return event.role !== 'system' && 
               event.content && 
               typeof event.content === 'string' && 
               event.content.trim().length > 0;
      })
      .map(event => {
        const content = event.content.trim();
        return {
          role: event.role === 'model' ? 'model' : 'user',
          parts: [{ text: content }]
        };
      });

    // Add the conversation history
    request.contents.push(...conversationContents);

    // Format and validate the current user input
    const formattedMessage = this.formatUserMessage(text, activeSkill);
    if (!formattedMessage || formattedMessage.trim().length === 0) {
      throw new Error('Failed to format user message or message is empty');
    }

    // Add the current user input
    request.contents.push({
      role: 'user',
      parts: [{ text: formattedMessage }]
    });

    logger.debug('Built Gemini request with conversation history', {
      skill: activeSkill,
      programmingLanguage: programmingLanguage || 'not specified',
      historyLength: conversationHistory.length,
      totalContents: request.contents.length,
      hasSystemInstruction: !!request.systemInstruction,
      requiresProgrammingLanguage: skillContext.requiresProgrammingLanguage || false
    });

    return request;
  }

  buildIntelligentTranscriptionRequest(text, activeSkill, sessionMemory, programmingLanguage) {
    // Validate input text first
    const cleanText = text && typeof text === 'string' ? text.trim() : '';
    if (!cleanText) {
      throw new Error('Empty or invalid transcription text provided to buildIntelligentTranscriptionRequest');
    }

    // Check if we have the new conversation history format
    const sessionManager = require('../managers/session.manager');
    
    if (sessionManager && typeof sessionManager.getConversationHistory === 'function') {
      const conversationHistory = sessionManager.getConversationHistory(10);
      const skillContext = sessionManager.getSkillContext(activeSkill, programmingLanguage);
      return this.buildIntelligentTranscriptionRequestWithHistory(cleanText, activeSkill, conversationHistory, skillContext, programmingLanguage);
    }

    // Fallback to basic intelligent request
    const request = {
      contents: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased from 2048 to 8192 for longer responses
        topK: 40,
        topP: 0.95
      }
    };

    // Add intelligent filtering system instruction
    const intelligentPrompt = this.getIntelligentTranscriptionPrompt(activeSkill, programmingLanguage);
    if (!intelligentPrompt) {
      throw new Error('Failed to generate intelligent transcription prompt');
    }

    request.systemInstruction = {
      parts: [{ text: intelligentPrompt }]
    };

    request.contents.push({
      role: 'user',
      parts: [{ text: cleanText }]
    });

    logger.debug('Built basic intelligent transcription request', {
      skill: activeSkill,
      programmingLanguage: programmingLanguage || 'not specified',
      textLength: cleanText.length,
      hasSystemInstruction: !!request.systemInstruction
    });

    return request;
  }

  buildIntelligentTranscriptionRequestWithHistory(text, activeSkill, conversationHistory, skillContext, programmingLanguage) {
    const request = {
      contents: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased from 2048 to 8192 for longer responses
        topK: 40,
        topP: 0.95
      }
    };

    // Build intelligent system instruction combining skill prompt and filtering rules
    const intelligentPrompt = this.getIntelligentTranscriptionPrompt(activeSkill, programmingLanguage);
    let combinedInstruction = intelligentPrompt;
    
    // Use the skill prompt from context (which may already include programming language)
    if (skillContext.skillPrompt) {
      combinedInstruction = `${skillContext.skillPrompt}\n\n${intelligentPrompt}`;
    }

    request.systemInstruction = {
      parts: [{ text: combinedInstruction }]
    };

    // Add recent conversation history (excluding system messages) with validation
    const conversationContents = conversationHistory
      .filter(event => {
        // Filter out system messages and ensure content exists and is valid
        return event.role !== 'system' && 
               event.content && 
               typeof event.content === 'string' && 
               event.content.trim().length > 0;
      })
      .slice(-8) // Keep last 8 exchanges for context
      .map(event => {
        const content = event.content.trim();
        if (!content) {
          logger.warn('Empty content found in conversation history', { event });
          return null;
        }
        return {
          role: event.role === 'model' ? 'model' : 'user',
          parts: [{ text: content }]
        };
      })
      .filter(content => content !== null); // Remove any null entries

    // Add the conversation history
    request.contents.push(...conversationContents);

    // Validate and add the current transcription
    const cleanText = text && typeof text === 'string' ? text.trim() : '';
    if (!cleanText) {
      throw new Error('Empty or invalid transcription text provided');
    }

    request.contents.push({
      role: 'user',
      parts: [{ text: cleanText }]
    });

    // Ensure we have at least one content item
    if (request.contents.length === 0) {
      throw new Error('No valid content to send to Gemini API');
    }

    logger.debug('Built intelligent transcription request with conversation history', {
      skill: activeSkill,
      programmingLanguage: programmingLanguage || 'not specified',
      historyLength: conversationHistory.length,
      totalContents: request.contents.length,
      hasSkillPrompt: !!skillContext.skillPrompt,
      cleanTextLength: cleanText.length,
      requiresProgrammingLanguage: skillContext.requiresProgrammingLanguage || false
    });

    return request;
  }

  getIntelligentTranscriptionPrompt(activeSkill, programmingLanguage) {
    let prompt = `# Intelligent Transcription Response System

Assume you are asked a question in ${activeSkill.toUpperCase()} mode. Your job is to intelligently respond to question/message with appropriate brevity.
Assume you are in an interview and you need to perform best in ${activeSkill.toUpperCase()} mode.
Always respond to the point, do not repeat the question or unnecessary information which is not related to ${activeSkill}.`;

    // Add programming language context if provided
    if (programmingLanguage) {
      prompt += `\n\nCODING CONTEXT: When providing code examples or technical solutions, use ${programmingLanguage.toUpperCase()} as the primary programming language.`;
    }

    prompt += `

## Response Rules:

### If the transcription is casual conversation, greetings, or NOT related to ${activeSkill}:
- Respond with: "Yeah, I'm listening. Ask your question relevant to ${activeSkill}."
- Or similar brief acknowledgments like: "I'm here, what's your ${activeSkill} question?"

### If the transcription IS relevant to ${activeSkill} or is a follow-up question:
- Provide a comprehensive, detailed response
- Use bullet points, examples, and explanations
- Focus on actionable insights and complete answers
- Do not truncate or shorten your response

### Examples of casual/irrelevant messages:
- "Hello", "Hi there", "How are you?"
- "What's the weather like?"
- "I'm just testing this"
- Random conversations not related to ${activeSkill}

### Examples of relevant messages:
- Actual questions about ${activeSkill} concepts
- Follow-up questions to previous responses
- Requests for clarification on ${activeSkill} topics
- Problem-solving requests related to ${activeSkill}

## Response Format:
- Keep responses detailed
- Use bullet points for structured answers
- Be encouraging and helpful
- Stay focused on ${activeSkill}

Remember: Be intelligent about filtering - only provide detailed responses when the user actually needs help with ${activeSkill}.`;

    return prompt;
  }

  formatUserMessage(text, activeSkill) {
    return `Context: ${activeSkill.toUpperCase()} analysis request\n\nText to analyze:\n${text}`;
  }

  async executeRequest(geminiRequest) {
    const maxRetries = config.get('llm.gemini.maxRetries');
    const timeout = config.get('llm.gemini.timeout');
    
    // Add request debugging
    logger.debug('Executing Gemini request', {
      hasModel: !!this.model,
      hasClient: !!this.client,
      requestKeys: Object.keys(geminiRequest),
      timeout,
      maxRetries,
      nodeVersion: process.version,
      platform: process.platform
    });
    
    let lastError = null;
    let lastErrorInfo = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Pre-flight check (only on first attempt to avoid delays)
        if (attempt === 1) {
          await this.performPreflightCheck();
        }
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        logger.debug(`Gemini API attempt ${attempt} starting`, {
          timestamp: new Date().toISOString(),
          timeout,
          attempt,
          maxRetries
        });

        try {
          const latestContent = Array.isArray(geminiRequest?.contents)
            ? geminiRequest.contents[geminiRequest.contents.length - 1]
            : null;
          const messagePreview = latestContent?.parts?.[0]?.text || '';

          logger.debug('Gemini request payload summary', {
            contentCount: Array.isArray(geminiRequest?.contents) ? geminiRequest.contents.length : 0,
            hasSystemInstruction: !!geminiRequest?.systemInstruction,
            messagePreview: messagePreview.substring(0, 200),
            previewLength: messagePreview.length
          });
        } catch (payloadLogError) {
          logger.warn('Failed to log Gemini request payload summary', {
            error: payloadLogError.message
          });
        }
        
        // Execute the request with timeout
        const requestPromise = this.model.generateContent(geminiRequest);
        const result = await Promise.race([requestPromise, timeoutPromise]);
        
        if (!result || !result.response) {
          throw new Error('Empty response from Gemini API');
        }

        const responseText = result.response.text();
        
        if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
          throw new Error('Empty text content in Gemini response');
        }

        logger.info('Gemini API request successful', {
          attempt,
          responseLength: responseText.length,
          totalAttempts: attempt
        });

        return responseText.trim();
      } catch (error) {
        lastError = error;
        const errorInfo = this.analyzeError(error);
        lastErrorInfo = errorInfo;
        
        // Enhanced error logging for fetch failures
        if (errorInfo.type === 'NETWORK_ERROR') {
          logger.warn('Network error detected', {
            attempt,
            errorMessage: error.message,
            errorName: error.name,
            nodeEnv: process.env.NODE_ENV,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            nodeVersion: process.versions.node
          });
        }
        
        logger.warn(`Gemini API attempt ${attempt}/${maxRetries} failed`, {
          error: error.message,
          errorType: errorInfo.type,
          isNetworkError: errorInfo.isNetworkError,
          isRetryable: errorInfo.isRetryable,
          suggestedAction: errorInfo.suggestedAction,
          remainingAttempts: maxRetries - attempt
        });

        // If error is not retryable, fail immediately
        if (errorInfo.isRetryable === false) {
          logger.error('Non-retryable error detected, failing immediately', {
            errorType: errorInfo.type,
            error: error.message
          });
          const finalError = new Error(`Gemini API error (non-retryable): ${error.message}`);
          finalError.errorAnalysis = errorInfo;
          finalError.originalError = error;
          throw finalError;
        }

        // Try alternative HTTPS method for network errors (but not on every attempt to avoid spam)
        if (errorInfo.type === 'NETWORK_ERROR' && config.get('llm.gemini.enableFallbackMethod') && attempt <= 2) {
          try {
            logger.info('Attempting alternative HTTPS transport', {
              attempt,
              transport: 'https_direct'
            });
            const fallbackResponse = await this.executeAlternativeRequest(geminiRequest);
            logger.info('Alternative HTTPS transport succeeded', {
              attempt,
              responseLength: fallbackResponse.length
            });
            return fallbackResponse;
          } catch (fallbackError) {
            logger.warn('Alternative HTTPS transport failed', {
              attempt,
              error: fallbackError.message,
              transport: 'https_direct'
            });
            // Continue with retry logic below
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          const finalError = new Error(`Gemini API failed after ${maxRetries} attempts: ${error.message}`);
          finalError.errorAnalysis = errorInfo;
          finalError.originalError = error;
          throw finalError;
        }

        // Calculate delay with exponential backoff and jitter
        // For network errors: longer delays (2s, 4s, 8s...)
        // For other errors: shorter delays (1s, 2s, 4s...)
        const baseDelay = errorInfo.isNetworkError ? 2000 : 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Random 0-1000ms
        const delay = Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
        
        logger.debug(`Waiting ${Math.round(delay)}ms before retry ${attempt + 1}`, {
          baseDelay,
          exponentialDelay,
          jitter: Math.round(jitter),
          finalDelay: Math.round(delay),
          isNetworkError: errorInfo.isNetworkError,
          attempt
        });
        
        await this.delay(delay);
      }
    }
    
    // This should never be reached, but just in case
    const finalError = new Error(`Gemini API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    finalError.errorAnalysis = lastErrorInfo;
    finalError.originalError = lastError;
    throw finalError;
  }

  async performPreflightCheck() {
    // Quick connectivity check
    try {
      const startTime = Date.now();
      await this.testNetworkConnection({ 
        host: 'generativelanguage.googleapis.com', 
        port: 443, 
        name: 'Gemini API Endpoint' 
      });
      const latency = Date.now() - startTime;
      
      logger.debug('Preflight check passed', { latency });
    } catch (error) {
      logger.warn('Preflight check failed', { 
        error: error.message,
        suggestion: 'Network connectivity issue detected before API call'
      });
      // Don't throw here - let the actual API call fail with more detail
    }
  }

  getUserAgent() {
    try {
      // Try to get user agent from Electron if available
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        return navigator.userAgent;
      }
      return `Node.js/${process.version} (${process.platform}; ${process.arch})`;
    } catch {
      return 'Unknown';
    }
  }

  analyzeError(error) {
    const errorMessage = error.message.toLowerCase();
    const errorString = error.toString().toLowerCase();
    
    // Network connectivity errors
    if (errorMessage.includes('fetch failed') || 
        errorMessage.includes('network error') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('econnaborted') ||
        errorMessage.includes('socket hang up') ||
        errorMessage.includes('connection reset') ||
        errorString.includes('fetch failed')) {
      return {
        type: 'NETWORK_ERROR',
        isNetworkError: true,
        isRetryable: true,
        suggestedAction: 'Check internet connection and firewall settings'
      };
    }
    
    // API key errors (not retryable)
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403')) {
      return {
        type: 'AUTH_ERROR',
        isNetworkError: false,
        isRetryable: false,
        suggestedAction: 'Verify Gemini API key configuration'
      };
    }
    
    // Rate limiting (retryable with backoff)
    if (errorMessage.includes('quota') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted')) {
      return {
        type: 'RATE_LIMIT_ERROR',
        isNetworkError: false,
        isRetryable: true,
        suggestedAction: 'Wait before retrying or check API quota'
      };
    }
    
    // Timeout errors (retryable)
    if (errorMessage.includes('request timeout') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out')) {
      return {
        type: 'TIMEOUT_ERROR',
        isNetworkError: true,
        isRetryable: true,
        suggestedAction: 'Check network latency or increase timeout'
      };
    }
    
    // Server errors (retryable)
    if (errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('internal server error') ||
        errorMessage.includes('bad gateway') ||
        errorMessage.includes('service unavailable')) {
      return {
        type: 'SERVER_ERROR',
        isNetworkError: false,
        isRetryable: true,
        suggestedAction: 'Server error - will retry automatically'
      };
    }
    
    // Invalid request errors (not retryable)
    if (errorMessage.includes('400') ||
        errorMessage.includes('bad request') ||
        errorMessage.includes('invalid request')) {
      return {
        type: 'INVALID_REQUEST_ERROR',
        isNetworkError: false,
        isRetryable: false,
        suggestedAction: 'Check request format and parameters'
      };
    }
    
    return {
      type: 'UNKNOWN_ERROR',
      isNetworkError: false,
      isRetryable: true, // Default to retryable for unknown errors
      suggestedAction: 'Check logs for more details'
    };
  }

  async checkNetworkConnectivity() {
    const connectivityTests = [
      { host: 'google.com', port: 443, name: 'Google (HTTPS)' },
      { host: 'generativelanguage.googleapis.com', port: 443, name: 'Gemini API Endpoint' }
    ];

    const results = await Promise.allSettled(
      connectivityTests.map(test => this.testNetworkConnection(test))
    );

    const connectivity = {
      timestamp: new Date().toISOString(),
      tests: results.map((result, index) => ({
        ...connectivityTests[index],
        success: result.status === 'fulfilled' && result.value,
        error: result.status === 'rejected' ? result.reason.message : null
      }))
    };

    logger.info('Network connectivity check completed', connectivity);
    return connectivity;
  }

  async testNetworkConnection({ host, port, name }) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed to ${host}:${port}: ${error.message}`));
      });

      socket.connect(port, host);
    });
  }

  generateFallbackResponse(text, activeSkill) {
    logger.info('Generating fallback response', { activeSkill });

    const fallbackResponses = {
      'dsa': 'This appears to be a data structures and algorithms problem. Consider breaking it down into smaller components and identifying the appropriate algorithm or data structure to use.',
      'system-design': 'For this system design question, consider scalability, reliability, and the trade-offs between different architectural approaches.',
      'programming': 'This looks like a programming challenge. Focus on understanding the requirements, edge cases, and optimal time/space complexity.',
      'default': 'I can help analyze this content. Please ensure your Gemini API key is properly configured for detailed analysis.'
    };

    const response = fallbackResponses[activeSkill] || fallbackResponses.default;
    
    return {
      response,
      metadata: {
        skill: activeSkill,
        processingTime: 0,
        requestId: this.requestCount,
        usedFallback: true
      }
    };
  }

  generateIntelligentFallbackResponse(text, activeSkill) {
    logger.info('Generating intelligent fallback response for transcription', { activeSkill });

    // Simple heuristic to determine if message seems skill-related
    const skillKeywords = {
      'dsa': ['algorithm', 'data structure', 'array', 'tree', 'graph', 'sort', 'search', 'complexity', 'big o'],
      'programming': ['code', 'function', 'variable', 'class', 'method', 'bug', 'debug', 'syntax'],
      'system-design': ['scalability', 'database', 'architecture', 'microservice', 'load balancer', 'cache'],
      'behavioral': ['interview', 'experience', 'situation', 'leadership', 'conflict', 'team'],
      'sales': ['customer', 'deal', 'negotiation', 'price', 'revenue', 'prospect'],
      'presentation': ['slide', 'audience', 'public speaking', 'presentation', 'nervous'],
      'data-science': ['data', 'model', 'machine learning', 'statistics', 'analytics', 'python', 'pandas'],
      'devops': ['deployment', 'ci/cd', 'docker', 'kubernetes', 'infrastructure', 'monitoring'],
      'negotiation': ['negotiate', 'compromise', 'agreement', 'terms', 'conflict resolution']
    };

    const textLower = text.toLowerCase();
    const relevantKeywords = skillKeywords[activeSkill] || [];
    const hasRelevantKeywords = relevantKeywords.some(keyword => textLower.includes(keyword));
    
    // Check for question indicators
    const questionIndicators = ['how', 'what', 'why', 'when', 'where', 'can you', 'could you', 'should i', '?'];
    const seemsLikeQuestion = questionIndicators.some(indicator => textLower.includes(indicator));

    let response;
    if (hasRelevantKeywords || seemsLikeQuestion) {
      response = `I'm having trouble processing that right now, but it sounds like a ${activeSkill} question. Could you rephrase or ask more specifically about what you need help with?`;
    } else {
      response = `Yeah, I'm listening. Ask your question relevant to ${activeSkill}.`;
    }
    
    return {
      response,
      metadata: {
        skill: activeSkill,
        processingTime: 0,
        requestId: this.requestCount,
        usedFallback: true,
        isTranscriptionResponse: true
      }
    };
  }

  async testConnection() {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // First check network connectivity
      const networkCheck = await this.checkNetworkConnectivity();
      const hasNetworkIssues = networkCheck.tests.some(test => !test.success);
      
      if (hasNetworkIssues) {
        logger.warn('Network connectivity issues detected', networkCheck);
      }

      const testRequest = {
        contents: [{
          role: 'user',
          parts: [{ text: 'Test connection. Please respond with "OK".' }]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10
        }
      };

      const startTime = Date.now();
      const result = await this.model.generateContent(testRequest);
      const latency = Date.now() - startTime;
      const response = result.response.text();
      
      logger.info('Connection test successful', { 
        response, 
        latency,
        networkCheck: hasNetworkIssues ? 'issues_detected' : 'healthy'
      });
      
      return { 
        success: true, 
        response: response.trim(),
        latency,
        networkConnectivity: networkCheck
      };
    } catch (error) {
      const errorAnalysis = this.analyzeError(error);
      logger.error('Connection test failed', { 
        error: error.message,
        errorAnalysis
      });
      
      return { 
        success: false, 
        error: error.message,
        errorAnalysis,
        networkConnectivity: await this.checkNetworkConnectivity().catch(() => null)
      };
    }
  }

  updateApiKey(newApiKey) {
    process.env.GEMINI_API_KEY = newApiKey;
    this.isInitialized = false;
    this.initializeClient();
    
    logger.info('API key updated and client reinitialized');
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      successRate: this.requestCount > 0 ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 0,
      fallbackRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      config: config.get('llm.gemini'),
      fallbackEnabled: config.get('llm.gemini.fallbackEnabled'),
      enableFallbackMethod: config.get('llm.gemini.enableFallbackMethod')
    };
  }
  
  async getDiagnostics() {
    const stats = this.getStats();
    const networkCheck = await this.checkNetworkConnectivity().catch(() => null);
    
    return {
      ...stats,
      networkConnectivity: networkCheck,
      apiKeyConfigured: !!config.getApiKey('GEMINI'),
      apiKeyValid: config.getApiKey('GEMINI') !== 'your-api-key-here' && !!config.getApiKey('GEMINI'),
      model: config.get('llm.gemini.model'),
      commonFallbackReasons: [
        'Network connectivity issues (check internet connection)',
        'API key invalid or expired (verify GEMINI_API_KEY)',
        'Rate limiting (too many requests)',
        'Request timeout (network too slow)',
        'API service unavailable (check Google Gemini status)'
      ]
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeAlternativeRequest(geminiRequest, maxRetries = 3) {
    const https = require('https');
    const apiKey = config.getApiKey('GEMINI');
    const model = config.get('llm.gemini.model');
    const apiVersion = config.get('llm.gemini.apiVersion') || 'v1beta';
    const baseTimeout = config.get('llm.gemini.timeout');
    
    logger.info('Using alternative HTTPS request method', {
      model,
      apiVersion,
      maxRetries
    });
    
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
    
    let postData;
    try {
      const httpPayload = this.transformRequestForHttpTransport(geminiRequest);
      postData = JSON.stringify(httpPayload);
    } catch (transformError) {
      logger.error('Failed to transform Gemini request for HTTPS transport', {
        error: transformError.message
      });
      throw transformError;
    }
    
    // Retry logic for 503 errors and timeouts
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this._makeAlternativeRequest(url, postData, baseTimeout, attempt, maxRetries);
        return result;
      } catch (error) {
        const errorMessage = error.message || String(error);
        const isRetryable = this._isAlternativeRequestRetryable(errorMessage, error.statusCode);
        
        if (!isRetryable || attempt === maxRetries) {
          logger.error('Alternative request failed after all retries', {
            attempt,
            maxRetries,
            error: errorMessage,
            isRetryable
          });
          throw error;
        }
        
        // Calculate exponential backoff: 2s, 4s, 8s (capped at 10s)
        const backoffDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        logger.warn('Alternative request failed, retrying with backoff', {
          attempt,
          maxRetries,
          error: errorMessage,
          backoffDelay,
          nextAttempt: attempt + 1
        });
        
        await this.delay(backoffDelay);
      }
    }
  }

  _isAlternativeRequestRetryable(errorMessage, statusCode) {
    if (!errorMessage) return false;
    
    const message = errorMessage.toLowerCase();
    
    // Retry on 503 (overloaded), 429 (rate limit), 500-504 (server errors)
    if (statusCode === 503 || statusCode === 429 || (statusCode >= 500 && statusCode <= 504)) {
      return true;
    }
    
    // Retry on timeout errors
    if (message.includes('timeout')) {
      return true;
    }
    
    // Retry on network errors
    if (message.includes('econnreset') || message.includes('econnaborted') || 
        message.includes('socket hang up') || message.includes('connection reset')) {
      return true;
    }
    
    // Don't retry on 400, 401, 403 (client errors)
    if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
      return false;
    }
    
    return false;
  }

  _makeAlternativeRequest(url, postData, timeout, attempt, maxRetries) {
    const https = require('https');
    
    // Increase timeout for later attempts (complex requests may need more time)
    const requestTimeout = timeout + (attempt - 1) * 10000; // Add 10s per attempt
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': this.getUserAgent()
      },
      timeout: requestTimeout
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Log raw response for debugging (first 500 chars)
            const responsePreview = data.substring(0, 500);
            logger.debug('Alternative request response received', {
              statusCode: res.statusCode,
              contentType: res.headers['content-type'],
              responseLength: data.length,
              responsePreview
            });

            if (res.statusCode !== 200) {
              // Try to parse error response
              let errorMessage = `HTTP ${res.statusCode}`;
              let errorCode = res.statusCode;
              try {
                const errorResponse = JSON.parse(data);
                if (errorResponse.error) {
                  errorMessage = `HTTP ${res.statusCode}: ${errorResponse.error.message || JSON.stringify(errorResponse.error)}`;
                  errorCode = errorResponse.error.code || res.statusCode;
                } else {
                  errorMessage = `HTTP ${res.statusCode}: ${data.substring(0, 200)}`;
                }
              } catch {
                errorMessage = `HTTP ${res.statusCode}: ${data.substring(0, 200)}`;
              }
              
              const error = new Error(errorMessage);
              error.statusCode = errorCode;
              
              logger.warn('Alternative request failed with non-200 status', {
                statusCode: res.statusCode,
                errorCode,
                errorMessage,
                attempt,
                maxRetries,
                responsePreview: data.substring(0, 500)
              });
              
              reject(error);
              return;
            }
            
            // Parse JSON response
            let response;
            try {
              response = JSON.parse(data);
            } catch (parseError) {
              logger.error('Failed to parse JSON response', {
                error: parseError.message,
                responsePreview: data.substring(0, 500)
              });
              reject(new Error(`Failed to parse JSON response: ${parseError.message}`));
              return;
            }

            // Check for error in response
            if (response.error) {
              const errorMsg = response.error.message || JSON.stringify(response.error);
              logger.error('Gemini API returned error in response', {
                error: errorMsg,
                errorCode: response.error.code,
                response
              });
              reject(new Error(`Gemini API error: ${errorMsg}`));
              return;
            }
            
            // Validate response structure with detailed checks
            if (!response.candidates) {
              logger.error('Response missing candidates array', {
                responseKeys: Object.keys(response),
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: missing candidates array'));
              return;
            }
            
            if (!Array.isArray(response.candidates) || response.candidates.length === 0) {
              logger.error('Response candidates is empty or not an array', {
                candidatesType: typeof response.candidates,
                candidatesLength: Array.isArray(response.candidates) ? response.candidates.length : 'not an array',
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: candidates array is empty'));
              return;
            }
            
            const candidate = response.candidates[0];
            if (!candidate.content) {
              logger.error('Response candidate missing content', {
                candidateKeys: Object.keys(candidate),
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: candidate missing content'));
              return;
            }
            
            // Check for finishReason - if MAX_TOKENS, the response was truncated
            if (candidate.finishReason === 'MAX_TOKENS') {
              const usageInfo = response.usageMetadata || {};
              logger.warn('Response truncated due to MAX_TOKENS limit', {
                finishReason: candidate.finishReason,
                hasParts: !!candidate.content.parts,
                contentKeys: Object.keys(candidate.content),
                promptTokens: usageInfo.promptTokenCount,
                totalTokens: usageInfo.totalTokenCount,
                thoughtsTokens: usageInfo.thoughtsTokenCount
              });
              
              // If there are no parts, this is a problem - the response was completely cut off
              // This can happen when thoughts tokens consume all available tokens
              if (!candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
                logger.error('Response truncated with no content - thoughts tokens consumed all available tokens', {
                  finishReason: candidate.finishReason,
                  usageMetadata: usageInfo,
                  suggestion: 'The model used all tokens for internal reasoning. This may require a larger maxOutputTokens limit or a different model configuration.'
                });
                reject(new Error(`Response truncated: MAX_TOKENS limit reached with no content. Thoughts tokens: ${usageInfo.thoughtsTokenCount || 0}, Total tokens: ${usageInfo.totalTokenCount || 0}. Consider increasing maxOutputTokens significantly.`));
                return;
              }
              // If there are parts, we'll continue and extract what we can (partial response)
              logger.warn('Response was truncated but partial content is available', {
                partsCount: candidate.content.parts.length
              });
            }
            
            if (!candidate.content.parts) {
              logger.error('Response candidate content missing parts', {
                contentKeys: Object.keys(candidate.content),
                finishReason: candidate.finishReason,
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: content missing parts'));
              return;
            }
            
            if (!Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
              logger.error('Response candidate parts is empty or not an array', {
                partsType: typeof candidate.content.parts,
                partsLength: Array.isArray(candidate.content.parts) ? candidate.content.parts.length : 'not an array',
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: parts array is empty'));
              return;
            }
            
            const firstPart = candidate.content.parts[0];
            if (!firstPart || !firstPart.text) {
              logger.error('Response candidate part missing text', {
                partKeys: firstPart ? Object.keys(firstPart) : 'part is null/undefined',
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Invalid response structure: part missing text'));
              return;
            }
            
            const text = firstPart.text;
            
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
              logger.error('Response text is empty or invalid', {
                textType: typeof text,
                textLength: text ? text.length : 0,
                responsePreview: JSON.stringify(response).substring(0, 500)
              });
              reject(new Error('Empty or invalid text content in Gemini response'));
              return;
            }
            
            logger.info('Alternative request successful', {
              responseLength: text.length,
              statusCode: res.statusCode,
              hasCandidates: !!response.candidates,
              candidateCount: response.candidates.length
            });
            
            resolve(text.trim());
          } catch (parseError) {
            logger.error('Unexpected error parsing alternative request response', {
              error: parseError.message,
              stack: parseError.stack,
              responsePreview: data.substring(0, 500)
            });
            reject(new Error(`Failed to parse response: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        logger.warn('Alternative request network error', {
          error: error.message,
          code: error.code,
          attempt,
          maxRetries
        });
        reject(new Error(`Alternative request failed: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        logger.warn('Alternative request timeout', {
          timeout: requestTimeout,
          attempt,
          maxRetries
        });
        reject(new Error('Alternative request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  transformRequestForHttpTransport(request) {
    const normalizePart = (part) => {
      if (!part) return {};
      if (typeof part.text === 'string') {
        return { text: part.text };
      }
      if (part.inlineData) {
        return { inline_data: part.inlineData };
      }
      if (part.fileData) {
        return { file_data: part.fileData };
      }
      return part;
    };

    const payload = {};

    if (request.systemInstruction) {
      payload.system_instruction = {
        parts: (request.systemInstruction.parts || []).map(normalizePart)
      };
    }

    if (Array.isArray(request.contents)) {
      payload.contents = request.contents.map((content) => ({
        role: content.role,
        parts: (content.parts || []).map(normalizePart)
      }));
    }

    if (request.generationConfig) {
      payload.generation_config = { ...request.generationConfig };
    }

    if (request.safetySettings) {
      payload.safety_settings = request.safetySettings;
    }

    if (request.tools) {
      payload.tools = request.tools;
    }

    if (request.toolConfig) {
      payload.tool_config = request.toolConfig;
    }

    if (request.cachedContent) {
      payload.cached_content = request.cachedContent;
    }

    return payload;
  }
}

module.exports = new LLMService();