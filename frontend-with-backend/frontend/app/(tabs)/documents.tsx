import {
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   Alert,
   View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as FS from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";

type SourceTag = "scan" | "url" | "upload" | "translator";

interface Document {
   id: string;
   title: string;
   content: string;
   type: "scan" | "web" | "pdf";
   date: string;
   url?: string;
   imageUri?: string;
   fileName?: string;
   sourceTag?: SourceTag;
}

type AddRoute = "/camera" | "/url-import" | "/pdf-upload" | "/translator";

export default function DocumentsScreen() {
   const { theme } = useTheme();
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const [documents, setDocuments] = useState<Document[]>([]);
   const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);

   // modals
   const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
   const [fullDoc, setFullDoc] = useState<Document | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

   useFocusEffect(
      useCallback(() => {
         loadDocuments();
      }, [])
   );

   const loadDocuments = async () => {
      try {
         const savedDocs = await AsyncStorage.getItem("documents");
         if (savedDocs) setDocuments(JSON.parse(savedDocs));
      } catch (error) {
         console.error("Failed to load documents:", error);
      }
   };

   const formatDateTime = (isoString: string) => {
      const d = new Date(isoString);
      return (
         d.toLocaleDateString() +
         "   " +
         d.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
         })
      );
   };

   const shareDocument = async (doc: Document) => {
      try {
         if (doc.type === "pdf" && doc.url) {
            await Sharing.shareAsync(doc.url);
            return;
         }
         const tempPath = `${FS.cacheDirectory}easy-read-${doc.id}.txt`;
         await FS.writeAsStringAsync(tempPath, doc.content ?? "");
         await Sharing.shareAsync(tempPath, { mimeType: "text/plain" });
      } catch (e: any) {
         Alert.alert("Share Failed", String(e?.message || e));
      }
   };

   // actual delete logic, called from modal confirm
   const performDelete = async () => {
      if (!deleteTarget) return;
      const doc = deleteTarget;
      try {
         if (doc.type === "pdf" && doc.url) {
            try {
               const info = await FS.getInfoAsync(doc.url);
               if (info.exists)
                  await FS.deleteAsync(doc.url, {
                     idempotent: true,
                  });
            } catch {}
         }
         const raw = await AsyncStorage.getItem("documents");
         const list: Document[] = raw ? JSON.parse(raw) : [];
         const next = list.filter((d) => d.id !== doc.id);
         await AsyncStorage.setItem("documents", JSON.stringify(next));
         setDocuments(next);
      } catch (e: any) {
         Alert.alert("Delete Failed", String(e?.message || e));
      } finally {
         setDeleteTarget(null);
      }
   };

   const viewFullDocument = (doc: Document) => {
      if (doc.type === "pdf" && doc.url) {
         router.push({
            pathname: "/pdf-viewer",
            params: { url: doc.url, title: doc.title },
         });
         return;
      }
      // non-PDF: show in themed modal
      setFullDoc(doc);
   };

   const handleDocumentPress = (doc: Document) => {
      setPreviewDoc(doc);
   };

   const handleAddDocument = () => {
      setIsAddSheetVisible(true);
   };

   const closeAddSheet = () => {
      setIsAddSheetVisible(false);
   };

   const handleAddOption = (route: AddRoute) => {
      setIsAddSheetVisible(false);
      router.push(route);
   };

   const typeLabelFor = (doc: Document) => {
      // 🔹 Prefer sourceTag for user-facing label
      switch (doc.sourceTag) {
         case "scan":
            return "Scanned Document";
         case "url":
            return "Web Article";
         case "upload":
            return "Uploaded PDF";
         case "translator":
            return "Translated Text";
      }
      // fallback to legacy type
      if (doc.type === "scan") return "Scanned Document";
      if (doc.type === "pdf") return "PDF Document";
      return "Web Article";
   };

   const iconNameFor = (
      doc: Document
   ): React.ComponentProps<typeof Ionicons>["name"] => {
      // 🔹 Prefer sourceTag first
      if (doc.sourceTag === "scan") return "camera-outline";
      if (doc.sourceTag === "url") return "globe-outline";
      if (doc.sourceTag === "upload") return "document-text-outline";
      if (doc.sourceTag === "translator") return "language-outline";
      return "globe-outline";
   };

   return (
      <ThemedView
         style={[
            styles.container,
            { backgroundColor: Colors[theme].background },
         ]}
      >
         <ThemedView
            style={[
               styles.header,
               {
                  backgroundColor: Colors[theme].headerBackground,
                  paddingTop: insets.top + 20,
               },
            ]}
         >
            <ThemedText style={styles.headerTitle}>Documents</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
               Your reading library
            </ThemedText>
         </ThemedView>

         <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
         >
            {/* Add New */}
            <TouchableOpacity
               style={[
                  styles.addButton,
                  { backgroundColor: Colors[theme].buttonBackground },
               ]}
               onPress={handleAddDocument}
               activeOpacity={0.9}
            >
               <Ionicons name="add" size={20} color="#fff" />
               <ThemedText style={styles.addButtonText}>
                  Add Document
               </ThemedText>
            </TouchableOpacity>

            {documents.length === 0 ? (
               <ThemedView style={styles.emptyState}>
                  <Ionicons
                     name="document-text-outline"
                     size={64}
                     color={Colors[theme].icon}
                  />
                  <ThemedText style={styles.emptyStateText}>
                     No documents yet.{"\n"}Add your first document to get
                     started!
                  </ThemedText>
               </ThemedView>
            ) : (
               <ThemedView style={styles.documentsSection}>
                  <ThemedText style={styles.sectionTitle}>
                     Recent Documents
                  </ThemedText>

                  {documents.map((doc) => (
                     <TouchableOpacity
                        key={doc.id}
                        style={[
                           styles.documentItem,
                           {
                              backgroundColor: Colors[theme].surface,
                              borderColor: Colors[theme].border,
                           },
                        ]}
                        onPress={() => handleDocumentPress(doc)}
                        activeOpacity={0.85}
                     >
                        <ThemedView
                           style={[
                              styles.documentIcon,
                              { backgroundColor: Colors[theme].surface },
                           ]}
                        >
                           <Ionicons
                              name={iconNameFor(doc)}
                              size={35}
                              color={Colors[theme].accent}
                           />
                        </ThemedView>

                        <ThemedView style={styles.documentInfo}>
                           <ThemedText
                              style={styles.documentTitle}
                              numberOfLines={1}
                           >
                              {doc.title}
                           </ThemedText>

                           <ThemedText
                              style={[
                                 styles.documentDate,
                                 { color: Colors[theme].textSecondary },
                              ]}
                           >
                              {formatDateTime(doc.date)}
                           </ThemedText>

                           <ThemedText
                              style={[
                                 styles.documentPreview,
                                 { color: Colors[theme].textSecondary },
                              ]}
                              numberOfLines={2}
                           >
                              {doc.content.substring(0, 100)}...
                           </ThemedText>
                        </ThemedView>

                        {/* Actions stacked vertically */}
                        <View style={styles.actions}>
                           <TouchableOpacity
                              onPress={() => shareDocument(doc)}
                              hitSlop={10}
                              style={styles.actionBtn}
                           >
                              <Ionicons
                                 name="share-outline"
                                 size={20}
                                 color={Colors[theme].accent}
                              />
                           </TouchableOpacity>
                           <TouchableOpacity
                              onPress={() => setDeleteTarget(doc)}
                              hitSlop={10}
                              style={[styles.actionBtn, { marginTop: 8 }]}
                           >
                              <Ionicons
                                 name="trash-outline"
                                 size={20}
                                 color={Colors[theme].accent}
                              />
                           </TouchableOpacity>
                        </View>
                     </TouchableOpacity>
                  ))}
               </ThemedView>
            )}
         </ScrollView>

         {/* Add Document bottom sheet */}
         {isAddSheetVisible && (
            <ThemedView style={styles.sheetOverlay}>
               <TouchableOpacity
                  style={styles.sheetBackdrop}
                  activeOpacity={1}
                  onPress={closeAddSheet}
               />
               <ThemedView
                  style={[
                     styles.sheet,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                        marginBottom: insets.bottom + 16,
                     },
                  ]}
               >
                  <ThemedText style={styles.sheetTitle}>
                     Add Document
                  </ThemedText>

                  <TouchableOpacity
                     style={styles.sheetItem}
                     onPress={() => handleAddOption("/camera")}
                  >
                     <Ionicons
                        name="camera"
                        size={20}
                        color={Colors[theme].accent}
                     />
                     <ThemedText style={styles.sheetItemText}>
                        Scan Document
                     </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.sheetItem}
                     onPress={() => handleAddOption("/url-import")}
                  >
                     <Ionicons
                        name="link-outline"
                        size={20}
                        color={Colors[theme].accent}
                     />
                     <ThemedText style={styles.sheetItemText}>
                        Paste URL
                     </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.sheetItem}
                     onPress={() => handleAddOption("/pdf-upload")}
                  >
                     <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={Colors[theme].accent}
                     />
                     <ThemedText style={styles.sheetItemText}>
                        Upload PDF
                     </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.sheetItem}
                     onPress={() => handleAddOption("/translator")}
                  >
                     <Ionicons
                        name="language-outline"
                        size={20}
                        color={Colors[theme].accent}
                     />
                     <ThemedText style={styles.sheetItemText}>
                        Translate Text
                     </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={[styles.sheetItem, styles.sheetCancel]}
                     onPress={closeAddSheet}
                  >
                     <ThemedText style={styles.sheetCancelText}>
                        Cancel
                     </ThemedText>
                  </TouchableOpacity>
               </ThemedView>
            </ThemedView>
         )}

         {/* Preview modal */}
         {previewDoc && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setPreviewDoc(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCard,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     {previewDoc.title}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalSubText,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {typeLabelFor(previewDoc)} ·{" "}
                     {formatDateTime(previewDoc.date)}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalBody,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {previewDoc.content.substring(0, 200)}...
                  </ThemedText>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border },
                        ]}
                        onPress={() => setPreviewDoc(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Cancel
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           {
                              borderColor: Colors[theme].accent,
                              backgroundColor: Colors[theme].accent,
                           },
                        ]}
                        onPress={() => {
                           const doc = previewDoc;
                           setPreviewDoc(null);
                           viewFullDocument(doc);
                        }}
                     >
                        <ThemedText
                           style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                           View Full
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}

         {/* Full text modal for non-PDF docs */}
         {fullDoc && fullDoc.type !== "pdf" && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setFullDoc(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCardLarge,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     {fullDoc.title}
                  </ThemedText>
                  <ScrollView style={{ flex: 1, marginTop: 8 }}>
                     <ThemedText style={styles.fullText}>
                        {fullDoc.content}
                     </ThemedText>
                  </ScrollView>
                  <View style={[styles.modalButtonRow, { marginTop: 12 }]}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border, flex: 1 },
                        ]}
                        onPress={() => setFullDoc(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Close
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}

         {/* Delete confirmation modal */}
         {deleteTarget && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setDeleteTarget(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCard,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     Delete Document
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalBody,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     Delete “{deleteTarget.title}”? This cannot be undone.
                  </ThemedText>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border },
                        ]}
                        onPress={() => setDeleteTarget(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Cancel
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           {
                              borderColor: Colors[theme].accent,
                              backgroundColor: Colors[theme].accent,
                           },
                        ]}
                        onPress={performDelete}
                     >
                        <ThemedText
                           style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                           Delete
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },

   header: { paddingBottom: 24, paddingHorizontal: 20 },

   headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 4,
   },
   headerSubtitle: { fontSize: 16, color: "#fff", opacity: 0.8 },

   scrollView: { flex: 1, paddingHorizontal: 20 },

   addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 20,
      marginBottom: 24,
      gap: 8,
   },
   addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

   documentsSection: { marginBottom: 32 },
   sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },

   documentItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      gap: 8,
   },
   documentIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
   },
   documentInfo: { flex: 1 },
   documentTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
   documentDate: { fontSize: 14, marginBottom: 4 },
   documentPreview: { fontSize: 12, lineHeight: 16 },

   actions: {
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "center",
   },
   actionBtn: {
      padding: 6,
   },

   emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 32,
   },
   emptyStateText: { textAlign: "center", marginTop: 16, lineHeight: 20 },

   // bottom sheet (Add Document)
   sheetOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "flex-end",
      alignItems: "center",
   },
   sheetBackdrop: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
   },
   sheet: {
      width: "94%",
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
   },
   sheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 4,
   },
   sheetItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 10,
   },
   sheetItemText: {
      fontSize: 15,
      fontWeight: "500",
   },
   sheetCancel: {
      marginTop: 4,
      justifyContent: "center",
   },
   sheetCancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#FF3B30",
      textAlign: "center",
      width: "100%",
   },

   // generic modals (preview, full text, delete)
   modalOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
   },
   modalBackdrop: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
   },
   modalCard: {
      width: "86%",
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
   },
   modalCardLarge: {
      width: "90%",
      maxHeight: "75%",
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
   },
   modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 4,
   },
   modalSubText: {
      fontSize: 13,
      marginBottom: 8,
   },
   modalBody: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
      marginBottom: 12,
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
   },
   modalButtonText: {
      fontSize: 14,
      fontWeight: "600",
   },
   fullText: {
      fontSize: 14,
      lineHeight: 20,
   },
});
