import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({ base64: true, skipProcessing: true, quality: 0.8 });
      setPhotoUri(photo.uri);
      setPhotoBase64(photo.base64 ?? null);
      setOcrText('');
    } catch (e) {
      Alert.alert('Camera Error', 'Unable to take photo.');
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
        setOcrText(data.text || '');
      } else {
        Alert.alert('OCR Error', data.error || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('OCR Error', 'Failed to parse OCR result.');
    }
  };

  const runOcr = () => {
    if (!photoBase64) {
      Alert.alert('No photo', 'Please capture a photo first.');
      return;
    }
    setRunning(true);
  };

  const saveDocument = async () => {
    if (!ocrText.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      const document = {
        id: Date.now().toString(),
        title: documentTitle || `Scanned Document ${new Date().toLocaleDateString()}`,
        content: ocrText,
        type: 'scan',
        date: new Date().toISOString(),
        imageUri: photoUri,
      };

      // Save to AsyncStorage
      const existingDocs = await AsyncStorage.getItem('documents');
      const documents = existingDocs ? JSON.parse(existingDocs) : [];
      documents.unshift(document);
      await AsyncStorage.setItem('documents', JSON.stringify(documents));

      Alert.alert('Success', 'Document saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save document.');
    }
  };

  const shareText = async () => {
    if (!ocrText.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      await Share.share({
        message: ocrText,
        title: 'Extracted Text',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share text.');
    }
  };

  if (!permission || !permission.granted) {
    return (
      <ThemedView style={[styles.flex1, styles.center]}>
        <ThemedText>Requesting camera permission…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].headerBackground }]}>
        <ThemedText style={styles.headerTitle}>Scan Document</ThemedText>
      </ThemedView>

      {!photoUri ? (
        <ThemedView style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <TouchableOpacity style={[styles.captureButton, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]} onPress={takePhoto} />
        </ThemedView>
      ) : (
        <ScrollView contentContainerStyle={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="contain" />
          
          <ThemedView style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]} 
              onPress={runOcr}
              disabled={running}
            >
              <IconSymbol name="text.viewfinder" size={16} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>
                {running ? 'Extracting…' : 'Extract Text'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={() => { 
                setPhotoUri(null); 
                setPhotoBase64(null); 
                setOcrText(''); 
                setDocumentTitle(''); 
              }}
            >
              <IconSymbol name="camera" size={16} color={Colors[colorScheme ?? 'light'].accent} />
              <ThemedText style={styles.secondaryBtnText}>Retake</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {!!ocrText && (
            <ThemedView style={styles.ocrBlock}>
              <ThemedView style={styles.ocrHeader}>
                <ThemedText style={styles.ocrTitle}>Extracted Text</ThemedText>
                <ThemedView style={styles.ocrActions}>
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
              <ThemedText style={styles.ocrText}>{ocrText}</ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  cameraContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#000' },
  captureButton: { width: 72, height: 72, borderRadius: 36, marginBottom: 24 },
  previewContainer: { padding: 16 },
  previewImage: { width: '100%', height: 320, borderRadius: 8, backgroundColor: '#000' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingVertical: 12, 
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
  },
  secondaryBtnText: { fontWeight: '700' },
  ocrBlock: { 
    marginTop: 16, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  ocrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ocrTitle: { fontWeight: '700', fontSize: 16 },
  ocrActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ocrText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
}); 
