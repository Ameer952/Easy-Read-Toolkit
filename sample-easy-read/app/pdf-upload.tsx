import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PDFUploadScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const pickDocument = async () => {
    try {
      // Show loading while picking
      setLoading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size && file.size > maxSize) {
          Alert.alert('File Too Large', 'Please select a PDF file smaller than 10MB.');
          setLoading(false);
          return;
        }
        
        setSelectedFile(file);
        setExtractedText('');
        
        // Read file as base64
        if (file.uri) {
          try {
            const base64 = await FileSystem.readAsStringAsync(file.uri, {
              encoding: 'base64',
            });
            setPdfBase64(base64);
            console.log('PDF loaded successfully, size:', base64.length);
          } catch (error) {
            console.log('Error reading file:', error);
            Alert.alert('Error', 'Failed to read PDF file. Please make sure the file is not corrupted.');
          }
        }
      } else {
        console.log('Document picker canceled');
      }
    } catch (error) {
      console.log('Error picking document:', error);
      Alert.alert('Permission Error', 'Failed to access files. Please grant permission to access your device storage.');
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPDF = () => {
    if (!pdfBase64) {
      Alert.alert('No PDF', 'Please select a PDF file first.');
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
        setExtractedText(data.text || '');
      } else {
        Alert.alert('Extraction Error', data.error || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Extraction Error', 'Failed to parse extraction result.');
    }
  };

  const saveDocument = async () => {
    if (!extractedText.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      const document = {
        id: Date.now().toString(),
        title: selectedFile?.name || `PDF Document ${new Date().toLocaleDateString()}`,
        content: extractedText,
        type: 'pdf',
        date: new Date().toISOString(),
        fileName: selectedFile?.name,
      };

      const existingDocs = await AsyncStorage.getItem('documents');
      const documents = existingDocs ? JSON.parse(existingDocs) : [];
      documents.unshift(document);
      await AsyncStorage.setItem('documents', JSON.stringify(documents));

      Alert.alert('Success', 'Document saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/documents'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save document.');
    }
  };

  const shareText = async () => {
    if (!extractedText.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      await Share.share({
        message: extractedText,
        title: 'Extracted PDF Text',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share text.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Upload PDF</ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* File Picker */}
        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]}
          onPress={pickDocument}
        >
          <IconSymbol name="doc.badge.plus" size={24} color="#fff" />
          <ThemedText style={styles.uploadButtonText}>
            {selectedFile ? 'Change PDF File' : 'Select PDF File'}
          </ThemedText>
        </TouchableOpacity>

        {/* Selected File Info */}
        {selectedFile && (
          <ThemedView style={styles.fileInfo}>
            <IconSymbol name="doc.fill" size={32} color={Colors[colorScheme ?? 'light'].accent} />
            <ThemedView style={styles.fileDetails}>
              <ThemedText style={styles.fileName} numberOfLines={2}>{selectedFile.name}</ThemedText>
              <ThemedText style={styles.fileSize}>
                {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
              </ThemedText>
              <ThemedText style={styles.fileStatus}>
                {pdfBase64 ? '✅ Ready for extraction' : '⚠️ Loading file...'}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {/* Loading State */}
        {loading && !selectedFile && (
          <ThemedView style={styles.loadingContainer}>
            <IconSymbol name="arrow.clockwise" size={24} color={Colors[colorScheme ?? 'light'].accent} />
            <ThemedText style={styles.loadingText}>Accessing device files...</ThemedText>
          </ThemedView>
        )}

        {/* Extract Button */}
        {selectedFile && !extractedText && (
          <TouchableOpacity 
            style={[styles.extractButton, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]}
            onPress={extractTextFromPDF}
            disabled={loading}
          >
            <IconSymbol name="text.viewfinder" size={20} color="#fff" />
            <ThemedText style={styles.extractButtonText}>
              {loading ? 'Extracting Text...' : 'Extract Text from PDF'}
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Extracted Text */}
        {extractedText && (
          <ThemedView style={styles.resultSection}>
            <ThemedView style={styles.resultHeader}>
              <ThemedText style={styles.resultTitle}>
                Extracted Text ({extractedText.length} characters)
              </ThemedText>
              <ThemedView style={styles.resultActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={shareText}>
                  <IconSymbol name="square.and.arrow.up" size={16} color={Colors[colorScheme ?? 'light'].accent} />
                  <ThemedText style={styles.actionBtnText}>Share</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={saveDocument}>
                  <IconSymbol name="square.and.arrow.down" size={16} color={Colors[colorScheme ?? 'light'].accent} />
                  <ThemedText style={styles.actionBtnText}>Save</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.textContainer}>
              <ThemedText style={styles.extractedText}>{extractedText}</ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 16,
    gap: 16,
  },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  fileSize: { fontSize: 14, opacity: 0.6 },
  fileStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 16,
  },
  loadingText: { fontSize: 14, opacity: 0.7 },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 24,
  },
  extractButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultSection: { marginTop: 8 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  textContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  extractedText: { fontSize: 14, lineHeight: 20, color: '#333' },
});

