import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function RegisterScreen({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    setLoading(true);

    try {
      // Registramos al usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
          }
        }
      });

      if (error) {
        Alert.alert('Error de Registro', error.message);
        setLoading(false);
        return;
      }

      Alert.alert('¡Cuenta creada!', 'Te has registrado exitosamente en la nube de kronos.');
      onRegisterSuccess(email.trim().toLowerCase(), name.trim());
    } catch (err) {
      console.error('Error inesperado al registrarse:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, justifyContent: 'center', width: '100%' }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={styles.authCard}>
              
              <View style={styles.logoContainer}>
                <Ionicons name="person-add-outline" size={34} color="#a3e635" />
              </View>

              <Text style={styles.authTitle}>Crear Cuenta</Text>
              <Text style={styles.authSubtitle}>Comienza a gestionar tus finanzas</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor="#888"
                  value={name}
                  onChangeText={setName}
                />
              </View>

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
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.mainButtonText}>{loading ? 'Registrando...' : 'Registrarse'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onSwitchToLogin} style={styles.switchButton}>
                <Text style={styles.switchText}>¿Ya tienes cuenta? <Text style={styles.switchTextBold}>Inicia sesión</Text></Text>
              </TouchableOpacity>

            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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