import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function ScreenWrapper({ children, scrollable = true, style }) {
  if (scrollable) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.scrollContent, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 16, //
    paddingVertical: 15,
    paddingBottom: 30,
    flexGrow: 1,
  },
});