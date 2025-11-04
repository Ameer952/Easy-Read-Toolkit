import { Image } from 'expo-image';
import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { FeatureCard } from '@/components/FeatureCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = () => {
    if (!user?.name) return 'there';
    return user.name.split(' ')[0];
  };

  const handleScanDocument = () => {
    router.push('/camera');
  };

  const handleUploadURL = () => {
    router.push('/url-import');
  };

  const handleUploadPDF = () => {
    router.push('/pdf-upload');
  };

  const handleFeaturePress = (feature: string) => {
    Alert.alert(feature, 'This feature is coming soon.');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView
        style={[
          styles.header,
          {
            backgroundColor: Colors[theme].headerBackground,
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText style={styles.headerTitleOnly}>Easy Read ToolKit</ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120, paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Greeting Section */}
        <ThemedView style={styles.greetingSection}>
          <ThemedText style={styles.greeting}>{getGreeting()}, {getFirstName()}!</ThemedText>
          <ThemedText style={styles.supportiveText}>
            Ready to make reading easier? Let's get started!
          </ThemedText>
        </ThemedView>

        {/* Primary Actions */}
        <ThemedView style={styles.actionsSection}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <ThemedView style={styles.actionButtons}>
            <ActionButton
              title="Scan Document"
              iconName="camera.fill"
              onPress={handleScanDocument}
            />
            <ActionButton
              title="Paste URL"
              iconName="link"
              onPress={handleUploadURL}
            />
            <ActionButton
              title="Upload PDF"
              iconName="doc.badge.plus"
              onPress={handleUploadPDF}
            />
          </ThemedView>
        </ThemedView>

        {/* Feature Section */}
        <ThemedView style={styles.featuresSection}>
          <ThemedText style={styles.sectionTitle}>Features</ThemedText>
          
          <FeatureCard
            title="Document Scanning"
            description="Scan physical documents and convert them to readable text with advanced OCR technology."
            iconName="doc.text.viewfinder"
            onPress={() => handleFeaturePress('Document Scanning')}
          />
          
          <FeatureCard
            title="URL Import"
            description="Import articles and web content directly from URLs for easy reading."
            iconName="globe"
            onPress={() => handleFeaturePress('URL Import')}
          />
          
          <FeatureCard
            title="Smart Library"
            description="Organize and manage your reading materials with intelligent categorization."
            iconName="books.vertical.fill"
            onPress={() => handleFeaturePress('Smart Library')}
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
    minHeight: 100,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitleOnly: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'lowercase',
    flex: 1,
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
  },
  greetingSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  supportiveText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    marginBottom: 24,
  },
  actionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  featuresSection: {
    marginBottom: 32,
  },
});
