import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface ActionButtonProps {
   title: string;
   iconName: IoniconName; // now uses Ionicons names
   onPress: () => void;
}

export function ActionButton({ title, iconName, onPress }: ActionButtonProps) {
   const colorScheme = useColorScheme();

   return (
      <TouchableOpacity
         style={[
            styles.button,
            {
               // keep your themed red button background
               backgroundColor: Colors[colorScheme ?? "light"].buttonBackground,
            },
         ]}
         onPress={onPress}
         activeOpacity={0.8}
      >
         <Ionicons name={iconName} size={24} color="#fff" />
         <ThemedText style={styles.buttonText}>{title}</ThemedText>
      </TouchableOpacity>
   );
}

const styles = StyleSheet.create({
   button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: {
         width: 0,
         height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
   },
   buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
   },
});
