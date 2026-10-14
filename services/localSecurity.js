import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY_PREFIX = 'kronos.local-security.';

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

async function read(userId) {
  const key = storageKey(userId);
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(key)
    : await SecureStore.getItemAsync(key);
  return value ? JSON.parse(value) : { pinHash: null, pinSalt: null, biometricEnabled: false, failedAttempts: 0, lockedUntil: 0 };
}

async function write(userId, config) {
  const key = storageKey(userId);
  const value = JSON.stringify(config);
  if (Platform.OS === 'web') {
    if (!globalThis.localStorage) throw new Error('El almacenamiento local no está disponible en este navegador.');
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

function randomSalt() {
  return Array.from(Crypto.getRandomBytes(16), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin, salt) {
  if (Platform.OS === 'web' && globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const derived = await globalThis.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 150_000,
      hash: 'SHA-256',
    }, key, 256);
    return Array.from(new Uint8Array(derived), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function getLocalSecurity(userId) {
  if (!userId) return { pinHash: null, pinSalt: null, biometricEnabled: false };
  return read(userId);
}

export async function saveLocalPin(userId, pin) {
  if (!userId) throw new Error('No hay una cuenta activa para configurar el bloqueo.');
  if (!/^\d{6}$/.test(pin)) throw new Error('El PIN debe contener exactamente 6 dígitos.');
  const current = await read(userId);
  const pinSalt = randomSalt();
  const pinHash = await hashPin(pin, pinSalt);
  const updated = { ...current, pinSalt, pinHash, failedAttempts: 0, lockedUntil: 0 };
  await write(userId, updated);
  return updated;
}

export async function verifyLocalPin(userId, pin) {
  const config = await read(userId);
  if (!config.pinHash || !config.pinSalt) return { success: false, retryAfterMs: 0 };
  const now = Date.now();
  if (config.lockedUntil > now) return { success: false, retryAfterMs: config.lockedUntil - now };
  const success = (await hashPin(pin, config.pinSalt)) === config.pinHash;
  if (success) {
    if (config.failedAttempts || config.lockedUntil) await write(userId, { ...config, failedAttempts: 0, lockedUntil: 0 });
    return { success: true, retryAfterMs: 0 };
  }
  const failedAttempts = (config.failedAttempts || 0) + 1;
  const lockDuration = failedAttempts < 5
    ? 0
    : Math.min(30_000 * (2 ** Math.floor((failedAttempts - 5) / 5)), 60 * 60 * 1000);
  const lockedUntil = lockDuration ? now + lockDuration : 0;
  await write(userId, { ...config, failedAttempts, lockedUntil });
  return { success: false, retryAfterMs: lockDuration };
}

export async function removeLocalPin(userId) {
  if (!userId) throw new Error('No hay una cuenta activa para actualizar el bloqueo.');
  const current = await read(userId);
  const updated = { pinHash: null, pinSalt: null, biometricEnabled: false, failedAttempts: 0, lockedUntil: 0 };
  await write(userId, updated);
  return { ...current, ...updated };
}

export async function setLocalBiometricEnabled(userId, enabled) {
  if (!userId) throw new Error('No hay una cuenta activa para actualizar el bloqueo.');
  const current = await read(userId);
  if (enabled && (!current.pinHash || !current.pinSalt)) {
    throw new Error('Configura primero un PIN para tener un método alternativo de desbloqueo.');
  }
  const updated = { ...current, biometricEnabled: Boolean(enabled) };
  await write(userId, updated);
  return updated;
}

export async function canUseBiometrics() {
  if (Platform.OS === 'web') return false;
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function authenticateBiometric() {
  if (Platform.OS === 'web') return { success: false, error: 'not_available' };
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Kronos',
    cancelLabel: 'Usar PIN',
    disableDeviceFallback: true,
  });
}
