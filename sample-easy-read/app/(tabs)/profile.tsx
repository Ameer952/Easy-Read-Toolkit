import { StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleMenuPress = (item: string) => {
    if (item === 'Settings') {
      router.push('/(tabs)/settings');
    } else {
      Alert.alert(item, 'This feature is coming soon.');
    }
  };

  const handleLogout = () => {
    console.log('Logout prompt launched');
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) logout();
      return;
    }
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation will happen automatically via auth state change
          },
        },
      ]
    );
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
      <ThemedView style={[styles.header, { backgroundColor: Colors[theme].headerBackground, paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Manage your account</ThemedText>
      </ThemedView>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* User Info Section */}
        <ThemedView style={styles.userSection}>
          <ThemedView style={styles.avatar}>
            <IconSymbol name="person.fill" size={40} color="#fff" />
          </ThemedView>
          <ThemedText style={styles.userName}>{user?.name}</ThemedText>
          <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>
          <ThemedText style={styles.memberSince}>
            Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
          </ThemedText>
        </ThemedView>

        {/* Menu Items */}
        <ThemedView style={styles.menuSection}>
          {profileItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.title)}
            >
              <ThemedView style={styles.menuIcon}>
                <IconSymbol name={item.icon as any} size={20} color={Colors[theme].accent} />
              </ThemedView>
              <ThemedView style={styles.menuInfo}>
                <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.menuSubtitle}>{item.subtitle}</ThemedText>
              </ThemedView>
              <IconSymbol name="chevron.right" size={20} color={Colors[theme].icon} />
            </TouchableOpacity>
          ))}

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <ThemedView style={styles.menuIcon}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF3B30" />
            </ThemedView>
            <ThemedView style={styles.menuInfo}>
              <ThemedText style={[styles.menuTitle, styles.logoutText]}>Logout</ThemedText>
            </ThemedView>
          </TouchableOpacity>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
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
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 14,
    opacity: 0.5,
  },
  menuSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
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
  logoutButton: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 24,
  },
  logoutText: {
    color: '#FF3B30',
  },
});
