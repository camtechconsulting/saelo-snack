// Typography styles — Playfair Display for headings, system font for body
export const fonts = {
  heading: 'PlayfairDisplay_700Bold',
  body: undefined, // system font
};

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Font weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Text styles (commonly used combinations)
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 38,
  },

  heading2: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 32,
  },

  heading3: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 28,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },

  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },

  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  button: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 24,
  },

  buttonSmall: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 20,
  },
};
