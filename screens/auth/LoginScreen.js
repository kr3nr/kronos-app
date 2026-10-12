import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase'; // Importamos el cliente de Supabase
import ScreenWrapper from '../../components/ScreenWrapper';

export default function LoginScreen({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // Validamos el inicio de sesión real con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        Alert.alert('Acceso Denegado', 'Correo o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      // Obtenemos el nombre del usuario desde los metadatos o usamos el correo por defecto
      const userName = data.user?.user_metadata?.full_name || email.split('@')[0];

      onLoginSuccess(email.trim().toLowerCase(), userName);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <View style={{ flex: 1, justifyContent: 'center', width: '100%' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={styles.authCard}>
            
            <View style={styles.logoContainer}>
              <Ionicons name="wallet-outline" size={36} color="#a3e635" />
            </View>

            <Text style={styles.authTitle}>Control Financiero</Text>
            <Text style={styles.authSubtitle}>Acceso a tu cuenta</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity 
              style={[styles.mainButton, loading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.mainButtonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSwitchToRegister} style={styles.switchButton}>
              <Text style={styles.switchText}>¿No tienes cuenta? <Text style={styles.switchTextBold}>Regístrate</Text></Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#000' },
  authCard: { backgroundColor: '#1a1a1a', padding: 25, borderRadius: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  logoContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  authTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  authSubtitle: { color: '#888', fontSize: 13, marginBottom: 25 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#333', width: '100%', paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 14, fontSize: 15 },
  mainButton: { backgroundColor: '#a3e635', width: '100%', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  mainButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 18 },
  switchText: { color: '#888', fontSize: 13 },
  switchTextBold: { color: '#a3e635', fontWeight: 'bold' }
});