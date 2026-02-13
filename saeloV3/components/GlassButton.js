import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { colors } from '../styles/colors';

export default function GlassButton({ title, onPress, variant = 'gold', disabled = false, shimmer = false, style }) {
  const isGold = variant === 'gold';
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer) return;
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // Shimmer opacity pulses the entire button surface
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 0],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        isGold ? styles.goldButton : styles.glassButton,
        disabled && styles.disabled,
        style,
      ]}
    >
      {shimmer && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: shimmerOpacity, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 16 },
          ]}
          pointerEvents="none"
        />
      )}
      <Text
        style={[
          styles.text,
          isGold ? styles.goldText : styles.glassText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(59, 56, 49, 0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(59, 56, 49, 0.15)',
      },
    }),
  },
  goldButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  glassButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(221, 213, 200, 0.5)',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  goldText: {
    color: colors.textOnPrimary,
  },
  glassText: {
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
  disabledText: {
    color: colors.textDisabled,
  },
});
