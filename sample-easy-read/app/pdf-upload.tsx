import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// API Configuration
const API_BASE_URL = "http://192.168.1.110:5050";

export default function PDFUploadScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const pickDocument = async () => {
    try {
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
        const maxSize = 10 * 1024 * 1024;
        if (file.size && file.size > maxSize) {
          Alert.alert('File Too Large', 'Please select a PDF file smaller than 10MB.');
          setLoading(false);
          return;
        }
        
        setSelectedFile(file);
        setExtractedText('');
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

  const extractTextFromPDF = async (fileUri: string) => {
    try {
      setLoading(true);
      setProgress("Uploading PDF...");

      const formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type: "application/pdf",
        name: "upload.pdf",
      } as any);

      console.log(`Sending request to: ${API_BASE_URL}/upload/pdf`);

      const response = await fetch(`${API_BASE_URL}/upload/pdf`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Extraction successful, text length:', data.text?.length || 0);
      
      setExtractedText(data.text || "No text found.");
      setProgress("");
      
      Alert.alert('Success', 'Text extracted successfully!');
    } catch (error: any) {
      console.error("Extraction failed:", error);
      
      let errorMessage = "Failed to extract text.";
      if (error.message.includes('Network request failed')) {
        errorMessage = `Cannot connect to server at ${API_BASE_URL}. Make sure:\n\n1. Server is running\n2. Your phone and computer are on the same WiFi\n3. Firewall allows port 5050`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
      setExtractedText("");
    } finally {
      setLoading(false);
      setProgress("");
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
          disabled={loading}
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
              <ThemedText style={styles.fileStatus}>✅ Ready for extraction</ThemedText>
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

        {/* Progress Indicator */}
        {loading && progress && (
          <ThemedView style={styles.loadingContainer}>
            <IconSymbol name="arrow.clockwise" size={24} color={Colors[colorScheme ?? 'light'].accent} />
            <ThemedText style={styles.loadingText}>{progress}</ThemedText>
          </ThemedView>
        )}

        {/* Extract Button */}
        {selectedFile && !extractedText && (
          <TouchableOpacity 
            style={[styles.extractButton, { 
              backgroundColor: loading ? '#999' : Colors[colorScheme ?? 'light'].buttonBackground 
            }]}
            onPress={() => extractTextFromPDF(selectedFile.uri)}
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
    marginBottom: 16,
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