import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Recording configuration optimized for speech-to-text
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/**
 * Hook for recording voice audio
 *
 * @returns {Object} Voice recorder state and controls
 * - isRecording: boolean - Whether currently recording
 * - hasPermission: boolean | null - Microphone permission status
 * - error: string | null - Error message if any
 * - startRecording: () => Promise<void> - Start recording
 * - stopRecording: () => Promise<{uri: string, duration: number} | null> - Stop and return audio data
 * - requestPermission: () => Promise<boolean> - Request mic permission
 */
export default function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);

  const recordingRef = useRef(null);
  const startTimeRef = useRef(null);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async () => {
    try {
      setError(null);

      // Web doesn't need explicit permission request through expo-av
      if (Platform.OS === 'web') {
        setHasPermission(true);
        return true;
      }

      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        setError('Microphone permission denied');
      }

      return granted;
    } catch (err) {
      setError(`Permission error: ${err.message}`);
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check/request permission first
      if (hasPermission !== true) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);

    } catch (err) {
      setError(`Recording error: ${err.message}`);
      setIsRecording(false);
    }
  }, [hasPermission, requestPermission]);

  /**
   * Stop recording and return audio data
   * @returns {Promise<{uri: string, duration: number, base64: string} | null>}
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        setError('No active recording');
        return null;
      }

      setIsRecording(false);

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Get the recording URI
      const uri = recordingRef.current.getURI();
      const duration = Date.now() - startTimeRef.current;

      // Clean up
      recordingRef.current = null;
      startTimeRef.current = null;

      if (!uri) {
        setError('No audio recorded');
        return null;
      }

      return { uri, duration };

    } catch (err) {
      setError(`Stop recording error: ${err.message}`);
      setIsRecording(false);
      recordingRef.current = null;
      return null;
    }
  }, []);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      startTimeRef.current = null;
    } catch (err) {
      // Ignore errors during cancel
      setIsRecording(false);
      recordingRef.current = null;
    }
  }, []);

  return {
    isRecording,
    hasPermission,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  };
}
