import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

/**
 * ProcessingShimmer - Full-screen shimmer overlay shown while processing voice
 *
 * Creates an ambient "thinking" glow effect similar to LLM interfaces
 */
export default function ProcessingShimmer({ visible }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Shimmer animation - moves gradient across screen
      const shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      shimmerLoop.start();

      // Pulse animation - breathing effect
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => {
        shimmerLoop.stop();
        pulseLoop.stop();
      };
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, shimmerAnim, pulseAnim, fadeAnim]);

  if (!visible) return null;

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Shimmer effect */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity: pulseAnim,
          },
        ]}
      />

      {/* Glow rings at center */}
      <View style={styles.glowContainer}>
        <Animated.View style={[styles.glowRing, styles.glowRingOuter, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.glowRing, styles.glowRingMiddle, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.glowRing, styles.glowRingInner, { opacity: pulseAnim }]} />
      </View>

      {/* Processing text */}
      <View style={styles.textContainer}>
        <Text style={styles.processingText}>Processing...</Text>
        <Text style={styles.subText}>Understanding your request</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  shimmer: {
    position: 'absolute',
    width: width * 0.5,
    height: height * 2,
    backgroundColor: colors.primary,
    opacity: 0.1,
    transform: [{ rotate: '15deg' }],
  },
  glowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  glowRingOuter: {
    width: 200,
    height: 200,
    borderColor: colors.primary,
    opacity: 0.2,
  },
  glowRingMiddle: {
    width: 140,
    height: 140,
    borderColor: colors.primary,
    opacity: 0.4,
  },
  glowRingInner: {
    width: 80,
    height: 80,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
    opacity: 0.6,
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.25,
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});
