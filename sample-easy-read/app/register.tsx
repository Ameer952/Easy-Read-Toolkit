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

export default function RegisterScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const success = await register(name, email, password);
    setIsLoading(false);

    if (success) {
      Alert.alert('Success', 'Account created successfully! Welcome to Easy Read Toolkit.');
      // Navigation will happen automatically via auth state change
    } else {
      Alert.alert('Registration Failed', 'This email is already registered. Please use a different email or login.');
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
              <IconSymbol name="person.badge.plus" size={48} color="#fff" />
            </ThemedView>
            <ThemedText style={styles.appTitle}>Create Account</ThemedText>
            <ThemedText style={styles.appSubtitle}>Join Easy Read Toolkit today</ThemedText>
          </ThemedView>

          {/* Register Form */}
          <ThemedView style={styles.formContainer}>
            {/* Name Input */}
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: '#E5E5E5' },
                ]}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </ThemedView>

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
                placeholder="Create a password (min 6 characters)"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </ThemedView>

            {/* Confirm Password Input */}
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: '#E5E5E5' },
                ]}
                placeholder="Re-enter your password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </ThemedView>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: Colors[theme].headerBackground },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <ThemedText style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </ThemedText>
            </TouchableOpacity>

            {/* Login Link */}
            <ThemedView style={styles.loginContainer}>
              <ThemedText style={styles.loginText}>Already have an account? </ThemedText>
              <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={[styles.loginLink, { color: Colors[theme].accent }]}>
                  Login
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
    marginBottom: 40,
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
  registerButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '700',
  },
});

