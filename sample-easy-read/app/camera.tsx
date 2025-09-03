import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [running, setRunning] = useState(false);

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
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]} onPress={runOcr}>
              <ThemedText style={styles.primaryBtnText}>{running ? 'Extracting…' : 'Extract Text'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setPhotoUri(null); setPhotoBase64(null); setOcrText(''); }}>
              <ThemedText style={styles.secondaryBtnText}>Retake</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          {!!ocrText && (
            <ThemedView style={styles.ocrBlock}>
              <ThemedText style={styles.ocrTitle}>Extracted Text</ThemedText>
              <ThemedText>{ocrText}</ThemedText>
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
  primaryBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  secondaryBtnText: { fontWeight: '700' },
  ocrBlock: { marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: '#F6F6F6' },
  ocrTitle: { fontWeight: '700', marginBottom: 8 },
}); 
