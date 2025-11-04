import * as React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/Colors";

export type ThemedTextProps = TextProps & {
   type?:
      | "default"
      | "title"
      | "subtitle"
      | "link"
      | "defaultSemiBold"
      | "defaultBold";
};

export function ThemedText({
   style,
   type = "default",
   ...props
}: ThemedTextProps) {
   const { theme } = useTheme();

   const color = type === "link" ? Colors[theme].accent : Colors[theme].text;

   return (
      <Text
         {...props}
         style={[
            styles.base,
            type === "title" && styles.title,
            type === "subtitle" && styles.subtitle,
            type === "defaultSemiBold" && styles.defaultSemiBold,
            type === "defaultBold" && styles.defaultBold,
            type === "link" && styles.link,
            { color },
            style,
         ]}
      />
   );
}

const styles = StyleSheet.create({
   base: {
      backgroundColor: "transparent",
   },
   title: {
      fontSize: 28,
      fontWeight: "bold",
   },
   subtitle: {
      fontSize: 18,
      fontWeight: "500",
   },
   defaultSemiBold: {
      fontWeight: "600",
   },
   defaultBold: {
      fontWeight: "700",
   },
   link: {
      textDecorationLine: "underline",
   },
});
