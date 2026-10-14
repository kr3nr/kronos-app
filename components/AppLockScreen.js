import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_PALETTE } from '../services/themeStyles';
import { authenticateBiometric, verifyLocalPin } from '../services/localSecurity';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'biometric', '0', 'delete'];

export default function AppLockScreen({ userId, biometricEnabled, isLight, loading, loadingError, onRetry, onUnlock, onLogout }) {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(0);
  const [logoutError, setLogoutError] = useState('');
  const theme = isLight
    ? { background: LIGHT_PALETTE.background, surface: LIGHT_PALETTE.surface, border: LIGHT_PALETTE.border, text: LIGHT_PALETTE.text, muted: LIGHT_PALETTE.muted, accent: LIGHT_PALETTE.accent }
    : { background: '#000', surface: '#171717', border: '#2a2a2a', text: '#fff', muted: '#999', accent: '#a3e635' };

  useEffect(() => {
    if (retryAfterMs <= 0) return undefined;
    const deadline = Date.now() + retryAfterMs;
    const interval = setInterval(() => setRetryAfterMs(Math.max(0, deadline - Date.now())), 250);
    return () => clearInterval(interval);
  }, [retryAfterMs]);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await onLogout();
    } catch (error) {
      console.error('Error al cerrar sesión desde la pantalla de bloqueo:', error);
      setLogoutError('No se pudo cerrar sesión. Comprueba tu conexión e inténtalo de nuevo.');
    }
  };

  const handlePin = async (value) => {
    if (busy || retryAfterMs > 0 || pin.length >= 6) return;
    const nextPin = `${pin}${value}`;
    setPin(nextPin);
    setErrorMessage('');
    if (nextPin.length !== 6) return;

    setBusy(true);
    try {
      const result = await verifyLocalPin(userId, nextPin);
      if (result.success) {
        onUnlock();
      } else {
        setPin('');
        setRetryAfterMs(result.retryAfterMs);
        setErrorMessage(result.retryAfterMs ? 'Demasiados intentos. Espera 30 segundos o usa biometría.' : 'PIN incorrecto. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error al verificar el PIN local:', error);
      setPin('');
      setErrorMessage('No se pudo verificar el PIN. Inténtalo nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  const handleBiometric = async () => {
    if (!biometricEnabled || busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      const result = await authenticateBiometric();
      if (result.success) onUnlock();
      else if (result.error !== 'user_cancel' && result.error !== 'system_cancel' && result.error !== 'app_cancel') {
        setErrorMessage('No se pudo verificar la biometría. Puedes usar tu PIN.');
      }
    } catch (error) {
      console.error('Error al autenticar con biometría:', error);
      setErrorMessage('No se pudo iniciar la verificación biométrica. Usa tu PIN.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.brandIcon, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name={loadingError ? 'alert-circle-outline' : 'lock-closed-outline'} size={30} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{loadingError ? 'Bloqueo seguro' : loading ? 'Preparando acceso seguro' : 'Kronos está bloqueado'}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {loadingError ? 'No pudimos comprobar la configuración de seguridad local.' : loading ? 'Cargando la configuración de este dispositivo.' : 'Ingresa tu PIN de 6 dígitos para continuar.'}
        </Text>

        {loading ? (
          <ActivityIndicator color="#a3e635" style={styles.loadingIndicator} />
        ) : loadingError ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryLabel}>Reintentar</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.dots} accessibilityLabel={`${pin.length} de 6 dígitos ingresados`}>
              {Array.from({ length: 6 }, (_, index) => (
                <View key={index} style={[styles.dot, { borderColor: theme.border }, index < pin.length && { backgroundColor: theme.accent, borderColor: theme.accent }]} />
              ))}
            </View>
            <Text style={[styles.error, { opacity: errorMessage ? 1 : 0 }]}>{errorMessage || ' '}</Text>
            {retryAfterMs > 0 && <Text style={styles.error}>Intenta de nuevo en {Math.ceil(retryAfterMs / 1000)} s</Text>}
            {busy && <ActivityIndicator color={theme.accent} style={styles.spinner} />}
            <View style={styles.keypad}>
              {KEYPAD.map((key) => {
                if (key === 'biometric' && (Platform.OS === 'web' || !biometricEnabled)) {
                  return <View key={key} style={styles.keySpacer} />;
                }
                if (key === 'biometric') {
                  return (
                    <TouchableOpacity key={key} style={[styles.key, { backgroundColor: theme.surface }]} onPress={handleBiometric} disabled={busy}>
                      <Ionicons name="finger-print-outline" size={26} color={theme.accent} />
                    </TouchableOpacity>
                  );
                }
                if (key === 'delete') {
                  return (
                    <TouchableOpacity key={key} style={[styles.key, { backgroundColor: theme.surface }]} onPress={() => setPin(current => current.slice(0, -1))} disabled={busy}>
                      <Ionicons name="backspace-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity key={key} style={[styles.key, { backgroundColor: theme.surface }]} onPress={() => handlePin(key)} disabled={busy || retryAfterMs > 0}>
                    <Text style={[styles.keyLabel, { color: theme.text }]}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        {!!logoutError && <Text style={styles.error}>{logoutError}</Text>}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={[styles.logoutLabel, { color: theme.muted }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  brandIcon: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 290 },
  dots: { flexDirection: 'row', gap: 12, marginTop: 30, marginBottom: 4 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  error: { color: '#f87171', minHeight: 36, fontSize: 12, textAlign: 'center', marginTop: 7 },
  spinner: { marginTop: 2, marginBottom: 5 },
  loadingIndicator: { marginTop: 24 },
  keypad: { width: 264, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  key: { width: 78, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  keyLabel: { fontSize: 22, fontWeight: '600' },
  keySpacer: { width: 78, height: 58 },
  retryButton: { backgroundColor: '#a3e635', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 22 },
  retryLabel: { color: '#101710', fontSize: 14, fontWeight: '700' },
  logoutButton: { padding: 14, marginTop: 15 },
  logoutLabel: { fontSize: 13, fontWeight: '600' },
});
