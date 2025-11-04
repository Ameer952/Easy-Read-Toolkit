import React, { useEffect, useMemo, useRef, useState } from "react";
import {
   Alert,
   ScrollView,
   StyleSheet,
   TouchableOpacity,
   Share,
   Modal,
   View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
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
import { rewriteEasyRead } from "../lib/api";

export default function CameraScreen() {
   const router = useRouter();
   const { theme } = useTheme();
   const { textStyle: readerTextStyle, prefs } = useReaderTextStyle();

   const [permission, requestPermission] = useCameraPermissions();
   const cameraRef = useRef<CameraView>(null);

   const [photoUri, setPhotoUri] = useState<string | null>(null);
   const [photoBase64, setPhotoBase64] = useState<string | null>(null);
   const [ocrText, setOcrText] = useState<string>("");
   const [running, setRunning] = useState(false);
   const [documentTitle, setDocumentTitle] = useState<string>("");

   // Easy Read state
   const [easyRead, setEasyRead] = useState("");
   const [isTranslating, setIsTranslating] = useState(false);
   const [easyModalVisible, setEasyModalVisible] = useState(false);
   const [easyHasSaved, setEasyHasSaved] = useState(false);
   const [leaveGuardVisible, setLeaveGuardVisible] = useState(false);

   const styles = useMemo(
      () =>
         StyleSheet.create({
            flex1: { flex: 1 },
            center: { alignItems: "center", justifyContent: "center" },

            container: { flex: 1, backgroundColor: Colors[theme].background },

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

            cameraContainer: {
               flex: 1,
               justifyContent: "flex-end",
               alignItems: "center",
               backgroundColor: Colors[theme].background,
            },
            captureButton: {
               width: 72,
               height: 72,
               borderRadius: 36,
               marginBottom: 24,
               backgroundColor: Colors[theme].buttonBackground,
            },

            previewContainer: { padding: 16 },
            previewImage: {
               width: "100%",
               height: 320,
               borderRadius: 8,
               backgroundColor: Colors[theme].surface,
            },

            actionsRow: { flexDirection: "row", gap: 12, marginTop: 16 },

            primaryBtn: {
               flexDirection: "row",
               alignItems: "center",
               gap: 8,
               paddingVertical: 12,
               paddingHorizontal: 16,
               borderRadius: 10,
               flex: 1,
               justifyContent: "center",
               backgroundColor: Colors[theme].buttonBackground,
            },
            primaryBtnText: { color: "#fff", fontWeight: "700" },

            secondaryBtn: {
               flexDirection: "row",
               alignItems: "center",
               gap: 8,
               paddingVertical: 12,
               paddingHorizontal: 16,
               flex: 1,
               justifyContent: "center",
               backgroundColor: Colors[theme].surface,
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               borderRadius: 10,
            },
            secondaryBtnText: { fontWeight: "700", color: Colors[theme].text },

            ocrBlock: {
               marginTop: 16,
               padding: 16,
               borderRadius: 12,
               backgroundColor: Colors[theme].surface,
               borderWidth: 1,
               borderColor: Colors[theme].border,
            },
            ocrHeader: {
               flexDirection: "row",
               justifyContent: "space-between",
               alignItems: "center",
               marginBottom: 12,
            },
            ocrTitle: {
               fontWeight: "700",
               fontSize: 16,
               color: Colors[theme].text,
            },
            ocrActions: { flexDirection: "row", gap: 12 },
            actionBtn: {
               flexDirection: "row",
               alignItems: "center",
               gap: 4,
               paddingVertical: 6,
               paddingHorizontal: 12,
               backgroundColor: Colors[theme].surface,
               borderWidth: StyleSheet.hairlineWidth,
               borderColor: Colors[theme].border,
               borderRadius: 8,
            },
            actionBtnText: {
               fontSize: 12,
               fontWeight: "600",
               color: Colors[theme].text,
            },

            ocrText: {
               fontSize: 14,
               lineHeight: 20,
               color: Colors[theme].text,
            },

            // Easy Read modal (tall bottom sheet)
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

            // Smaller alert-style guard modal
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

   useEffect(() => {
      if (!permission) return;
      if (!permission.granted) {
         requestPermission();
      }
   }, [permission]);

   const takePhoto = async () => {
      try {
         if (!cameraRef.current) return;
         const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            skipProcessing: true,
            quality: 0.8,
         });
         setPhotoUri(photo.uri);
         setPhotoBase64(photo.base64 ?? null);
         setOcrText("");
         setEasyRead("");
         setEasyHasSaved(false);
         setEasyModalVisible(false);
         setLeaveGuardVisible(false);
         setDocumentTitle("");
      } catch {
         Alert.alert("Camera Error", "Unable to take photo.");
      }
   };

   const htmlForTesseract = (base64: string) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://unpkg.com/tesseract.js@5.0.5/dist/tesseract.min.js"></script>
</head>
<body>
  <script>
    (async () => {
      try {
        const { createWorker } = Tesseract;
        const worker = await createWorker('eng');
        const result = await worker.recognize('data:image/jpeg;base64,${base64}');
        await worker.terminate();
        const text = result.data && result.data.text ? result.data.text : '';
        window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, text }));
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, error: String(err) }));
      }
    })();
  </script>
