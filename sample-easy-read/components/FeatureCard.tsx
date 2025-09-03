import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbolName } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface FeatureCardProps {
  title: string;
  description: string;
  iconName: IconSymbolName;
  onPress?: () => void;
}

export function FeatureCard({ title, description, iconName, onPress }: FeatureCardProps) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        { backgroundColor: Colors[colorScheme ?? 'light'].background }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ThemedView style={styles.iconContainer}>
        <IconSymbol 
          size={32} 
          name={iconName} 
          color={Colors[colorScheme ?? 'light'].primary} 
        />
      </ThemedView>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
});
