import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      // Navigation will happen automatically via auth state change
    } else {
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Icon */}
          <ThemedView style={styles.logoContainer}>
            <ThemedView
              style={[styles.logoCircle, { backgroundColor: Colors[theme].headerBackground }]}
            >
              <IconSymbol name="book.fill" size={48} color="#fff" />
            </ThemedView>
            <ThemedText style={styles.appTitle}>Easy Read Toolkit</ThemedText>
            <ThemedText style={styles.appSubtitle}>Making reading easier for everyone</ThemedText>
          </ThemedView>

          {/* Login Form */}
          <ThemedView style={styles.formContainer}>
            <ThemedText style={styles.formTitle}>Welcome Back!</ThemedText>
            <ThemedText style={styles.formSubtitle}>Login to continue</ThemedText>

            {/* Email Input */}
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: '#E5E5E5' },
                ]}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>

            {/* Password Input */}
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: '#E5E5E5' },
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </ThemedView>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: Colors[theme].headerBackground },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </ThemedText>
            </TouchableOpacity>

            {/* Register Link */}
            <ThemedView style={styles.registerContainer}>
              <ThemedText style={styles.registerText}>Don't have an account? </ThemedText>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <ThemedText style={[styles.registerLink, { color: Colors[theme].accent }]}>
                  Sign Up
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  formContainer: {
    marginTop: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: '#000',
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: '700',
  },
});

