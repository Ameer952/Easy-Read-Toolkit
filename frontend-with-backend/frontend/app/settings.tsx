import React, { useEffect, useMemo, useState } from "react";
import {
   ScrollView,
   StyleSheet,
   Switch,
   TouchableOpacity,
   View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";

const STORAGE_KEY = "easyread.settings.v1";

type LineHeightOption = "Compact" | "Normal" | "Spacious";
type AlignmentOption = "Left" | "Center" | "Justify";

export default function SettingsScreen() {
   const { theme, themeMode, setThemeMode } = useTheme();
   const insets = useSafeAreaInsets();
   const router = useRouter();

   const [fontSize, setFontSize] = useState(16);
   const [lineHeight, setLineHeight] = useState<LineHeightOption>("Normal");
   const [textAlignment, setTextAlignment] = useState<AlignmentOption>("Left");
   const [notifications, setNotifications] = useState(true);
   const [autoDownload, setAutoDownload] = useState(false);
   const [wifiOnly, setWifiOnly] = useState(true);
   const [biometricAuth, setBiometricAuth] = useState(false);

   const lineHeightOptions = ["Compact", "Normal", "Spacious"] as const;
   const alignmentOptions = ["Left", "Center", "Justify"] as const;

   const styles = useMemo(
      () =>
         StyleSheet.create({
            container: { flex: 1, backgroundColor: Colors[theme].background },
            header: {
               paddingTop: insets.top + 5,
               paddingBottom: 20,
               paddingHorizontal: 20,
               backgroundColor: Colors[theme].headerBackground,
               flexDirection: "row",
               alignItems: "center",
            },
            backButton: { marginRight: 12, padding: 4 },
            headerTextContainer: { flexShrink: 1 },
            headerTitle: { fontSize: 26, fontWeight: "bold", color: "#fff" },
            headerSubtitle: {
               fontSize: 16,
               color: "#fff",
               opacity: 0.85,
               marginTop: 2,
            },
            scrollView: { flex: 1 },
            scrollContent: {
               paddingHorizontal: 20,
               paddingBottom: insets.bottom + 40,
            },
            section: { marginTop: 24, marginBottom: 16 },
            sectionTitle: {
               fontSize: 20,
               fontWeight: "bold",
               marginBottom: 16,
               color: Colors[theme].text,
            },
            settingItem: {
               flexDirection: "row",
               justifyContent: "space-between",
               alignItems: "center",
               paddingVertical: 16,
               borderBottomWidth: 1,
               borderBottomColor: Colors[theme].border,
            },
            settingLabel: { fontSize: 16, flex: 1, color: Colors[theme].text },
            fontSizeControls: {
               flexDirection: "row",
               alignItems: "center",
               gap: 12,
            },
            fontSizeButton: {
               width: 36,
               height: 36,
               borderRadius: 18,
               backgroundColor: Colors[theme].surface,
               justifyContent: "center",
               alignItems: "center",
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
            },
            fontSizeButtonText: {
               fontSize: 18,
               fontWeight: "bold",
               color: Colors[theme].text,
            },
            fontSizeDisplay: {
               fontSize: 16,
               fontWeight: "600",
               minWidth: 40,
               textAlign: "center",
               color: Colors[theme].text,
            },
            optionsContainer: {
               flexDirection: "row",
               gap: 8,
               flexWrap: "wrap",
            },
            optionButton: {
               paddingHorizontal: 12,
               paddingVertical: 6,
               borderRadius: 16,
               borderWidth: 1,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
            },
            optionButtonActive: {
               backgroundColor: Colors[theme].accent,
               borderColor: Colors[theme].accent,
            },
            optionButtonText: { fontSize: 14, color: Colors[theme].text },
            optionButtonTextActive: { color: "#fff" },
            previewBox: {
               backgroundColor: Colors[theme].surface,
               borderRadius: 12,
               padding: 16,
               borderWidth: 1,
               borderColor: Colors[theme].border,
               minHeight: 120,
               marginTop: 12,
            },
            previewText: { color: Colors[theme].text },
            // icon + label inside theme option
            themeOptionContent: {
               flexDirection: "row",
               alignItems: "center",
               gap: 6,
            },
         }),
      [theme, insets]
   );

   // Load saved settings
   useEffect(() => {
      (async () => {
         try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw);
            if (typeof s.fontSize === "number") setFontSize(s.fontSize);
            if (s.lineHeight) setLineHeight(s.lineHeight);
            if (s.textAlignment) setTextAlignment(s.textAlignment);
            if (typeof s.notifications === "boolean")
               setNotifications(s.notifications);
            if (typeof s.autoDownload === "boolean")
               setAutoDownload(s.autoDownload);
            if (typeof s.wifiOnly === "boolean") setWifiOnly(s.wifiOnly);
            if (typeof s.biometricAuth === "boolean")
               setBiometricAuth(s.biometricAuth);
         } catch {}
      })();
   }, []);

   // Persist settings
   useEffect(() => {
      const s = {
         fontSize,
         lineHeight,
         textAlignment,
         notifications,
         autoDownload,
         wifiOnly,
         biometricAuth,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
   }, [
      fontSize,
      lineHeight,
      textAlignment,
      notifications,
      autoDownload,
      wifiOnly,
      biometricAuth,
   ]);

   const previewStyles = useMemo(() => {
      const lh =
         lineHeight === "Compact" ? 1.2 : lineHeight === "Spacious" ? 1.8 : 1.5;
      const align = textAlignment.toLowerCase() as
         | "left"
         | "center"
         | "justify";
      return {
         fontSize,
         lineHeight: Math.round(fontSize * lh),
         textAlign: align,
      } as const;
   }, [fontSize, lineHeight, textAlignment]);

   return (
      <ThemedView style={styles.container}>
         {/* Header */}
         <ThemedView style={styles.header}>
            <TouchableOpacity
               onPress={() => router.back()}
               style={styles.backButton}
            >
               <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
               <ThemedText style={styles.headerTitle}>Settings</ThemedText>
               <ThemedText style={styles.headerSubtitle}>
                  Customize your reading experience
               </ThemedText>
            </View>
         </ThemedView>

         <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
         >
            {/* Reading Preferences */}
            <ThemedView style={styles.section}>
               <ThemedText style={styles.sectionTitle}>
                  Reading Preferences
               </ThemedText>

               {/* Font Size */}
               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>Font Size</ThemedText>
                  <ThemedView style={styles.fontSizeControls}>
                     <TouchableOpacity
                        style={styles.fontSizeButton}
                        onPress={() => setFontSize((v) => Math.max(12, v - 2))}
                     >
                        <ThemedText style={styles.fontSizeButtonText}>
                           -
                        </ThemedText>
                     </TouchableOpacity>
                     <ThemedText style={styles.fontSizeDisplay}>
                        {fontSize}px
                     </ThemedText>
                     <TouchableOpacity
                        style={styles.fontSizeButton}
                        onPress={() => setFontSize((v) => Math.min(24, v + 2))}
                     >
                        <ThemedText style={styles.fontSizeButtonText}>
                           +
                        </ThemedText>
                     </TouchableOpacity>
                  </ThemedView>
               </ThemedView>

               {/* Line Height */}
               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>
                     Line Height
                  </ThemedText>
                  <ThemedView style={styles.optionsContainer}>
                     {lineHeightOptions.map((option) => (
                        <TouchableOpacity
                           key={option}
                           style={[
                              styles.optionButton,
                              lineHeight === option &&
                                 styles.optionButtonActive,
                           ]}
                           onPress={() => setLineHeight(option)}
                        >
                           <ThemedText
                              style={[
                                 styles.optionButtonText,
                                 lineHeight === option &&
                                    styles.optionButtonTextActive,
                              ]}
                           >
                              {option}
                           </ThemedText>
                        </TouchableOpacity>
                     ))}
                  </ThemedView>
               </ThemedView>

               {/* Text Alignment */}
               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>
                     Text Alignment
                  </ThemedText>
                  <ThemedView style={styles.optionsContainer}>
                     {alignmentOptions.map((option) => (
                        <TouchableOpacity
                           key={option}
                           style={[
                              styles.optionButton,
                              textAlignment === option &&
                                 styles.optionButtonActive,
                           ]}
                           onPress={() => setTextAlignment(option)}
                        >
                           <ThemedText
                              style={[
                                 styles.optionButtonText,
                                 textAlignment === option &&
                                    styles.optionButtonTextActive,
                              ]}
                           >
                              {option}
                           </ThemedText>
                        </TouchableOpacity>
                     ))}
                  </ThemedView>
               </ThemedView>

               {/* Theme Mode – icon buttons */}
               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>Theme</ThemedText>
                  <ThemedView style={styles.optionsContainer}>
                     {[
                        {
                           label: "System",
                           value: "system" as const,
                           icon: "phone-portrait-outline" as const,
                        },
                        {
                           label: "Light",
                           value: "light" as const,
                           icon: "sunny-outline" as const,
                        },
                        {
                           label: "Dark",
                           value: "dark" as const,
                           icon: "moon-outline" as const,
                        },
                     ].map((opt) => {
                        const isActive = themeMode === opt.value;
                        return (
                           <TouchableOpacity
                              key={opt.value}
                              style={[
                                 styles.optionButton,
                                 isActive && styles.optionButtonActive,
                              ]}
                              onPress={() => setThemeMode(opt.value)}
                           >
                              <ThemedView style={styles.themeOptionContent}>
                                 <Ionicons
                                    name={opt.icon}
                                    size={16}
                                    color={
                                       isActive ? "#fff" : Colors[theme].icon
                                    }
                                 />
                                 <ThemedText
                                    style={[
                                       styles.optionButtonText,
                                       isActive &&
                                          styles.optionButtonTextActive,
                                    ]}
                                 >
                                    {opt.label}
                                 </ThemedText>
                              </ThemedView>
                           </TouchableOpacity>
                        );
                     })}
                  </ThemedView>
               </ThemedView>
            </ThemedView>

            {/* Reading Preview */}
            <ThemedView style={styles.section}>
               <ThemedText style={styles.sectionTitle}>
                  Reading Preview
               </ThemedText>
               <ThemedView style={styles.previewBox}>
                  <ThemedText style={[styles.previewText, previewStyles]}>
                     Easy Read makes dense text easier to read. Adjust settings
                     above to see changes here. {"\n\n"}This preview shows how
                     your text will appear with the current font size, line
                     height, and alignment settings.
                  </ThemedText>
               </ThemedView>
            </ThemedView>

            {/* App Settings */}
            <ThemedView style={styles.section}>
               <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>

               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>
                     Notifications
                  </ThemedText>
                  <Switch
                     value={notifications}
                     onValueChange={setNotifications}
                     trackColor={{
                        false: Colors[theme].border,
                        true: Colors[theme].accent,
                     }}
                     thumbColor={notifications ? "#fff" : Colors[theme].surface}
                  />
               </ThemedView>

               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>
                     Auto-download content
                  </ThemedText>
                  <Switch
                     value={autoDownload}
                     onValueChange={setAutoDownload}
                     trackColor={{
                        false: Colors[theme].border,
                        true: Colors[theme].accent,
                     }}
                     thumbColor={autoDownload ? "#fff" : Colors[theme].surface}
                  />
               </ThemedView>

               <ThemedView style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel}>
                     Wi-Fi only
                  </ThemedText>
                  <Switch
                     value={wifiOnly}
                     onValueChange={setWifiOnly}
                     trackColor={{
                        false: Colors[theme].border,
                        true: Colors[theme].accent,
                     }}
                     thumbColor={wifiOnly ? "#fff" : Colors[theme].surface}
                  />
               </ThemedView>
            </ThemedView>
         </ScrollView>
      </ThemedView>
   );
}
