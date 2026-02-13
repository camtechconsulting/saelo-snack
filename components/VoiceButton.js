import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Mic, Square, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';
import { useVoice, VoiceState } from '../contexts/VoiceContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUGGESTIONS = [
  "Summarize week",
  "Any new invoices?",
  "Schedule review",
  "Check Sarah's email",
  "Pay AWS"
];

export default function VoiceButton({ position = 'right' }) {
  const {
    voiceState,
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    cancel,
    dismissError,
    hasPermission,
    requestPermission,
  } = useVoice();

  const [suggestionIndex, setSuggestionIndex] = React.useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimRef = useRef(null);

  const isLeft = position === 'left';
  const isIdle = voiceState === VoiceState.IDLE;
  const hasError = voiceState === VoiceState.ERROR;

  // Suggestion carousel animation (only when idle)
  useEffect(() => {
    let cycle;
    if (isIdle && !hasError) {
      const runSequence = () => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }).start(() => {
              setTimeout(() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
              }, 100);
            });
          }, 4500);
        });
      };

      const startTimeout = setTimeout(runSequence, 8000);
      cycle = setInterval(runSequence, 14000);

      return () => {
        clearInterval(cycle);
        clearTimeout(startTimeout);
      };
    }
  }, [isIdle, hasError, slideAnim]);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseAnimRef.current.start();
    } else {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
      }
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
      }
    };
  }, [isRecording, pulseAnim]);

  const handlePress = async () => {
    // If error state, dismiss and return to idle
    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      dismissError();
      return;
    }

    // If processing, ignore taps
    if (isProcessing) {
      return;
    }

    // Check permission first
    if (hasPermission === null || hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    // Toggle recording with haptic feedback
    if (isRecording) {
      // Stop recording - medium impact
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await stopRecording();
    } else {
      // Start recording - heavy impact for emphasis
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startRecording();
    }
  };

  const handleLongPress = () => {
    // Long press to cancel with error haptic
    if (isRecording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      cancel();
    }
  };

  const bubbleTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isLeft ? [20, -45] : [-20, 45],
  });

  const bubbleOpacity = slideAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, 1],
  });

  // Determine button style
  const getButtonStyle = () => {
    if (hasError) return styles.errorButton;
    if (isRecording) return styles.recordingButton;
    if (isProcessing) return styles.processingButton;
    return styles.idleButton;
  };

  // Determine icon
  const getIcon = () => {
    if (hasError) return <AlertCircle color="white" size={24} />;
    if (isRecording) return <Square color="white" size={24} fill="white" />;
    return <Mic color="white" size={28} />;
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.buttonWrapper} pointerEvents="box-none">

        {/* Suggestion bubble - only show when idle */}
        {isIdle && !hasError && (
          <Animated.View style={[
            styles.suggestionBubble,
            {
              opacity: bubbleOpacity,
              transform: [{ translateX: bubbleTranslateX }],
              [isLeft ? 'right' : 'left']: '50%',
            }
          ]}>
            <Text style={styles.suggestionText} numberOfLines={1}>
              {SUGGESTIONS[suggestionIndex]}
            </Text>
          </Animated.View>
        )}

        {/* Error message */}
        {hasError && error && (
          <View style={[
            styles.errorBubble,
            { [isLeft ? 'right' : 'left']: '50%' }
          ]}>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.9}
          style={styles.shadowWrapper}
          disabled={isProcessing}
        >
          <Animated.View style={[
            styles.button,
            { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
            getButtonStyle(),
          ]}>
            {getIcon()}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  buttonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  suggestionBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: -1,
    minWidth: 100,
  },
  suggestionText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(234, 67, 53, 0.95)',
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: -1,
    minWidth: 120,
    maxWidth: 200,
  },
  errorText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  shadowWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  idleButton: {
    backgroundColor: colors.primary,
  },
  recordingButton: {
    backgroundColor: colors.error,
  },
  processingButton: {
    backgroundColor: colors.secondary,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
});
