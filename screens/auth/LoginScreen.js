import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import ThemeContent from '../../components/ThemeContent';

export default function LoginScreen({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoginError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      const userName = data.user?.user_metadata?.full_name || email.split('@')[0];
      onLoginSuccess(email.trim().toLowerCase(), userName);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setLoginError(err instanceof Error ? err.message : 'Ocurrió un error inesperado al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeContent>
    <SafeAreaView style={styles.authContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          
          {/* Contenedor principal de la tarjeta con margen superior para dejar espacio al icono flotante */}
          <View style={styles.cardWrapper}>
            
            {/* Logo Flotante Intersecado (icon.png) */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>

            <View style={styles.authCard}>
              
              {/* Título y subtítulo con el punto verde de la referencia */}
              <View style={styles.titleRow}>
                <Text style={styles.authTitle}>KRONOS</Text>
                <View style={styles.greenDot} />
              </View>
              <Text style={styles.authSubtitle}>Acceso a tu cuenta</Text>

              {/* Campo de Correo Electrónico */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#777"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setLoginError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Campo de Contraseña */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#777"
                  secureTextEntry
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setLoginError('');
                  }}
                />
              </View>

              {loginError ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {loginError}
                </Text>
              ) : null}

              {/* Botón Principal "Entrar" */}
              <TouchableOpacity 
                style={[styles.mainButton, loading && { opacity: 0.7 }]} 
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.mainButtonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
              </TouchableOpacity>

              {/* Enlace para ir al Registro */}
              <TouchableOpacity onPress={onSwitchToRegister} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  ¿No tienes cuenta? <Text style={styles.switchTextBold}>Regístrate</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>

        </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  authContainer: { 
    flex: 1, 
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: 40, // Espacio superior para acomodar la mitad del logo flotante
  },
  logoContainer: { 
    width: 72, 
    height: 72, 
    borderRadius: 20, 
    backgroundColor: '#141414', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'absolute',
    top: -36, // La mitad exacta del alto para lograr el corte flotante sobre la tarjeta
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  authCard: { 
    backgroundColor: '#141414', 
    paddingHorizontal: 24,
    paddingTop: 48, // Padding superior adicional para que el contenido no choque con el icono flotante
    paddingBottom: 32, 
    borderRadius: 30, 
    width: '100%', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#222',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  authTitle: { 
    color: '#ffffff', 
    fontSize: 26, 
    fontWeight: '900',
    letterSpacing: 1,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a3e635',
    marginLeft: 4,
    marginTop: 10,
  },
  authSubtitle: { 
    color: '#777777', 
    fontSize: 14, 
    marginBottom: 28,
    fontWeight: '500',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1c1c1c', 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#282828', 
    width: '100%', 
    paddingHorizontal: 16,
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    color: '#ffffff', 
    paddingVertical: 16, 
    fontSize: 15 
  },
  mainButton: { 
    backgroundColor: '#a3e635', 
    width: '100%', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 12,
  },
  mainButtonText: { 
    color: '#000000', 
    fontWeight: 'bold', 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  switchButton: { 
    marginTop: 22 
  },
  switchText: { 
    color: '#777777', 
    fontSize: 14 
  },
  switchTextBold: { 
    color: '#a3e635', 
    fontWeight: 'bold' 
  }
});