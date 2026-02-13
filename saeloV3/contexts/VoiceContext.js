import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { supabase } from '../lib/supabase';

const VoiceContext = createContext({});

// Processing timeout in milliseconds (30 seconds)
const PROCESSING_TIMEOUT_MS = 30000;

// Max retry attempts for transient failures
const MAX_RETRIES = 2;

/**
 * Voice processing states
 */
export const VoiceState = {
  IDLE: 'idle',           // Ready to record
  RECORDING: 'recording', // Actively recording
  PROCESSING: 'processing', // Sending to STT + LLM (shows shimmer)
  REVIEW: 'review',       // Showing ReviewModal with parsed intent
  QUERY_RESULT: 'query_result', // Showing query response from n8n
  ACT_RESULT: 'act_result', // Showing ACT execution result (success/error)
  ERROR: 'error',         // Something went wrong
};

/**
 * Intent types from LLM classification
 */
export const IntentType = {
  LOG: 'log',     // Log data (expense, note, contact, etc.)
  QUERY: 'query', // Ask a question about data
  ACT: 'act',     // Perform an action (send email, schedule, etc.)
};

export function VoiceProvider({ children }) {
  const recorder = useVoiceRecorder();

  const [voiceState, setVoiceState] = useState(VoiceState.IDLE);
  const [transcript, setTranscript] = useState(null);
  const [parsedIntent, setParsedIntent] = useState(null);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [queryResponse, setQueryResponse] = useState(null);
  const [actResult, setActResult] = useState(null);

  // Ref to track if processing was cancelled/timed out
  const processingAbortedRef = useRef(false);

  /**
   * Start recording voice
   */
  const startRecording = useCallback(async () => {
    setError(null);
    setParsedIntent(null);
    setTranscript(null);

    await recorder.startRecording();
    setVoiceState(VoiceState.RECORDING);
  }, [recorder]);

  /**
   * Stop recording and process voice
   */
  const stopRecording = useCallback(async () => {
    const result = await recorder.stopRecording();

    if (!result) {
      setError('No audio recorded');
      setVoiceState(VoiceState.ERROR);
      return;
    }

    // Show processing shimmer
    setVoiceState(VoiceState.PROCESSING);
    processingAbortedRef.current = false;

    try {
      // Send audio to Edge Function for STT + classification with timeout
      const response = await withTimeout(
        processVoiceWithRetry(result.uri),
        PROCESSING_TIMEOUT_MS,
        'Processing timed out. Please try again.'
      );

      // Check if processing was cancelled while waiting
      if (processingAbortedRef.current) {
        return;
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Create voice session in database
      const sessionId = await createVoiceSession({
        transcript: response.transcript,
        audioUri: result.uri,
        intent: response.intent,
      });
      setCurrentSessionId(sessionId);

      setTranscript(response.transcript);
      setParsedIntent(response.intent);
      setVoiceState(VoiceState.REVIEW);

    } catch (err) {
      // Don't show error if processing was aborted
      if (processingAbortedRef.current) {
        return;
      }
      setError(err.message || 'Failed to process voice');
      setVoiceState(VoiceState.ERROR);
    }
  }, [recorder]);

  /**
   * Cancel current operation and reset
   */
  const cancel = useCallback(async () => {
    // Mark processing as aborted to prevent state updates after cancel
    processingAbortedRef.current = true;

    if (voiceState === VoiceState.RECORDING) {
      await recorder.cancelRecording();
    }

    // Update session status to cancelled if we have one
    if (currentSessionId) {
      await updateVoiceSession(currentSessionId, {
        execution_status: 'cancelled',
      });
    }

    setVoiceState(VoiceState.IDLE);
    setTranscript(null);
    setParsedIntent(null);
    setError(null);
    setCurrentSessionId(null);
  }, [voiceState, recorder, currentSessionId]);

  /**
   * Called after user approves/edits intent in ReviewModal
   */
  const confirmIntent = useCallback(async (editedIntent) => {
    try {
      setVoiceState(VoiceState.PROCESSING);

      // Execute the intent
      const response = await executeIntent(editedIntent);

      if (response.error) {
        throw new Error(response.error);
      }

      // Update session with success result
      if (currentSessionId) {
        await updateVoiceSession(currentSessionId, {
          execution_status: 'success',
          execution_result: response,
          executed_at: new Date().toISOString(),
          parsed_data: editedIntent,
        });
      }

      // QUERY intents: show the response in modal instead of closing
      const intentType = editedIntent?.type || editedIntent?.intentType;
      if (intentType === IntentType.QUERY && response.response) {
        setQueryResponse(response.response);
        setVoiceState(VoiceState.QUERY_RESULT);
        return response;
      }

      // ACT intents: show success result before dismissing
      if (intentType === IntentType.ACT) {
        setActResult(response);
        setVoiceState(VoiceState.ACT_RESULT);
        return response;
      }

      // LOG intents: reset to idle
      setVoiceState(VoiceState.IDLE);
      setParsedIntent(null);
      setTranscript(null);
      setCurrentSessionId(null);
      setQueryResponse(null);
      setActResult(null);

      return response;

    } catch (err) {
      if (currentSessionId) {
        await updateVoiceSession(currentSessionId, {
          execution_status: 'error',
          execution_result: { error: err.message },
        });
      }

      setError(err.message || 'Failed to execute intent');
      setVoiceState(VoiceState.ERROR);
      return { error: err.message };
    }
  }, [currentSessionId]);

  /**
   * Dismiss error and return to idle
   */
  const dismissQueryResult = useCallback(() => {
    setVoiceState(VoiceState.IDLE);
    setQueryResponse(null);
    setActResult(null);
    setParsedIntent(null);
    setTranscript(null);
    setCurrentSessionId(null);
  }, []);

  const dismissActResult = useCallback(() => {
    setVoiceState(VoiceState.IDLE);
    setActResult(null);
    setParsedIntent(null);
    setTranscript(null);
    setCurrentSessionId(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setVoiceState(VoiceState.IDLE);
    setCurrentSessionId(null);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        // State
        voiceState,
        isRecording: voiceState === VoiceState.RECORDING,
        isProcessing: voiceState === VoiceState.PROCESSING,
        transcript,
        parsedIntent,
        queryResponse,
        actResult,
        error,
        hasPermission: recorder.hasPermission,

        // Actions
        startRecording,
        stopRecording,
        cancel,
        confirmIntent,
        dismissQueryResult,
        dismissActResult,
        dismissError,
        requestPermission: recorder.requestPermission,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoice = () => useContext(VoiceContext);

// ============================================
// Helper Functions
// ============================================

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Error message on timeout
 * @returns {Promise}
 */
function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Check if an error is retryable (network/transient issues)
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isRetryableError(error) {
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}

/**
 * Sleep for a given duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// API Functions (call Edge Functions)
// ============================================

/**
 * Process voice with automatic retry for transient failures
 * @param {string} audioUri - Local file URI of recorded audio
 * @returns {Promise<{transcript: string, intent: object, error?: string}>}
 */
async function processVoiceWithRetry(audioUri) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await processVoice(audioUri);

      // If we got an error response, check if it's retryable
      if (result.error) {
        const err = new Error(result.error);
        if (isRetryableError(err) && attempt < MAX_RETRIES) {
          lastError = err;
          await sleep(1000 * (attempt + 1)); // Exponential backoff: 1s, 2s
          continue;
        }
        return result;
      }

      return result;
    } catch (err) {
      lastError = err;
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  return { error: lastError?.message || 'Failed after retries' };
}

/**
 * Send audio to Edge Function for STT + intent classification
 * @param {string} audioUri - Local file URI of recorded audio
 * @returns {Promise<{transcript: string, intent: object, error?: string}>}
 */
async function processVoice(audioUri) {
  try {
    // Read audio file as base64
    const response = await fetch(audioUri);
    const blob = await response.blob();

    // Convert blob to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g., "data:audio/m4a;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('process-voice', {
      body: { audio: base64 },
    });

    if (error) throw error;
    return data;

  } catch (err) {
    return { error: err.message || 'Failed to process voice' };
  }
}

/**
 * Execute a confirmed intent
 * @param {object} intent - The intent to execute
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
async function executeIntent(intent) {
  try {
    const { data, error } = await supabase.functions.invoke('execute-intent', {
      body: { intent },
    });

    if (error) throw error;
    return data;

  } catch (err) {
    return { error: err.message || 'Failed to execute intent' };
  }
}

// ============================================
// Database Functions (voice_sessions table)
// ============================================

/**
 * Create a new voice session record
 * @param {object} params - Session data
 * @param {string} params.transcript - Transcribed text
 * @param {string} params.audioUri - Local audio file URI (optional)
 * @param {object} params.intent - Classified intent from LLM
 * @returns {Promise<string|null>} Session ID or null on error
 */
async function createVoiceSession({ transcript, audioUri, intent }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('voice_sessions')
      .insert({
        user_id: user.id,
        transcript,
        audio_uri: audioUri,
        intent_type: intent?.type?.toUpperCase() || null,
        category: intent?.category || null,
        confidence: intent?.confidence || null,
        parsed_data: intent,
        execution_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create voice session:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Error creating voice session:', err);
    return null;
  }
}

/**
 * Update an existing voice session
 * @param {string} sessionId - The session ID to update
 * @param {object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
async function updateVoiceSession(sessionId, updates) {
  try {
    const { error } = await supabase
      .from('voice_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to update voice session:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating voice session:', err);
    return false;
  }
}
