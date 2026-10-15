import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { LIGHT_PALETTE, adaptStyleForLightTheme } from '../services/themeStyles';
import { useAppTheme } from './ThemeContext';

export default function ScreenWrapper({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  keyboardAware = true,
  dismissKeyboardOnTap = true,
  keyboardVerticalOffset = 0,
  ...scrollViewProps
}) {
  const colorScheme = useAppTheme();
  const lightTheme = colorScheme === 'light';
  const containerStyle = lightTheme ? [styles.container, { backgroundColor: LIGHT_PALETTE.background }] : styles.container;
  const themedStyle = lightTheme ? adaptStyleForLightTheme(style) : style;
  const themedContentContainerStyle = lightTheme
    ? adaptStyleForLightTheme(contentContainerStyle)
    : contentContainerStyle;

  if (scrollable) {
    const scrollView = (
      <ScrollView
        {...scrollViewProps}
        contentContainerStyle={[styles.scrollContent, themedStyle, themedContentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    );

    return (
      <SafeAreaView style={containerStyle}>
        {keyboardAware && Platform.OS !== 'web' && !scrollViewProps.horizontal ? (
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {scrollView}
          </KeyboardAvoidingView>
        ) : scrollView}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[containerStyle, themedStyle]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoiding: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingBottom: 30,
    flexGrow: 1,
  },
});
