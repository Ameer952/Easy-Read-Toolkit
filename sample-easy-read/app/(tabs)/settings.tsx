import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

const STORAGE_KEY = 'easyread.settings.v1';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState('Normal');
  const [textAlignment, setTextAlignment] = useState('Left');
  const [notifications, setNotifications] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const lineHeightOptions = ['Compact', 'Normal', 'Spacious'];
  const alignmentOptions = ['Left', 'Center', 'Justify'];

  // Load saved settings
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const s = JSON.parse(raw) as any;
          if (typeof s.fontSize === 'number') setFontSize(s.fontSize);
          if (typeof s.lineHeight === 'string') setLineHeight(s.lineHeight);
          if (typeof s.textAlignment === 'string') setTextAlignment(s.textAlignment);
          if (typeof s.notifications === 'boolean') setNotifications(s.notifications);
          if (typeof s.autoDownload === 'boolean') setAutoDownload(s.autoDownload);
          if (typeof s.wifiOnly === 'boolean') setWifiOnly(s.wifiOnly);
          if (typeof s.biometricAuth === 'boolean') setBiometricAuth(s.biometricAuth);
        }
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
  }, [fontSize, lineHeight, textAlignment, notifications, autoDownload, wifiOnly, biometricAuth]);

  // Live preview computed styles
  const previewStyles = useMemo(() => {
    const lhFactor = lineHeight === 'Compact' ? 1.2 : lineHeight === 'Spacious' ? 1.8 : 1.5;
    const align = (textAlignment.toLowerCase() as 'left' | 'center' | 'justify');
    return {
      fontSize,
      lineHeight: fontSize * lhFactor,
      textAlign: align,
    } as const;
  }, [fontSize, lineHeight, textAlignment]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { backgroundColor: Colors[theme].headerBackground, paddingTop: insets.top + 12 }]}>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Customize your reading experience</ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Reading Preferences */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Reading Preferences</ThemedText>
          
          {/* Font Size */}
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Font Size</ThemedText>
            <ThemedView style={styles.fontSizeControls}>
              <TouchableOpacity 
                style={styles.fontSizeButton}
                onPress={() => setFontSize(Math.max(12, fontSize - 2))}
              >
                <ThemedText style={styles.fontSizeButtonText}>-</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.fontSizeDisplay}>{fontSize}px</ThemedText>
              <TouchableOpacity 
                style={styles.fontSizeButton}
                onPress={() => setFontSize(Math.min(24, fontSize + 2))}
              >
                <ThemedText style={styles.fontSizeButtonText}>+</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Line Height */}
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Line Height</ThemedText>
            <ThemedView style={styles.optionsContainer}>
              {lineHeightOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    lineHeight === option && styles.optionButtonActive
                  ]}
                  onPress={() => setLineHeight(option)}
                >
                  <ThemedText style={[
                    styles.optionButtonText,
                    lineHeight === option && styles.optionButtonTextActive
                  ]}>
                    {option}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>

          {/* Text Alignment */}
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Text Alignment</ThemedText>
            <ThemedView style={styles.optionsContainer}>
              {alignmentOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    textAlignment === option && styles.optionButtonActive
                  ]}
                  onPress={() => setTextAlignment(option)}
                >
                  <ThemedText style={[
                    styles.optionButtonText,
                    textAlignment === option && styles.optionButtonTextActive
                  ]}>
                    {option}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>

          {/* Theme Toggle */}
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={(isDark) => setThemeMode(isDark ? 'dark' : 'light')}
              trackColor={{ false: '#767577', true: Colors[theme].accent }}
              thumbColor={themeMode === 'dark' ? '#fff' : '#f4f3f4'}
            />
          </ThemedView>
        </ThemedView>

        {/* App Settings */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: Colors[theme].accent }}
              thumbColor={notifications ? '#fff' : '#f4f3f4'}
            />
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Auto-download content</ThemedText>
            <Switch
              value={autoDownload}
              onValueChange={setAutoDownload}
              trackColor={{ false: '#767577', true: Colors[theme].accent }}
              thumbColor={autoDownload ? '#fff' : '#f4f3f4'}
            />
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Wi-Fi only</ThemedText>
            <Switch
              value={wifiOnly}
              onValueChange={setWifiOnly}
              trackColor={{ false: '#767577', true: Colors[theme].accent }}
              thumbColor={wifiOnly ? '#fff' : '#f4f3f4'}
            />
          </ThemedView>
        </ThemedView>

        {/* Account Settings */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>
          
          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Biometric authentication</ThemedText>
            <Switch
              value={biometricAuth}
              onValueChange={setBiometricAuth}
              trackColor={{ false: '#767577', true: Colors[theme].accent }}
              thumbColor={biometricAuth ? '#fff' : '#f4f3f4'}
            />
          </ThemedView>

          <TouchableOpacity style={styles.settingItem}>
            <ThemedText style={[styles.settingLabel, styles.logoutText]}>Logout</ThemedText>
            <IconSymbol size={20} name="arrow.right" color={Colors[theme].accent} />
          </TouchableOpacity>
        </ThemedView>

        {/* Help & Support */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Help & Support</ThemedText>
          
          <TouchableOpacity style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>About EasyRead</ThemedText>
            <IconSymbol size={20} name="arrow.right" color={Colors[theme].icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Help Center</ThemedText>
            <IconSymbol size={20} name="arrow.right" color={Colors[theme].icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Clear Cache</ThemedText>
            <IconSymbol size={20} name="arrow.right" color={Colors[theme].icon} />
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
      {/* Live reading preview */}
      <ThemedView style={styles.previewContainer}>
        <ThemedText style={styles.previewTitle}>Reading preview</ThemedText>
        <ThemedText style={previewStyles}>
          EasyRead makes dense text easier to read. Adjust settings above to see changes here.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  logoutText: {
    color: '#FF3B30',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fontSizeDisplay: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
  },
  optionButtonActive: {
    backgroundColor: '#961A36',
    borderColor: '#961A36',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  previewTitle: {
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '700',
  },
});
