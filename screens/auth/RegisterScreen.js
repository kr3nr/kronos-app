import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import ThemeContent from '../../components/ThemeContent';

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

      Alert.alert('¡Cuenta creada!', 'Te has registrado exitosamente en la nube de Kronos.');
      onRegisterSuccess(email.trim().toLowerCase(), name.trim());
    } catch (err) {
      console.error('Error inesperado al registrarse:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado al conectar con Supabase.');
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
        <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          
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
              
              {/* Título y subtítulo idénticos al Login */}
              <View style={styles.titleRow}>
                <Text style={styles.authTitle}>KRONOS</Text>
                <View style={styles.greenDot} />
              </View>
              <Text style={styles.authSubtitle}>Crea tu cuenta nueva</Text>

              {/* Campo de Nombre Completo */}
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor="#777"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Campo de Correo Electrónico */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#777"
                  value={email}
                  onChangeText={setEmail}
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
                  onChangeText={setPassword}
                />
              </View>

              {/* Botón Principal "Registrarse" */}
              <TouchableOpacity 
                style={[styles.mainButton, loading && { opacity: 0.7 }]} 
                onPress={handleRegister}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.mainButtonText}>{loading ? 'Registrando...' : 'Registrarse'}</Text>
              </TouchableOpacity>

              {/* Enlace para volver al Login */}
              <TouchableOpacity onPress={onSwitchToLogin} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  ¿Ya tienes cuenta? <Text style={styles.switchTextBold}>Inicia sesión</Text>
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
    top: -36, // El corte exacto sobre la tarjeta principal
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
    paddingTop: 48, // Espacio interno superior para el título
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