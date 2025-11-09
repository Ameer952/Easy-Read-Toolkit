import React, { useState, useMemo } from "react";
import {
   StyleSheet,
   TouchableOpacity,
   ScrollView,
   Alert,
   View,
   Modal,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FS from "expo-file-system/legacy";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { printToFileAsync } from "expo-print";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useReaderTextStyle } from "@/hooks/useReaderPreferences";

// same helper used elsewhere
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

export default function PDFUploadScreen() {
   const { theme } = useTheme();
   const router = useRouter();
   const { textStyle: readerTextStyle, prefs } = useReaderTextStyle();

   const [selectedFile, setSelectedFile] = useState<any>(null);
   const [extractedText, setExtractedText] = useState("");
   const [loading, setLoading] = useState(false);
   const [pdfBase64, setPdfBase64] = useState<string | null>(null);

   // Easy Read state
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
               paddingBottom: 16,
               paddingHorizontal: 20,
               flexDirection: "row",
               alignItems: "center",
               backgroundColor: Colors[theme].headerBackground,
            },
            backButton: { marginRight: 12 },
            headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },

            scrollView: {
               flex: 1,
               backgroundColor: Colors[theme].background,
            },
            scrollContent: { padding: 20 },

            uploadButton: {
               flexDirection: "row",
               alignItems: "center",
               justifyContent: "center",
               gap: 12,
               paddingVertical: 16,
               paddingHorizontal: 24,
               borderRadius: 12,
               marginBottom: 24,
            },
            uploadButtonText: {
               color: "#fff",
               fontSize: 16,
               fontWeight: "700",
            },

            fileInfo: {
               flexDirection: "row",
               alignItems: "center",
               padding: 16,
               borderRadius: 12,
               borderWidth: 1,
               marginBottom: 16,
               gap: 16,
               backgroundColor: Colors[theme].surface,
               borderColor: Colors[theme].border,
            },
            fileDetails: { flex: 1 },
            fileName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
            fileSize: { fontSize: 14 },
            fileStatusRow: {
               flexDirection: "row",
               alignItems: "center",
               marginTop: 4,
               gap: 6,
            },
            fileStatus: { fontSize: 12, fontWeight: "600" },

            loadingContainer: {
               flexDirection: "row",
               alignItems: "center",
               gap: 8,
               padding: 16,
               borderRadius: 12,
               marginTop: 16,
               backgroundColor: Colors[theme].surface,
            },
            loadingText: { fontSize: 14 },

            extractButton: {
               flexDirection: "row",
               alignItems: "center",
               justifyContent: "center",
               gap: 8,
               paddingVertical: 14,
               paddingHorizontal: 20,
               borderRadius: 10,
               marginBottom: 24,
            },
            extractButtonText: {
               color: "#fff",
               fontSize: 15,
               fontWeight: "600",
            },

            resultSection: { marginTop: 8 },
            resultHeader: {
               flexDirection: "row",
               justifyContent: "space-between",
               alignItems: "center",
               marginBottom: 12,
            },
            resultTitle: { fontSize: 16, fontWeight: "700" },
            resultActions: { flexDirection: "row" },

            actionBtn: {
               flexDirection: "row",
               alignItems: "center",
               gap: 4,
               paddingVertical: 6,
               paddingHorizontal: 12,
               borderRadius: 8,
               backgroundColor: Colors[theme].surface,
               borderWidth: 1,
               borderColor: Colors[theme].border,
            },
            actionBtnText: { fontSize: 12, fontWeight: "600" },

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

            textContainer: {
               borderRadius: 12,
               padding: 16,
               borderWidth: 1,
               backgroundColor: Colors[theme].surface,
               borderColor: Colors[theme].border,
            },
            extractedText: { fontSize: 14, lineHeight: 20 },

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
         }),
      [theme]
   );

   const pickDocument = async () => {
      try {
         setLoading(true);

         const result = await DocumentPicker.getDocumentAsync({
            type: "application/pdf",
            copyToCacheDirectory: true,
            multiple: false,
         });

         if (!result.canceled && result.assets && result.assets.length > 0) {
            const file = result.assets[0];

            const maxSize = 35 * 1024 * 1024;
            if (file.size && file.size > maxSize) {
               Alert.alert(
                  "File Too Large",
                  "Please select a PDF file smaller than 35MB."
               );
               setLoading(false);
               return;
            }

            setSelectedFile(file);
            setExtractedText("");
            setEasyRead("");
            setEasyHasSaved(false);
            setEasyModalVisible(false);
            setLeaveGuardVisible(false);

            if (file.uri) {
               try {
                  const base64 = await FS.readAsStringAsync(file.uri, {
                     encoding: FS.EncodingType.Base64,
                  });
                  setPdfBase64(base64);
               } catch (error) {
                  Alert.alert(
                     "Error",
                     "Failed to read PDF file. Please make sure the file is not corrupted."
                  );
               }
            }
         }
      } catch (error) {
         Alert.alert(
            "Permission Error",
            "Failed to access files. Please grant permission to access your device storage."
         );
      } finally {
         setLoading(false);
      }
   };

   const extractTextFromPDF = () => {
      if (!pdfBase64) {
         Alert.alert("No PDF", "Please select a PDF file first.");
         return;
      }
      setLoading(true);
   };

   const htmlForPDFExtraction = (base64: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head>
  <body>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      (async () => {
        try {
          const pdfData = atob('${base64}');
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;
          
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\\n\\n';
          }
          
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            ok: true, 
            text: fullText.trim() 
          }));
        } catch (err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            ok: false, 
            error: String(err) 
          }));
        }
      })();
    </script>
  </body>
