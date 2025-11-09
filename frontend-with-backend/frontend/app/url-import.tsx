import React, { useRef, useState, useMemo } from "react";
import {
   StyleSheet,
   TextInput,
   TouchableOpacity,
   Alert,
   ScrollView,
   View,
   Modal,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { printToFileAsync } from "expo-print";
import * as FS from "expo-file-system/legacy";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useReaderTextStyle } from "@/hooks/useReaderPreferences";

import { rewriteEasyRead, createUserDocument } from "../lib/api";

const AUTH_TOKEN_KEYS = ["easyread.token", "authToken", "token"];

const getAuthToken = async () => {
   for (const key of AUTH_TOKEN_KEYS) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      try {
         const parsed = JSON.parse(raw);
         if (typeof parsed === "string") return parsed;
         if (parsed?.token && typeof parsed.token === "string")
            return parsed.token;
         if (parsed?.authToken && typeof parsed.authToken === "string")
            return parsed.authToken;
         if (parsed?.accessToken && typeof parsed.accessToken === "string")
            return parsed.accessToken;
         if (parsed?.jwt && typeof parsed.jwt === "string") return parsed.jwt;
      } catch {
         return raw;
      }
   }
   return null;
};

export default function UrlImportScreen() {
   const { theme } = useTheme();
   const router = useRouter();
   const webRef = useRef<WebView>(null);

   const { textStyle: readerTextStyle, prefs } = useReaderTextStyle();

   const [url, setUrl] = useState("https://www.easyreadtoolbox.info/");
   const [extracted, setExtracted] = useState("");
   const [loading, setLoading] = useState(false);
   const [documentTitle, setDocumentTitle] = useState("");
   const [retryCount, setRetryCount] = useState(0);

   const [easyRead, setEasyRead] = useState("");
   const [isTranslating, setIsTranslating] = useState(false);
   const [easyModalVisible, setEasyModalVisible] = useState(false);
   const [easyHasSaved, setEasyHasSaved] = useState(false);
   const [leaveGuardVisible, setLeaveGuardVisible] = useState(false);

   const styles = useMemo(
      () =>
         StyleSheet.create({
            container: {
               flex: 1,
               backgroundColor: Colors[theme].background,
            },
            header: {
               paddingTop: 60,
               paddingBottom: 12,
               paddingHorizontal: 20,
               flexDirection: "row",
               alignItems: "center",
               backgroundColor: Colors[theme].headerBackground,
            },
            backButton: {
               marginRight: 12,
            },
            headerTitle: {
               color: "#fff",
               fontWeight: "700",
               fontSize: 20,
            },
            controls: {
               paddingHorizontal: 12,
               paddingVertical: 12,
            },
            urlInputContainer: {
               flexDirection: "row",
               alignItems: "center",
               borderWidth: 1,
               borderColor: Colors[theme].border,
               backgroundColor: Colors[theme].surface,
               borderRadius: 8,
               paddingHorizontal: 8,
            },
            input: {
               flex: 1,
               paddingVertical: 10,
               paddingHorizontal: 6,
               fontSize: 14,
               color: Colors[theme].text,
            },
            clearBtn: {
               padding: 6,
            },
            buttonRow: {
               flexDirection: "row",
               gap: 8,
               marginTop: 8,
            },
            loadBtn: {
               flex: 1,
               flexDirection: "row",
               alignItems: "center",
               gap: 8,
               paddingHorizontal: 16,
               paddingVertical: 10,
               borderRadius: 8,
               justifyContent: "center",
            },
            loadText: {
               color: "#fff",
               fontWeight: "700",
            },
            webview: {
               height: 1,
            },
            resultContainer: {
               flex: 1,
            },
            result: {
               padding: 16,
               backgroundColor: Colors[theme].surface,
               borderWidth: 1,
               borderColor: Colors[theme].border,
               borderRadius: 12,
               margin: 12,
            },
            resultHeader: {
               flexDirection: "row",
               justifyContent: "space-between",
               alignItems: "center",
               marginBottom: 12,
            },
            resultTitle: {
               fontWeight: "700",
               fontSize: 16,
               color: Colors[theme].text,
            },
            resultActions: {
               flexDirection: "row",
               gap: 12,
               alignItems: "center",
            },
            actionBtn: {
               flexDirection: "row",
               alignItems: "center",
               gap: 4,
               paddingVertical: 6,
               paddingHorizontal: 12,
               backgroundColor: Colors[theme].surface,
               borderRadius: 8,
               borderWidth: 1,
               borderColor: Colors[theme].border,
            },
            actionBtnText: {
               fontSize: 12,
               fontWeight: "600",
               color: Colors[theme].text,
            },
            extractedText: {
               fontSize: 14,
               lineHeight: 20,
               color: Colors[theme].text,
            },
            translatingHint: {
               marginTop: 8,
               fontSize: 12,
               color: Colors[theme].textSecondary,
            },
            modalOverlay: {
               flex: 1,
               backgroundColor: "rgba(0,0,0,0.45)",
               justifyContent: "flex-end",
            },
            modalCard: {
               height: "90%",
               borderTopLeftRadius: 18,
               borderTopRightRadius: 18,
               paddingHorizontal: 18,
               paddingVertical: 16,
               borderWidth: 1,
               backgroundColor: Colors[theme].surface,
               borderColor: Colors[theme].border,
            },
            modalTitle: {
               fontSize: 18,
               fontWeight: "700",
               marginBottom: 6,
               color: Colors[theme].text,
            },
            modalBodyScroll: {
               paddingBottom: 12,
            },
            modalBodyText: {
               fontSize: 14,
               lineHeight: 20,
               color: Colors[theme].text,
            },
            modalButtonRow: {
               flexDirection: "row",
               justifyContent: "flex-end",
               gap: 10,
               marginTop: 4,
            },
            modalButton: {
               paddingHorizontal: 14,
               paddingVertical: 9,
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
            modalPrimaryButton: {
               backgroundColor: Colors[theme].accent,
               borderColor: Colors[theme].accent,
            },
            modalPrimaryButtonText: {
               color: "#fff",
            },
            guardText: {
               fontSize: 14,
               lineHeight: 20,
               marginTop: 4,
               marginBottom: 12,
               color: Colors[theme].textSecondary,
            },
            guardOverlay: {
               flex: 1,
               backgroundColor: "rgba(0,0,0,0.45)",
               justifyContent: "center",
               alignItems: "center",
            },
            guardCard: {
               width: "85%",
               borderRadius: 18,
               paddingHorizontal: 18,
               paddingVertical: 16,
               borderWidth: 1,
               backgroundColor: Colors[theme].surface,
               borderColor: Colors[theme].border,
            },
            actionChip: {
               flexDirection: "row",
               alignItems: "center",
               paddingHorizontal: 10,
               paddingVertical: 6,
               borderRadius: 12,
               backgroundColor: Colors[theme].buttonBackground,
               gap: 8,
            },
            actionChipText: {
               fontSize: 13,
               fontWeight: "600",
               color: "#fff",
            },
         }),
      [theme]
   );

   const runExtraction = () => {
      if (!webRef.current) return;
      const js = `(() => {
      function getReadableText() {
        const selectors = ["article", "main", "[role='main']", ".content"];
        let found = null;
        for (const s of selectors) {
          const el = document.querySelector(s);
          if (el && el.innerText.length > 200) {
            found = el;
            break;
          }
        }
        if (!found) found = document.body;
        return {
          text: found.innerText.slice(0, 50000),
          title: document.title
        };
      }
      const result = getReadableText();
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, text: result.text, title: result.title }));
    })();`;
      webRef.current.injectJavaScript(js);
   };

   const onMessage = (e: WebViewMessageEvent) => {
      setLoading(false);
      try {
         const data = JSON.parse(e.nativeEvent.data);
         if (data.ok) {
            const extractedText = data.text || "";
            setExtracted(extractedText);
            setDocumentTitle(data.title || new URL(url).hostname);

            if (extractedText.length < 100 && retryCount < 2) {
               setRetryCount((prev) => prev + 1);
               setTimeout(() => {
                  setLoading(true);
                  runExtraction();
               }, 1000);
            } else {
               setRetryCount(0);
            }
         }
      } catch (err) {
         Alert.alert("Error", "Failed to parse result");
      }
   };

   const saveEasyReadDocument = async (leaveAfter: boolean) => {
      const text = easyRead.trim();
      if (!text) return;

      try {
         const safeHtml = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>");

         const title =
            documentTitle || `URL Document ${new Date().toLocaleDateString()}`;

         const baseFontSize = prefs.fontSize ?? 16;
         const lhFactor =
            prefs.lineHeight === "Compact"
               ? 1.2
               : prefs.lineHeight === "Spacious"
               ? 1.8
               : 1.5;
         const lineHeightPx = Math.round(baseFontSize * lhFactor);
         const textAlign =
            prefs.textAlignment === "Center"
               ? "center"
               : prefs.textAlignment === "Justify"
               ? "justify"
               : "left";

         const html = `
      <html><head><meta charset="utf-8" />
      <style>
        body{
          font-family:-apple-system,Roboto,Arial,sans-serif;
          padding:24px;
          font-size:${baseFontSize}px;
          line-height:${lineHeightPx}px;
          text-align:${textAlign};
        }
        h1{
          margin:0 0 16px;
          font-size:${Math.round(baseFontSize * 1.25)}px;
          text-align:left;
        }
        p{white-space:pre-wrap}
      </style></head>
      <body>
        <h1>${title.replace(/</g, "&lt;")}</h1>
        <p>${safeHtml}</p>
      </body></html>`.trim();

         const pdf = await printToFileAsync({ html });

         const fileName = `easy-read-url-${Date.now()}.pdf`;
         const dest = `${FS.documentDirectory}${fileName}`;
         const pdfBase64 = await FS.readAsStringAsync(pdf.uri, {
            encoding: FS.EncodingType.Base64,
         });
         await FS.writeAsStringAsync(dest, pdfBase64, {
            encoding: FS.EncodingType.Base64,
         });

         const token = await getAuthToken();
         if (!token) {
            Alert.alert(
               "Not signed in",
               "Please sign in to save this document to your account."
            );
            return;
         }

         await createUserDocument(token, {
            title,
            content: text,
            type: "web",
            sourceTag: "url",
            fileName,
            url: dest,
         });

         setEasyHasSaved(true);

         if (leaveAfter) {
            setLeaveGuardVisible(false);
            router.back();
         }
      } catch (e: any) {
         Alert.alert("Error", String(e?.message || e) || "Failed to save");
      }
   };

   const handleTranslate = async () => {
      if (!extracted.trim()) {
         Alert.alert("No text", "Please extract text first.");
         return;
      }

      try {
         setIsTranslating(true);
         const simplified = await rewriteEasyRead(extracted);
         setEasyRead(simplified || "");
         setEasyHasSaved(false);
         setEasyModalVisible(true);
      } catch (e) {
         Alert.alert(
            "Error",
            "Failed to generate Easy Read text. Please try again."
         );
      } finally {
         setIsTranslating(false);
      }
   };

   const handleBack = () => {
      if (easyRead && !easyHasSaved) {
         setLeaveGuardVisible(true);
      } else {
         router.back();
      }
   };

   const hasEasyRead = !!easyRead.trim();
   const saveDisabled = !easyRead.trim() || easyHasSaved;

   return (
      <ThemedView style={styles.container}>
         <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
               <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Import from URL</ThemedText>
         </ThemedView>

         <ThemedView style={styles.controls}>
            <View style={styles.urlInputContainer}>
               <TextInput
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter article URL"
                  placeholderTextColor={Colors[theme].placeholder}
                  style={styles.input}
               />
               {url.length > 0 && (
                  <TouchableOpacity
                     onPress={() => setUrl("")}
                     style={styles.clearBtn}
                  >
                     <Ionicons
                        name="close-outline"
                        size={20}
                        color={Colors[theme].text}
                     />
                  </TouchableOpacity>
               )}
            </View>

            <ThemedView style={styles.buttonRow}>
               <TouchableOpacity
                  style={[
                     styles.loadBtn,
                     { backgroundColor: Colors[theme].buttonBackground },
                  ]}
                  onPress={() => {
                     setLoading(true);
                     setExtracted("");
                     setDocumentTitle("");
                     setRetryCount(0);
                     setEasyRead("");
                     setEasyHasSaved(false);
                     setEasyModalVisible(false);
                     setLeaveGuardVisible(false);
                     if (webRef.current) webRef.current.reload();
                     setTimeout(() => {
                        runExtraction();
                     }, 2500);
                  }}
                  disabled={loading}
               >
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <ThemedText style={styles.loadText}>
                     {loading ? "Extracting…" : "Extract"}
                  </ThemedText>
               </TouchableOpacity>

               <TouchableOpacity
                  style={[
                     styles.loadBtn,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderWidth: 1,
                        borderColor: Colors[theme].border,
                     },
                  ]}
                  onPress={() => {
                     setLoading(true);
                     runExtraction();
                  }}
               >
                  <Ionicons
                     name="refresh-outline"
                     size={18}
                     color={Colors[theme].text}
                  />
                  <ThemedText
                     style={[styles.loadText, { color: Colors[theme].text }]}
                  >
                     Force Extract
                  </ThemedText>
               </TouchableOpacity>
            </ThemedView>
         </ThemedView>

         <WebView
            ref={webRef}
            source={{ uri: url }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            style={styles.webview}
         />

         {!!extracted && (
            <ScrollView style={styles.resultContainer}>
               <ThemedView style={styles.result}>
                  <ThemedView style={styles.resultHeader}>
                     <ThemedText style={styles.resultTitle}>
                        Extracted Text ({extracted.length})
                     </ThemedText>

                     <ThemedView style={styles.resultActions}>
                        <TouchableOpacity
                           style={[
                              styles.actionChip,
                              isTranslating && { opacity: 0.7 },
                           ]}
                           onPress={
                              hasEasyRead
                                 ? () => setEasyModalVisible(true)
                                 : handleTranslate
                           }
                           disabled={
                              isTranslating ||
                              (!hasEasyRead && !extracted.trim())
                           }
                        >
                           <Ionicons
                              name={
                                 hasEasyRead
                                    ? "document-text-outline"
                                    : "sparkles-outline"
                              }
                              size={14}
                              color="#fff"
                           />
                           <ThemedText style={styles.actionChipText}>
                              {isTranslating
                                 ? "Creating Easy Read..."
                                 : hasEasyRead
                                 ? "Open Easy Read"
                                 : "Easy Read it"}
                           </ThemedText>
                        </TouchableOpacity>
                     </ThemedView>
                  </ThemedView>

                  <ThemedText style={styles.extractedText}>
                     {extracted}
                  </ThemedText>

                  {isTranslating && (
                     <ThemedText style={styles.translatingHint}>
                        Generating Easy Read version…
                     </ThemedText>
                  )}
               </ThemedView>
            </ScrollView>
         )}

         <Modal
            visible={easyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setEasyModalVisible(false)}
         >
            <ThemedView style={styles.modalOverlay}>
               <ThemedView style={styles.modalCard}>
                  <ThemedText style={styles.modalTitle}>
                     {documentTitle || "Easy Read"}
                  </ThemedText>

                  <ScrollView
                     style={{ flex: 1 }}
                     contentContainerStyle={styles.modalBodyScroll}
                  >
                     <ThemedText
                        style={[styles.modalBodyText, readerTextStyle]}
                     >
                        {easyRead}
                     </ThemedText>
                  </ScrollView>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => {
                           setEasyRead("");
                           setEasyHasSaved(false);
                           setEasyModalVisible(false);
                        }}
                     >
                        <ThemedText style={styles.modalButtonText}>
                           Delete
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setEasyModalVisible(false)}
                     >
                        <ThemedText style={styles.modalButtonText}>
                           Close
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           styles.modalPrimaryButton,
                           saveDisabled && { opacity: 0.5 },
                        ]}
                        disabled={saveDisabled}
                        onPress={() => {
                           if (!saveDisabled) {
                              saveEasyReadDocument(false);
                           }
                        }}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              styles.modalPrimaryButtonText,
                           ]}
                        >
                           {easyHasSaved ? "Saved" : "Save"}
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         </Modal>

         <Modal
            visible={leaveGuardVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLeaveGuardVisible(false)}
         >
            <ThemedView style={styles.guardOverlay}>
               <ThemedView style={styles.guardCard}>
                  <ThemedText style={styles.modalTitle}>
                     Leave without saving?
                  </ThemedText>
                  <ThemedText style={styles.guardText}>
                     You have an Easy Read version that isn&apos;t saved to your
                     Documents yet.
                  </ThemedText>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => {
                           setLeaveGuardVisible(false);
                           router.back();
                        }}
                     >
                        <ThemedText style={styles.modalButtonText}>
                           Leave without Saving
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[styles.modalButton, styles.modalPrimaryButton]}
                        onPress={() => saveEasyReadDocument(true)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              styles.modalPrimaryButtonText,
                           ]}
                        >
                           Save &amp; Leave
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         </Modal>
      </ThemedView>
   );
}
