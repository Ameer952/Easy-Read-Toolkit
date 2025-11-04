import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { PageHeader } from '@/components/PageHeader';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleMenuPress = (item: string) => {
    if (item === 'Settings') {
      router.push('/(tabs)/settings');
    } else {
      Alert.alert(item, 'This feature is coming soon.');
    }
  };

  const profileItems = [
    { title: 'Reading Statistics', icon: 'chart.bar', subtitle: 'View your reading progress' },
    { title: 'Favorites', icon: 'heart', subtitle: 'Your saved documents' },
    { title: 'Export Data', icon: 'square.and.arrow.up', subtitle: 'Backup your documents' },
    { title: 'Settings', icon: 'gearshape', subtitle: 'App preferences' },
    { title: 'Help & Support', icon: 'questionmark.circle', subtitle: 'Get help' },
    { title: 'About', icon: 'info.circle', subtitle: 'App information' },
  ];

  return (
    <ThemedView style={styles.container}>
      <PageHeader 
        title="Profile" 
        subtitle="Manage your account" 
      />
      
      <ThemedView style={styles.placeholderContainer}>
        <IconSymbol name="person.fill" size={64} color={Colors[theme].icon} />
        <ThemedText style={styles.placeholderTitle}>Login / Register</ThemedText>
        <ThemedText style={styles.placeholderMessage}>
          Authentication feature coming soon
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#961A36',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    opacity: 0.6,
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  placeholderMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
});
