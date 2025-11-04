import React, { useMemo, useRef, useState, useCallback } from "react";
import {
   ActivityIndicator,
   Keyboard,
   Pressable,
   ScrollView,
   StyleSheet,
   TextInput,
   View,
   Modal,
   TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { printToFileAsync } from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FS from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useReaderTextStyle } from "@/hooks/useReaderPreferences";

import { rewriteEasyRead } from "../lib/api";

export default function TranslatorScreen() {
   const { theme } = useTheme();
   const router = useRouter();
   const insets = useSafeAreaInsets();

   const [source, setSource] = useState("");
   const [result, setResult] = useState("");
   const [loading, setLoading] = useState(false);

   // modal for replacing alerts
   const [modalVisible, setModalVisible] = useState(false);
   const [modalTitle, setModalTitle] = useState<string>("");
   const [modalMessage, setModalMessage] = useState<string>("");

   const inputRef = useRef<TextInput>(null);

   // 🔹 Reader preferences (font size / line height / alignment) shared across app
   const { textStyle: outputTextStyle } = useReaderTextStyle();

   const styles = useMemo(
      () =>
         StyleSheet.create({
            screen: { flex: 1, backgroundColor: Colors[theme].background },

            topbar: {
               paddingTop: 60,
               paddingBottom: 16,
               paddingHorizontal: 20,
               flexDirection: "row",
               alignItems: "center",
               backgroundColor: Colors[theme].headerBackground,
            },
            backButton: { marginRight: 12 },
            headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },

            panes: { flex: 1, gap: 12, padding: 16 },

            card: {
               flex: 1,
               borderRadius: 16,
               overflow: "hidden",
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
               marginBottom: 12,
            },
            cardHeader: {
               paddingHorizontal: 16,
               paddingTop: 14,
               paddingBottom: 10,
               borderBottomWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
            },
            cardHeaderRow: {
               flexDirection: "row",
               alignItems: "center",
               justifyContent: "space-between",
            },
            cardTitle: {
               fontSize: 14,
               fontWeight: "800",
               color: Colors[theme].text,
            },
            actionsRow: {
               marginTop: 10,
               flexDirection: "row",
               flexWrap: "wrap",
               gap: 8,
            },

            textarea: {
               minHeight: 200,
               padding: 16,
               fontSize: 16,
               lineHeight: 24,
               color: Colors[theme].text,
            },
            outputTextBase: {
               padding: 16,
               color: Colors[theme].text,
            },
            placeholder: {
               padding: 16,
               fontStyle: "italic",
               opacity: 0.7,
               color: Colors[theme].text,
            },

            footerBar: {
               paddingHorizontal: 16,
               paddingVertical: 12,
               borderTopWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               flexDirection: "row",
               alignItems: "center",
               justifyContent: "space-between",
               gap: 12,
               backgroundColor: Colors[theme].surface,
            },
            counter: { opacity: 0.8, color: Colors[theme].text },

            primaryBtn: {
               paddingHorizontal: 18,
               paddingVertical: 12,
               borderRadius: 12,
               backgroundColor:
                  Colors[theme].buttonBackground ?? Colors[theme].tint,
               flexDirection: "row",
               alignItems: "center",
               gap: 8,
            },
            primaryBtnText: { fontWeight: "800", color: "#fff" },

            miniBtn: {
               paddingHorizontal: 12,
               paddingVertical: 8,
               borderRadius: 10,
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
               flexDirection: "row",
               alignItems: "center",
               gap: 6,
            },
            miniBtnText: { fontWeight: "700", color: Colors[theme].text },

            // Modal styles
            modalOverlay: {
               flex: 1,
               justifyContent: "center",
               alignItems: "center",
               backgroundColor: "rgba(0,0,0,0.45)",
            },
            modalCard: {
               width: "80%",
               borderRadius: 14,
               paddingHorizontal: 18,
               paddingVertical: 16,
               backgroundColor: Colors[theme].surface,
               borderWidth: 1,
               borderColor: Colors[theme].border,
            },
            modalTitle: {
               fontSize: 16,
               fontWeight: "700",
               marginBottom: 6,
               color: Colors[theme].text,
            },
            modalMessage: {
               fontSize: 14,
               lineHeight: 20,
               marginBottom: 12,
               color: Colors[theme].text,
            },
            modalButtonRow: {
               flexDirection: "row",
               justifyContent: "flex-end",
               gap: 10,
            },
            modalButton: {
               paddingHorizontal: 14,
               paddingVertical: 8,
               borderRadius: 10,
               borderWidth: 1,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
            },
            modalButtonText: {
               fontSize: 14,
               fontWeight: "600",
               color: Colors[theme].text,
            },
         }),
      [theme, insets.top]
   );

   const counts = useMemo(
      () => ({
         chars: source.length,
         words: (source.trim().match(/\S+/g) || []).length,
      }),
      [source]
   );

   const showModal = (title: string, message: string) => {
      setModalTitle(title);
      setModalMessage(message);
      setModalVisible(true);
   };

   const onPaste = useCallback(async () => {
      try {
         const clip = await Clipboard.getStringAsync();
         if (clip)
            setSource((prev) =>
               prev ? (prev.endsWith("\n") ? prev : prev + "\n") + clip : clip
            );
      } catch (e: any) {
         showModal("Clipboard Error", String(e?.message || e));
      }
   }, []);

   const onCopy = useCallback(async (text: string) => {
      try {
         await Clipboard.setStringAsync(text || "");
         showModal("Copied", "Text copied to clipboard.");
      } catch (e: any) {
         showModal("Clipboard Error", String(e?.message || e));
      }
   }, []);

   const onSwap = () => {
      setSource(result);
      setResult(source);
      inputRef.current?.focus?.();
   };

   const onClear = () => {
      setSource("");
      setResult("");
      inputRef.current?.focus?.();
   };

   const translate = useCallback(async () => {
      const text = source.trim();
      if (!text) return;

      setLoading(true);
      setResult("");

      try {
         const simplified = await rewriteEasyRead(text);
         if (!simplified) throw new Error("Empty response from translator");
         setResult(simplified);
      } catch (err: any) {
         showModal("Translation Error", String(err?.message || err));
      } finally {
         setLoading(false);
      }
   }, [source]);

   const saveAsPdf = useCallback(async () => {
      const text = result.trim();
      if (!text) {
         showModal("Nothing to save", "Run Simplify first.");
         return;
      }

      try {
         // 🔹 Use reader preferences for PDF styling
         const fontSize =
            typeof outputTextStyle.fontSize === "number"
               ? outputTextStyle.fontSize
               : 16;
         const lineHeightPx =
            typeof outputTextStyle.lineHeight === "number"
               ? outputTextStyle.lineHeight
               : Math.round(fontSize * 1.5);
         const textAlign =
            (outputTextStyle.textAlign as
               | "left"
               | "center"
               | "right"
               | "justify") || "left";

         const html = `
      <html><head><meta charset="utf-8" />
      <style>
        body{
          font-family:-apple-system,Roboto,Arial,sans-serif;
          padding:24px;
          font-size:${fontSize}px;
          line-height:${lineHeightPx}px;
          text-align:${textAlign};
        }
        h1{margin:0 0 16px;font-size:${fontSize + 4}px}
        p{white-space:pre-wrap}
      </style></head>
      <body>
        <h1>Easy Read</h1>
        <p>${text
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/\n/g, "<br/>")}</p>
      </body></html>`.trim();

         const pdf = await printToFileAsync({ html });

         const fileName = `easy-read-${Date.now()}.pdf`;
         const dest = `${FS.documentDirectory}${fileName}`;
         const pdfBase64 = await FS.readAsStringAsync(pdf.uri, {
            encoding: FS.EncodingType.Base64,
         });
         await FS.writeAsStringAsync(dest, pdfBase64, {
            encoding: FS.EncodingType.Base64,
         });

         const document = {
            id: String(Date.now()),
            title: "Easy Read PDF",
            content: text,
            type: "pdf" as const,
            date: new Date().toISOString(),
            fileName,
            url: dest,
            sourceTag: "translator" as const,
         };
         const existing = await AsyncStorage.getItem("documents");
         const docs = existing ? JSON.parse(existing) : [];
         docs.unshift(document);
         await AsyncStorage.setItem("documents", JSON.stringify(docs));

         showModal("Saved", "PDF saved to your Documents.");
      } catch (e: any) {
         showModal("Save Failed", String(e?.message || e));
      }
   }, [result, router, outputTextStyle]);

   return (
      <ThemedView style={styles.screen}>
         <Stack.Screen options={{ headerShown: false }} />

         {/* Red Header */}
         <ThemedView style={styles.topbar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
               <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Translator</ThemedText>
         </ThemedView>

         {/* MAIN */}
         <View style={styles.panes}>
            {/* INPUT */}
            <Card
               title="Input"
               actions={
                  <>
                     <MiniButton
                        label="Paste"
                        onPress={onPaste}
                        iconName="clipboard-outline"
                     />
                     <MiniButton
                        label="Copy"
                        onPress={() => onCopy(source)}
                        disabled={!source}
                        iconName="copy-outline"
                     />
                     <MiniButton
                        label="Clear"
                        onPress={onClear}
                        disabled={!source && !result}
                        iconName="close-outline"
                     />
                     <MiniButton
                        label="Swap"
                        onPress={onSwap}
                        disabled={!source && !result}
                        iconName="swap-horizontal-outline"
                     />
                  </>
               }
            >
               <ScrollView keyboardShouldPersistTaps="handled">
                  <TextInput
                     ref={inputRef}
                     style={styles.textarea}
                     placeholder="Paste or type your paragraph here…"
                     placeholderTextColor={Colors[theme].placeholder}
                     multiline
                     textAlignVertical="top"
                     value={source}
                     onChangeText={setSource}
                     autoCorrect={false}
                     autoCapitalize="sentences"
                     returnKeyType="done"
                     onSubmitEditing={() => {
                        Keyboard.dismiss();
                        translate();
                     }}
                  />
               </ScrollView>

               <View style={styles.footerBar}>
                  <ThemedText style={styles.counter}>
                     {counts.words} words · {counts.chars} chars
                  </ThemedText>
                  <Pressable
                     onPress={translate}
                     disabled={!source || loading}
                     style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                           opacity:
                              !source || loading ? 0.5 : pressed ? 0.85 : 1,
                        },
                     ]}
                  >
                     {loading ? (
                        <ActivityIndicator />
                     ) : (
                        <>
                           <Ionicons
                              name="flash-outline"
                              size={18}
                              color="#fff"
                           />
                           <ThemedText style={styles.primaryBtnText}>
                              Simplify
                           </ThemedText>
                        </>
                     )}
                  </Pressable>
               </View>
            </Card>

            {/* OUTPUT */}
            <Card
               title="Easy Read"
               actions={
                  <>
                     <MiniButton
                        label="Copy"
                        onPress={() => onCopy(result)}
                        disabled={!result}
                        iconName="copy-outline"
                     />
                     <MiniButton
                        label="Save as PDF"
                        onPress={saveAsPdf}
                        disabled={!result}
                        iconName="download-outline"
                     />
                  </>
               }
            >
               <ScrollView>
                  {result ? (
                     <ThemedText
                        style={[styles.outputTextBase, outputTextStyle]}
                     >
                        {result}
                     </ThemedText>
                  ) : (
                     <ThemedText style={styles.placeholder}>
                        Your simplified text will appear here.
                     </ThemedText>
                  )}
               </ScrollView>
            </Card>
         </View>

         {/* Themed Alert Modal */}
         <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
         >
            <ThemedView style={styles.modalOverlay}>
               <ThemedView style={styles.modalCard}>
                  <ThemedText style={styles.modalTitle}>
                     {modalTitle}
                  </ThemedText>
                  <ThemedText style={styles.modalMessage}>
                     {modalMessage}
                  </ThemedText>
                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setModalVisible(false)}
                     >
                        <ThemedText style={styles.modalButtonText}>
                           OK
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         </Modal>
      </ThemedView>
   );
}

