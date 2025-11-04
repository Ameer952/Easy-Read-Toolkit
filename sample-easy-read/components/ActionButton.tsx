import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbolName } from '@/components/ui/IconSymbol';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ActionButtonProps {
  title: string;
  iconName: IconSymbolName;
  onPress: () => void;
}

export function ActionButton({ title, iconName, onPress }: ActionButtonProps) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity 
      style={[
        styles.button,
        { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <IconSymbol 
        size={24} 
        name={iconName} 
        color="#fff" 
      />
      <ThemedText style={styles.buttonText}>{title}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
