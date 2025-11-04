import * as React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/Colors";

export function ThemedView({ style, ...props }: ViewProps) {
   const { theme } = useTheme();
   return <View {...props} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
   base: {
      backgroundColor: "transparent",
   },
});