/* Reusable bits */
function Card({
   title,
   actions,
   children,
}: {
   title: string;
   actions?: React.ReactNode;
   children: React.ReactNode;
}) {
   const { theme } = useTheme();
   const styles = useMemo(
      () =>
         StyleSheet.create({
            card: {
               flex: 1,
               borderRadius: 16,
               overflow: "hidden",
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
               marginBottom: 12,
            },
            cardHeader: {
               paddingHorizontal: 16,
               paddingTop: 14,
               paddingBottom: 10,
               borderBottomWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
            },
            cardHeaderRow: {
               flexDirection: "row",
               alignItems: "center",
               justifyContent: "space-between",
            },
            cardTitle: {
               fontSize: 14,
               fontWeight: "800",
               color: Colors[theme].text,
            },
            actionsRow: {
               marginTop: 10,
               flexDirection: "row",
               flexWrap: "wrap",
               gap: 8,
            },
         }),
      [theme]
   );

   return (
      <ThemedView style={styles.card}>
         <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
               <ThemedText style={styles.cardTitle}>{title}</ThemedText>
            </View>
            {actions ? <View style={styles.actionsRow}>{actions}</View> : null}
         </View>
         {children}
      </ThemedView>
   );
}

function MiniButton({
   label,
   onPress,
   disabled,
   iconName,
}: {
   label: string;
   onPress: () => void;
   disabled?: boolean;
   iconName?: React.ComponentProps<typeof Ionicons>["name"];
}) {
   const { theme } = useTheme();
   const styles = useMemo(
      () =>
         StyleSheet.create({
            btn: {
               paddingHorizontal: 12,
               paddingVertical: 8,
               borderRadius: 10,
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
               flexDirection: "row",
               alignItems: "center",
               gap: 6,
            },
            txt: { fontWeight: "700", color: Colors[theme].text },
         }),
      [theme]
   );

   return (
      <Pressable
         onPress={onPress}
         disabled={disabled}
         style={({ pressed }) => [
            styles.btn,
            { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
         ]}
      >
         {iconName ? (
            <Ionicons name={iconName} size={16} color={Colors[theme].text} />
         ) : null}
         <ThemedText style={styles.txt}>{label}</ThemedText>
      </Pressable>
   );
}
