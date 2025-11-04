import React from 'react';
import { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function PageHeader({ title, subtitle, style }: PageHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView 
      style={[
        {
          backgroundColor: Colors[theme].headerBackground,
          paddingTop: insets.top + 20,
          paddingBottom: 24,
          paddingHorizontal: 20,
        },
        style,
      ]}
    >
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      {subtitle && <ThemedText style={styles.headerSubtitle}>{subtitle}</ThemedText>}
    </ThemedView>
  );
}

const styles = {
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
};