</body>
</html>`;

   const onOcrMessage = (event: WebViewMessageEvent) => {
      setRunning(false);
      try {
         const data = JSON.parse(event.nativeEvent.data);
         if (data.ok) {
            setOcrText(data.text || "");
            if (!documentTitle) {
               setDocumentTitle(
                  `Scanned Document ${new Date().toLocaleDateString()}`
               );
            }
         } else {
            Alert.alert("OCR Error", data.error || "Unknown error");
         }
      } catch {
         Alert.alert("OCR Error", "Failed to parse OCR result.");
      }
   };

   const runOcr = () => {
      if (!photoBase64) {
         Alert.alert("No photo", "Please capture a photo first.");
         return;
      }
      setRunning(true);
   };

   // (optional) still keep for debug/use – it doesn’t conflict with Easy Read flow
   const shareText = async () => {
      if (!ocrText.trim()) {
         Alert.alert("No text", "Please extract text first.");
         return;
      }
      try {
         await Share.share({ message: ocrText, title: "Extracted Text" });
      } catch {
         Alert.alert("Error", "Failed to share text.");
      }
   };

   // SAVE Easy Read as PDF (type: "pdf", source: "scan") – respects reader prefs
   const saveEasyReadDocument = async (leaveAfter: boolean) => {
      const text = easyRead.trim();
      if (!text) return;

      try {
         const safeHtml = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>");

         const title = (documentTitle || "Scanned Easy Read").replace(
            /</g,
            "&lt;"
         );

         // map reader prefs to CSS
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
        h1{margin:0 0 16px;font-size:${Math.round(
           baseFontSize * 1.25
        )}px;text-align:left}
        p{white-space:pre-wrap}
      </style></head>
      <body>
        <h1>${title}</h1>
        <p>${safeHtml}</p>
      </body></html>`.trim();

         const pdf = await printToFileAsync({ html });

         const fileName = `easy-read-scan-${Date.now()}.pdf`;
         const dest = `${FS.documentDirectory}${fileName}`;
         const pdfBase64 = await FS.readAsStringAsync(pdf.uri, {
            encoding: FS.EncodingType.Base64,
         });
         await FS.writeAsStringAsync(dest, pdfBase64, {
            encoding: FS.EncodingType.Base64,
         });

         const document = {
            id: Date.now().toString(),
            title,
            content: text,
            type: "pdf" as const,
            date: new Date().toISOString(),
            fileName,
            url: dest,
            sourceTag: "scan" as const,
         };

         const existingDocs = await AsyncStorage.getItem("documents");
         const documents = existingDocs ? JSON.parse(existingDocs) : [];
         documents.unshift(document);
         await AsyncStorage.setItem("documents", JSON.stringify(documents));

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
      if (!ocrText.trim()) {
         Alert.alert("No text", "Please extract text first.");
         return;
      }

      try {
         setIsTranslating(true);
         const simplified = await rewriteEasyRead(ocrText);
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

   if (!permission || !permission.granted) {
      return (
         <ThemedView style={[styles.flex1, styles.center]}>
            <ThemedText>Requesting camera permission…</ThemedText>
         </ThemedView>
      );
   }

   return (
      <ThemedView style={styles.container}>
         {/* HEADER */}
         <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
               <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <ThemedText style={styles.headerTitle}>Scan Document</ThemedText>
         </ThemedView>

         {!photoUri ? (
            <ThemedView style={styles.cameraContainer}>
               <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
               />
               <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePhoto}
               />
            </ThemedView>
         ) : (
            <ScrollView contentContainerStyle={styles.previewContainer}>
               <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  contentFit="contain"
               />

               <ThemedView style={styles.actionsRow}>
                  <TouchableOpacity
                     style={styles.primaryBtn}
                     onPress={runOcr}
                     disabled={running}
                  >
                     <Ionicons name="scan-outline" size={16} color="#fff" />
                     <ThemedText style={styles.primaryBtnText}>
                        {running ? "Extracting…" : "Extract Text"}
                     </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.secondaryBtn}
                     onPress={() => {
                        setPhotoUri(null);
                        setPhotoBase64(null);
                        setOcrText("");
                        setDocumentTitle("");
                        setEasyRead("");
                        setEasyHasSaved(false);
                        setEasyModalVisible(false);
                        setLeaveGuardVisible(false);
                     }}
                  >
                     <Ionicons
                        name="camera-outline"
                        size={16}
                        color={Colors[theme].accent}
                     />
                     <ThemedText style={styles.secondaryBtnText}>
                        Retake
                     </ThemedText>
                  </TouchableOpacity>
               </ThemedView>

               {!!ocrText && (
                  <ThemedView style={styles.ocrBlock}>
                     <ThemedView style={styles.ocrHeader}>
                        <ThemedText style={styles.ocrTitle}>
                           Extracted Text
                        </ThemedText>
                        <ThemedView style={styles.ocrActions}>
                           <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={
                                 hasEasyRead
                                    ? () => setEasyModalVisible(true)
                                    : handleTranslate
                              }
                              disabled={isTranslating}
                           >
                              <Ionicons
                                 name={
                                    hasEasyRead
                                       ? "document-text-outline"
                                       : "language-outline"
                                 }
                                 size={16}
                                 color={Colors[theme].accent}
                              />
                              <ThemedText style={styles.actionBtnText}>
                                 {isTranslating
                                    ? "Translating…"
                                    : hasEasyRead
                                    ? "Open Easy Read"
                                    : "Translate"}
                              </ThemedText>
                           </TouchableOpacity>
                        </ThemedView>
                     </ThemedView>

                     <ThemedText style={styles.ocrText}>{ocrText}</ThemedText>

                     {isTranslating && (
                        <ThemedText style={styles.guardText}>
                           Generating Easy Read version…
                        </ThemedText>
                     )}
                  </ThemedView>
               )}

               {running && photoBase64 && (
                  <WebView
                     originWhitelist={["*"]}
                     source={{ html: htmlForTesseract(photoBase64) }}
                     onMessage={onOcrMessage}
                     style={{ height: 0, width: 0, opacity: 0 }}
                  />
               )}
            </ScrollView>
         )}

         {/* EASY READ MODAL (tall sheet) */}
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
                           if (!saveDisabled) saveEasyReadDocument(false);
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

         {/* UNSAVED GUARD MODAL (small alert style) */}
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
