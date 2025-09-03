import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function UrlImportScreen() {
  const colorScheme = useColorScheme();
  const webRef = useRef<WebView>(null);
  const [url, setUrl] = useState('https://example.com');
  const [extracted, setExtracted] = useState('');
  const [loading, setLoading] = useState(false);

  const runExtraction = () => {
    if (!webRef.current) return;
    const js = `(() => {
      function getReadableText() {
        const article = document.querySelector('article');
        const main = document.querySelector('main');
        const body = document.body;
        const root = article || main || body;
        const cloned = root.cloneNode(true);
        ['script','style','noscript','iframe'].forEach(tag => {
          cloned.querySelectorAll(tag).forEach(n => n.remove());
        });
        const text = cloned.innerText.replace(/\n{2,}/g,'\n\n').trim();
        return text.slice(0, 20000);
      }
      const text = getReadableText();
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, text }));
    })();`;
    webRef.current.injectJavaScript(js);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    setLoading(false);
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.ok) setExtracted(data.text || '');
      else Alert.alert('Extraction Error', data.error || 'Unknown error');
    } catch (err) {
      Alert.alert('Extraction Error', 'Failed to parse result');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].headerBackground }]}>
        <ThemedText style={styles.headerTitle}>Import from URL</ThemedText>
      </ThemedView>

      <ThemedView style={styles.controls}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter article URL"
          style={styles.input}
        />
        <TouchableOpacity style={[styles.loadBtn, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]} onPress={() => { setLoading(true); setExtracted(''); }}>
          <ThemedText style={styles.loadText}>{loading ? 'Loading…' : 'Load'}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <WebView
        ref={webRef}
        source={{ uri: url }}
        onLoadEnd={() => runExtraction()}
        onMessage={onMessage}
        style={styles.webview}
      />

      {!!extracted && (
        <ThemedView style={styles.result}>
          <ThemedText style={styles.resultTitle}>Extracted Text</ThemedText>
          <ThemedText>{extracted}</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 20 },
  controls: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  loadBtn: { paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  loadText: { color: '#fff', fontWeight: '700' },
  webview: { flex: 1 },
  result: { padding: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  resultTitle: { fontWeight: '700', marginBottom: 8 },
}); 