</html>`;

   const onPDFMessage = (event: WebViewMessageEvent) => {
      setLoading(false);
      try {
         const data = JSON.parse(event.nativeEvent.data);
         if (data.ok) {
            setExtractedText(data.text || "");
            setEasyRead("");
            setEasyHasSaved(false);
         } else {
            Alert.alert("Extraction Error", data.error || "Unknown error");
         }
      } catch (e) {
         Alert.alert("Extraction Error", "Failed to parse extraction result.");
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
            selectedFile?.name ||
            `PDF Document ${new Date().toLocaleDateString()}`;

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

         const fileName = `easy-read-upload-${Date.now()}.pdf`;
         const dest = `${FS.cacheDirectory}easy-read-upload-${Date.now()}.pdf`;

         const pdfBase64Out = await FS.readAsStringAsync(pdf.uri, {
            encoding: FS.EncodingType.Base64,
         });
         await FS.writeAsStringAsync(dest, pdfBase64Out, {
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
            type: "pdf",
            sourceTag: "upload",
            fileName,
            url: dest,
         });

         setEasyHasSaved(true);

         if (leaveAfter) {
            setLeaveGuardVisible(false);
            router.back();
         }
      } catch (error: any) {
         Alert.alert(
            "Error",
            String(error?.message || "Failed to save Easy Read PDF")
         );
      }
   };

   const handleTranslate = async () => {
      if (!extractedText.trim()) {
         Alert.alert("No text", "Please extract text first.");
         return;
      }

      try {
         setIsTranslating(true);
         const simplified = await rewriteEasyRead(extractedText);
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
            <ThemedText style={styles.headerTitle}>Upload PDF</ThemedText>
         </ThemedView>

         <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
         >
            <TouchableOpacity
               style={[
                  styles.uploadButton,
                  {
                     backgroundColor: Colors[theme].buttonBackground,
                  },
               ]}
               onPress={pickDocument}
            >
               <Ionicons name="document-text-outline" size={24} color="#fff" />
               <ThemedText style={styles.uploadButtonText}>
                  {selectedFile ? "Change PDF File" : "Select PDF File"}
               </ThemedText>
            </TouchableOpacity>

            {selectedFile && (
               <ThemedView style={styles.fileInfo}>
                  <Ionicons
                     name="document-text"
                     size={32}
                     color={Colors[theme].accent}
                  />
                  <ThemedView style={styles.fileDetails}>
                     <ThemedText style={styles.fileName} numberOfLines={2}>
                        {selectedFile.name}
                     </ThemedText>
                     <ThemedText
                        style={[
                           styles.fileSize,
                           { color: Colors[theme].textSecondary },
                        ]}
                     >
                        {selectedFile.size
                           ? `${(selectedFile.size / 1024 / 1024).toFixed(
                                2
                             )} MB`
                           : "Unknown size"}
                     </ThemedText>

                     <ThemedView style={styles.fileStatusRow}>
                        <Ionicons
                           name={
                              pdfBase64 ? "checkmark-circle" : "time-outline"
                           }
                           size={14}
                           color={
                              pdfBase64
                                 ? Colors[theme].accent
                                 : Colors[theme].textSecondary
                           }
                        />
                        <ThemedText
                           style={[
                              styles.fileStatus,
                              { color: Colors[theme].textSecondary },
                           ]}
                        >
                           {pdfBase64
                              ? "Ready for extraction"
                              : "Loading file..."}
                        </ThemedText>
                     </ThemedView>
                  </ThemedView>
               </ThemedView>
            )}

            {loading && !selectedFile && (
               <ThemedView style={styles.loadingContainer}>
                  <Ionicons
                     name="reload-outline"
                     size={24}
                     color={Colors[theme].accent}
                  />
                  <ThemedText
                     style={[
                        styles.loadingText,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     Accessing device files...
                  </ThemedText>
               </ThemedView>
            )}

            {selectedFile && !extractedText && (
               <TouchableOpacity
                  style={[
                     styles.extractButton,
                     {
                        backgroundColor: Colors[theme].buttonBackground,
                     },
                  ]}
                  onPress={extractTextFromPDF}
                  disabled={loading}
               >
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <ThemedText style={styles.extractButtonText}>
                     {loading ? "Extracting Text..." : "Extract Text from PDF"}
                  </ThemedText>
               </TouchableOpacity>
            )}

            {extractedText && (
               <ThemedView style={styles.resultSection}>
                  <ThemedView style={styles.resultHeader}>
                     <ThemedText style={styles.resultTitle}>
                        Extracted Text ({extractedText.length} characters)
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
                              (!hasEasyRead && !extractedText.trim())
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

                  <ThemedView style={styles.textContainer}>
                     <ThemedText
                        style={[
                           styles.extractedText,
                           { color: Colors[theme].text },
                        ]}
                     >
                        {extractedText}
                     </ThemedText>
                  </ThemedView>
               </ThemedView>
            )}

            {loading && pdfBase64 && (
               <WebView
                  originWhitelist={["*"]}
                  source={{ html: htmlForPDFExtraction(pdfBase64) }}
                  onMessage={onPDFMessage}
                  style={{ height: 0, width: 0, opacity: 0 }}
               />
            )}
         </ScrollView>

         <Modal
            visible={easyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setEasyModalVisible(false)}
         >
            <ThemedView style={styles.modalOverlay}>
               <ThemedView style={styles.modalCard}>
                  <ThemedText style={styles.modalTitle}>
                     {selectedFile?.name || "Easy Read"}
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
