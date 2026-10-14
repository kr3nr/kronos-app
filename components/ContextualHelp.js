import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './ThemeContext';
import { LIGHT_PALETTE } from '../services/themeStyles';

export default function ContextualHelp({ title = 'Ayuda rápida', tips = [] }) {
  const [visible, setVisible] = useState(false);
  const isLight = useAppTheme() === 'light';

  return (
    <View style={styles.anchor}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Mostrar ayuda de esta pantalla"
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(current => !current)}
        style={[
          styles.button,
          isLight && styles.lightButton,
          visible && styles.activeButton,
        ]}
        activeOpacity={0.75}
      >
        <Ionicons name={visible ? 'close' : 'help-outline'} size={18} color={visible ? '#000' : (isLight ? LIGHT_PALETTE.text : '#fff')} />
      </TouchableOpacity>

      {visible && (
        <View style={[styles.card, isLight && styles.lightCard]}>
          <View style={styles.heading}>
            <Ionicons name="information-circle-outline" size={17} color="#a3e635" />
            <Text style={[styles.title, isLight && styles.lightText]} numberOfLines={2}>{title}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar ayuda"
              onPress={() => setVisible(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={17} color={isLight ? LIGHT_PALETTE.muted : '#999'} />
            </TouchableOpacity>
          </View>
          {tips.map((tip, index) => (
            <View key={`${index}-${tip}`} style={styles.tipRow}>
              <View style={styles.bullet} />
              <Text style={[styles.tip, isLight && styles.lightTip]}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative', zIndex: 1000 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  lightButton: { backgroundColor: LIGHT_PALETTE.elevated, borderColor: LIGHT_PALETTE.border },
  activeButton: { backgroundColor: '#a3e635', borderColor: '#a3e635' },
  card: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 280,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#202326',
    borderWidth: 1,
    borderColor: '#3a4145',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
    zIndex: 1001,
  },
  lightCard: { backgroundColor: LIGHT_PALETTE.surface, borderColor: LIGHT_PALETTE.border },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  title: { flex: 1, color: '#f3f4f6', fontSize: 12, fontWeight: '700' },
  lightText: { color: LIGHT_PALETTE.text },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#a3e635', marginTop: 5, marginRight: 8 },
  tip: { flex: 1, color: '#c4c9cc', fontSize: 11, lineHeight: 15 },
  lightTip: { color: LIGHT_PALETTE.muted },
});
