import React, { useState, useMemo, useRef } from "react";
import {
   StyleSheet,
   TextInput,
   TouchableOpacity,
   findNodeHandle,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterScreen() {
   const { theme } = useTheme();
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { register } = useAuth();

   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

   // modal state
   const [modalVisible, setModalVisible] = useState(false);
   const [modalTitle, setModalTitle] = useState("");
   const [modalMessage, setModalMessage] = useState("");

   // ---- Keyboard-aware refs (TS-safe) ----
   type KASVRef = {
      scrollToFocusedInput: (node: number, extraHeight?: number) => void;
      scrollToPosition?: (x: number, y: number, animated?: boolean) => void;
      scrollTo?: (opts: { x?: number; y?: number; animated?: boolean }) => void;
   };
   const scrollRef = useRef<KASVRef | null>(null);

   const nameRef = useRef<TextInput | null>(null);
   const emailRef = useRef<TextInput | null>(null);
   const passwordRef = useRef<TextInput | null>(null);
   const confirmRef = useRef<TextInput | null>(null);

   const focusScroll = (ref: React.RefObject<TextInput | null>, extra = 0) => {
      const node = ref.current ? findNodeHandle(ref.current) : null;
      if (node != null && scrollRef.current) {
         scrollRef.current.scrollToFocusedInput(node, extra);
      }
   };

   // Reset to top on screen focus
   const resetScroll = () => {
      const r = scrollRef.current;
      if (!r) return;
      if (typeof r.scrollToPosition === "function")
         r.scrollToPosition(0, 0, false);
      else if (typeof r.scrollTo === "function")
         r.scrollTo({ x: 0, y: 0, animated: false });
   };
   useFocusEffect(
      React.useCallback(() => {
         const id = setTimeout(resetScroll, 0);
         return () => clearTimeout(id);
      }, [])
   );

   const styles = useMemo(
      () =>
         StyleSheet.create({
            container: {
               flex: 1,
               backgroundColor: Colors[theme].background,
            },
            scrollContent: {
               paddingHorizontal: 24,
               flexGrow: 1,
            },
            logoContainer: {
               alignItems: "center",
               marginBottom: 40,
            },
            logoCircle: {
               width: 100,
               height: 100,
               borderRadius: 50,
               justifyContent: "center",
               alignItems: "center",
               marginBottom: 24,
               backgroundColor: Colors[theme].headerBackground,
            },
            appTitle: {
               fontSize: 28,
               fontWeight: "bold",
               marginBottom: 8,
               color: Colors[theme].text,
            },
            appSubtitle: {
               fontSize: 16,
               opacity: 0.7,
               textAlign: "center",
               color: Colors[theme].textSecondary,
            },
            formContainer: { marginTop: 20 },
            inputContainer: { marginBottom: 20 },
            inputLabel: {
               fontSize: 16,
               fontWeight: "600",
               marginBottom: 8,
               color: Colors[theme].text,
            },

            inputRow: {
               flexDirection: "row",
               alignItems: "center",
               borderWidth: 1,
               borderRadius: 12,
               paddingHorizontal: 12,
               backgroundColor: Colors[theme].surface,
               borderColor: Colors[theme].border,
            },
            inputField: {
               flex: 1,
               paddingVertical: 14,
               paddingHorizontal: 4,
               fontSize: 16,
               color: Colors[theme].text,
            },
            eyeButton: {
               minWidth: 44,
               minHeight: 44,
               alignItems: "center",
               justifyContent: "center",
               marginLeft: 4,
            },

            registerButton: {
               paddingVertical: 16,
               borderRadius: 12,
               alignItems: "center",
               marginTop: 8,
               marginBottom: 24,
               backgroundColor: Colors[theme].accent, // accent red
            },
            registerButtonText: {
               color: "#fff",
               fontSize: 18,
               fontWeight: "700",
            },
            buttonDisabled: { opacity: 0.5 },
            loginContainer: {
               flexDirection: "row",
               justifyContent: "center",
               alignItems: "center",
            },
            loginText: { fontSize: 16, color: Colors[theme].text },
            loginLink: {
               fontSize: 16,
               fontWeight: "700",
               color: Colors[theme].accent,
            },

            // modal styles
            modalOverlay: {
               position: "absolute",
               left: 0,
               right: 0,
               top: 0,
               bottom: 0,
               justifyContent: "center",
               alignItems: "center",
            },
            modalBackdrop: {
               position: "absolute",
               left: 0,
               right: 0,
               top: 0,
               bottom: 0,
               backgroundColor: "rgba(0,0,0,0.45)",
            },
            modalCard: {
               width: "86%",
               borderRadius: 18,
               paddingHorizontal: 18,
               paddingVertical: 16,
               borderWidth: 1,
            },
            modalTitle: {
               fontSize: 18,
               fontWeight: "700",
               marginBottom: 6,
            },
            modalBody: {
               fontSize: 14,
               lineHeight: 20,
               marginBottom: 14,
            },
            modalButtonRow: {
               flexDirection: "row",
               justifyContent: "flex-end",
               gap: 10,
            },
            modalButton: {
               paddingHorizontal: 14,
               paddingVertical: 9,
               borderRadius: 10,
               borderWidth: 1,
            },
            modalButtonText: {
               fontSize: 14,
               fontWeight: "600",
            },
         }),
      [theme]
   );

   const openModal = (title: string, message: string) => {
      setModalTitle(title);
      setModalMessage(message);
      setModalVisible(true);
   };

   const handleRegister = async () => {
      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
         openModal("Missing Details", "Please fill in all fields.");
         return;
      }
      if (password !== confirmPassword) {
         openModal("Password Mismatch", "Passwords do not match.");
         return;
      }
      if (password.length < 6) {
         openModal(
            "Weak Password",
            "Password must be at least 6 characters long."
         );
         return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
         openModal("Invalid Email", "Please enter a valid email address.");
         return;
      }

      setIsLoading(true);
      const success = await register(name, email, password);
      setIsLoading(false);

      if (success) {
         openModal("Success", "Account created successfully!");
      } else {
         openModal(
            "Registration Failed",
            "This email is already registered. Please use a different email or login."
         );
      }
   };

   return (
      <ThemedView style={styles.container}>
         <KeyboardAwareScrollView
            ref={scrollRef as any}
            contentOffset={{ x: 0, y: 0 }}
            enableOnAndroid
            enableAutomaticScroll
            enableResetScrollToCoords={false}
            keyboardOpeningTime={0}
            extraScrollHeight={96}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={[
               styles.scrollContent,
               {
                  paddingTop: insets.top + 80,
                  paddingBottom: insets.bottom + 24,
               },
            ]}
         >
            {/* Logo */}
            <ThemedView style={styles.logoContainer}>
               <ThemedView style={styles.logoCircle}>
                  <Ionicons name="person-add-outline" size={48} color="#fff" />
               </ThemedView>
               <ThemedText style={styles.appTitle}>Create Account</ThemedText>
               <ThemedText style={styles.appSubtitle}>
                  Join Easy Read Toolkit today
               </ThemedText>
            </ThemedView>

            {/* Register Form */}
            <ThemedView style={styles.formContainer}>
               {/* Full Name */}
               <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
                  <ThemedView style={styles.inputRow}>
                     <TextInput
                        ref={nameRef}
                        onFocus={() => focusScroll(nameRef)}
                        style={styles.inputField}
                        placeholder="Enter your full name"
                        placeholderTextColor={Colors[theme].placeholder}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                     />
                  </ThemedView>
               </ThemedView>

               {/* Email */}
               <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Email</ThemedText>
                  <ThemedView style={styles.inputRow}>
                     <TextInput
                        ref={emailRef}
                        onFocus={() => focusScroll(emailRef)}
                        style={styles.inputField}
                        placeholder="Enter your email"
                        placeholderTextColor={Colors[theme].placeholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                     />
                  </ThemedView>
               </ThemedView>

               {/* Password */}
               <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Password</ThemedText>
                  <ThemedView style={styles.inputRow}>
                     <TextInput
                        ref={passwordRef}
                        onFocus={() => focusScroll(passwordRef)}
                        style={styles.inputField}
                        placeholder="Create a password (min 6 characters)"
                        placeholderTextColor={Colors[theme].placeholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                     />
                     <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel={
                           showPassword ? "Hide password" : "Show password"
                        }
                     >
                        <Ionicons
                           name={showPassword ? "eye-off" : "eye"}
                           size={20}
                           color={Colors[theme].icon}
                        />
                     </TouchableOpacity>
                  </ThemedView>
               </ThemedView>

               {/* Confirm Password */}
               <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                     Confirm Password
                  </ThemedText>
                  <ThemedView style={styles.inputRow}>
                     <TextInput
                        ref={confirmRef}
                        onFocus={() => focusScroll(confirmRef, 140)}
                        style={styles.inputField}
                        placeholder="Re-enter your password"
                        placeholderTextColor={Colors[theme].placeholder}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                     />
                     <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel={
                           showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                        }
                     >
                        <Ionicons
                           name={showConfirmPassword ? "eye-off" : "eye"}
                           size={20}
                           color={Colors[theme].icon}
                        />
                     </TouchableOpacity>
                  </ThemedView>
               </ThemedView>

               <TouchableOpacity
                  style={[
                     styles.registerButton,
                     isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading}
               >
                  <ThemedText style={styles.registerButtonText}>
                     {isLoading ? "Creating Account..." : "Sign Up"}
                  </ThemedText>
               </TouchableOpacity>

               <ThemedView style={styles.loginContainer}>
                  <ThemedText style={styles.loginText}>
                     Already have an account?{" "}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.back()}>
                     <ThemedText style={styles.loginLink}>Login</ThemedText>
                  </TouchableOpacity>
               </ThemedView>
            </ThemedView>
         </KeyboardAwareScrollView>

         {/* Themed modal */}
         {modalVisible && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setModalVisible(false)}
               />
               <ThemedView
                  style={[
                     styles.modalCard,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     {modalTitle}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalBody,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {modalMessage}
                  </ThemedText>

                  <ThemedView style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           {
                              borderColor: Colors[theme].accent,
                              backgroundColor: Colors[theme].accent,
                           },
                        ]}
                        onPress={() => setModalVisible(false)}
                     >
                        <ThemedText
                           style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                           OK
                        </ThemedText>
                     </TouchableOpacity>
                  </ThemedView>
               </ThemedView>
            </ThemedView>
         )}
      </ThemedView>
   );
}
