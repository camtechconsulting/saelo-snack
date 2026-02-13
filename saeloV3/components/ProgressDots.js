import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export default function ProgressDots({ total = 7, current = 0, onGoTo }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onGoTo && onGoTo(i)}
          disabled={!onGoTo}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          style={[
            styles.dot,
            i === current ? styles.activeDot : styles.inactiveDot,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: colors.border,
  },
});
