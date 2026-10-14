import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { LIGHT_PALETTE, adaptStyleForLightTheme, adaptTreeForLightTheme } from '../services/themeStyles';
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
  const themedChildren = lightTheme ? adaptTreeForLightTheme(children, React) : children;
  const containerStyle = lightTheme ? [styles.container, { backgroundColor: LIGHT_PALETTE.background }] : styles.container;
  const themedStyle = lightTheme ? adaptStyleForLightTheme(style) : style;
  const themedContentContainerStyle = lightTheme
    ? adaptStyleForLightTheme(contentContainerStyle)
    : contentContainerStyle;
  const dismissibleChildren = dismissKeyboardOnTap && Platform.OS !== 'web' ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.dismissibleContent}>{themedChildren}</View>
    </TouchableWithoutFeedback>
  ) : themedChildren;

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
        {dismissibleChildren}
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
      {themedChildren}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoiding: { flex: 1 },
  dismissibleContent: { flexGrow: 1 },
  scrollContent: {
    paddingHorizontal: 16, //
    paddingVertical: 15,
    paddingBottom: 30,
    flexGrow: 1,
  },
});