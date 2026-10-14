import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dismissAppAlert, getCurrentAppAlert, subscribeToAppAlerts } from '../services/appAlert';
import ThemedModal from './ThemedModal';

const getNotificationType = (title) => {
  const value = title.toLowerCase();
  if (value.includes('error') || value.includes('fall')) return 'error';
  if (value.includes('éxito') || value.includes('exito') || value.includes('correct')) return 'success';
  if (value.includes('atención') || value.includes('atencion') || value.includes('aviso') || value.includes('requerid')) return 'warning';
  return 'info';
};

const TYPE_STYLES = {
  error: { icon: 'close-circle', color: '#f87171' },
  success: { icon: 'checkmark-circle', color: '#a3e635' },
  warning: { icon: 'alert-circle', color: '#fbbf24' },
  info: { icon: 'information-circle', color: '#38bdf8' },
};

export default function AppNotificationHost() {
  const [notification, setNotification] = useState(getCurrentAppAlert);

  useEffect(() => subscribeToAppAlerts(() => setNotification(getCurrentAppAlert())), []);

  const close = (button) => {
    dismissAppAlert();
    button?.onPress?.();
  };

  const handleRequestClose = () => {
    if (!notification?.cancelable) return;
    const cancelButton = notification.buttons.find((button) => button.style === 'cancel');
    close(cancelButton);
  };

  if (!notification) return null;

  const type = TYPE_STYLES[getNotificationType(notification.title)];
  const buttons = notification.buttons;

  return (
    <ThemedModal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityLabel={[notification.title, notification.message].filter(Boolean).join('. ')}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${type.color}1A` }]}>
            <Ionicons name={type.icon} size={25} color={type.color} />
          </View>
          {!!notification.title && <Text style={styles.title}>{notification.title}</Text>}
          {!!notification.message && <Text style={styles.message}>{notification.message}</Text>}
          <View style={[styles.actions, buttons.length > 2 && styles.actionsStacked]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isPrimary = !isCancel && (buttons.length === 1 || index === buttons.length - 1);
              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[
                    styles.actionButton,
                    buttons.length > 2 && styles.actionButtonStacked,
                    isPrimary && !isDestructive && styles.primaryButton,
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                  ]}
                  onPress={() => close(button)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={[
                    styles.actionText,
                    isPrimary && !isDestructive && styles.primaryText,
                    isDestructive && styles.destructiveText,
                    isCancel && styles.cancelText,
                  ]}>
                    {button.text || 'Entendido'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : 380,
    backgroundColor: '#171719',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  message: { color: '#b8b8bd', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  actions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionsStacked: { flexDirection: 'column-reverse' },
  actionButton: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: '#29292d' },
  actionButtonStacked: { flex: 0, width: '100%' },
  primaryButton: { backgroundColor: '#a3e635' },
  destructiveButton: { backgroundColor: 'rgba(248,113,113,0.14)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.28)' },
  cancelButton: { backgroundColor: '#242428' },
  actionText: { color: '#e5e5e7', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  primaryText: { color: '#111' },
  destructiveText: { color: '#fca5a5' },
  cancelText: { color: '#d4d4d8' },
});
