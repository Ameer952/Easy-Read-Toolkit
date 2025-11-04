import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const API_BASE_URL = "http://192.168.1.110:5050";

export default function UrlImportScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Artificial_intelligence');
  const [extracted, setExtracted] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [debugMode, setDebugMode] = useState(false);


  const runExtraction = () => {
    if (!webRef.current) {
      console.log('WebView ref not available');
      return;
    }
    console.log('Starting extraction for URL:', url);
    const js = `(() => {
      console.log('Extraction script started');
      function getReadableText() {
        // Try multiple selectors to find the main content
        const contentSelectors = [
          'article',
          'main',
          '[role="main"]',
          '.content',
          '.post-content',
          '.entry-content',
          '.article-content',
          '.story-content',
          '.post-body',
          '.entry-body',
          '.article-body',
          '.content-body',
          '.main-content',
          '#content',
          '#main',
          '#article',
          '.container',
          '.wrapper'
        ];
        
        let contentElement = null;
        
        // Try to find the best content element
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.length > 200) {
            contentElement = element;
            break;
          }
        }
        
        // Fallback to body if no good content found
        if (!contentElement) {
          contentElement = document.body;
        }
        
        // Clone the element to avoid modifying the original
        const cloned = contentElement.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
          'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
          '.advertisement', '.ads', '.ad', '.sidebar', '.menu', '.navigation',
          '.social-share', '.share-buttons', '.comments', '.comment',
          '.related', '.recommended', '.newsletter', '.subscribe',
          '.cookie-notice', '.popup', '.modal', '.overlay'
        ];
        
        unwantedSelectors.forEach(selector => {
          cloned.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Get text content
        let text = cloned.innerText || cloned.textContent || '';
        
        // Clean up the text
        text = text
          .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with double newlines
          .replace(/\s{2,}/g, ' ')     // Replace multiple spaces with single space
          .replace(/^\s+|\s+$/gm, '')  // Trim each line
          .trim();
        
        // Try to get the page title
        const title = document.title || document.querySelector('h1')?.innerText || '';
        
        return {
          text: text.slice(0, 50000), // Increased limit
          title: title
        };
      }
      
      const result = getReadableText();
      console.log('Extraction result:', { textLength: result.text.length, title: result.title });
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        ok: true, 
        text: result.text,
        title: result.title
      }));
    })();`;
    webRef.current.injectJavaScript(js);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    console.log('Received message:', e.nativeEvent.data);
    setLoading(false);
    try {
      const data = JSON.parse(e.nativeEvent.data);
      console.log('Parsed data:', data);
      console.log('Extracted text length:', data.text?.length || 0);
      if (data.ok) {
        const extractedText = data.text || '';
        console.log('Extracted text length:', extractedText.length);
        setExtracted(extractedText);
        
        // Set title from extracted data or fallback
        if (data.title) {
          setDocumentTitle(data.title);
        } else {
          setDocumentTitle(new URL(url).hostname);
        }
        
        // If text is too short, try again
        if (extractedText.length < 100 && retryCount < 2) {
          console.log('Text too short, retrying...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            setLoading(true);
            runExtraction();
          }, 1000);
        } else {
          setRetryCount(0);
        }
      } else {
        console.log('Extraction error:', data.error);
        Alert.alert('Extraction Error', data.error || 'Unknown error');
      }
    } catch (err) {
      console.log('Parse error:', err);
      Alert.alert('Extraction Error', 'Failed to parse result');
    }
  };

  const saveDocument = async () => {
    if (!extracted.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      const document = {
        id: Date.now().toString(),
        title: documentTitle || `URL Document ${new Date().toLocaleDateString()}`,
        content: extracted,
        type: 'web',
        date: new Date().toISOString(),
        url: url,
      };

      // Save to AsyncStorage
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
    if (!extracted.trim()) {
      Alert.alert('No text', 'Please extract text first.');
      return;
    }

    try {
      await Share.share({
        message: extracted,
        title: 'Extracted Text',
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
        <TouchableOpacity 
          style={[styles.loadBtn, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]} 
          onPress={() => { 
            console.log('Extract button pressed');
            setLoading(true); 
            setExtracted(''); 
            setDocumentTitle(''); 
            setRetryCount(0);
            // Trigger WebView reload to start extraction
            if (webRef.current) {
              webRef.current.reload();
            }
            // Also try direct extraction after a delay
            setTimeout(() => {
              if (webRef.current) {
                runExtraction();
              }
            }, 3000);
          }}
          disabled={loading}
        >
          <IconSymbol name="arrow.down.circle" size={16} color="#fff" />
          <ThemedText style={styles.loadText}>
            {loading ? (retryCount > 0 ? 'Retrying…' : 'Extracting…') : 'Extract Text'}
          </ThemedText>
        </TouchableOpacity>
        
        {/* Debug button */}
        <TouchableOpacity 
          style={[styles.loadBtn, { backgroundColor: '#6c757d', marginTop: 8 }]} 
          onPress={() => { 
            console.log('Force extract button pressed');
            setLoading(true);
            runExtraction();
          }}
        >
          <ThemedText style={styles.loadText}>Force Extract</ThemedText>
        </TouchableOpacity>
        
      </ThemedView>

      {/* Quick URL buttons for testing */}
      <ThemedView style={styles.quickUrls}>
        <ThemedText style={styles.quickUrlsTitle}>Try these URLs:</ThemedText>
        <ThemedView style={styles.urlButtons}>
          <TouchableOpacity 
            style={styles.urlBtn} 
            onPress={() => setUrl('https://en.wikipedia.org/wiki/Artificial_intelligence')}
          >
            <ThemedText style={styles.urlBtnText}>Wikipedia AI</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.urlBtn} 
            onPress={() => setUrl('https://www.bbc.com/news')}
          >
            <ThemedText style={styles.urlBtnText}>BBC News</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.urlBtn} 
            onPress={() => setUrl('https://medium.com/@example/article')}
          >
            <ThemedText style={styles.urlBtnText}>Medium Article</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <WebView
        ref={webRef}
        source={{ uri: url }}
        onLoadStart={() => console.log('WebView load started')}
        onLoadEnd={() => {
          console.log('WebView load ended, starting extraction');
          // Always run extraction when WebView finishes loading
          setTimeout(() => {
            console.log('Starting extraction after timeout');
            runExtraction();
          }, 2000); // Give page more time to fully render
        }}
        onError={(error) => console.log('WebView error:', error)}
        onMessage={onMessage}
        style={[styles.webview, { height: 1 }]} // Hide WebView but keep it functional
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {!!extracted && (
        <ScrollView style={styles.resultContainer}>
          <ThemedView style={styles.result}>
            <ThemedView style={styles.resultHeader}>
              <ThemedText style={styles.resultTitle}>
                Extracted Text ({extracted.length} characters)
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
                {extracted.length < 500 && (
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => {
                      setLoading(true);
                      setRetryCount(0);
                      runExtraction();
                    }}
                  >
                    <IconSymbol name="arrow.clockwise" size={16} color={Colors[colorScheme ?? 'light'].accent} />
                    <ThemedText style={styles.actionBtnText}>Retry</ThemedText>
                  </TouchableOpacity>
                )}
              </ThemedView>
            </ThemedView>
            <ThemedText style={styles.extractedText}>{extracted}</ThemedText>
          </ThemedView>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 20 },
  controls: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#E5E5E5', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    fontSize: 14,
  },
  loadBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16, 
    borderRadius: 8, 
    justifyContent: 'center',
    flex: 1,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  loadText: { color: '#fff', fontWeight: '700' },
  webview: { flex: 1 },
  resultContainer: { flex: 1 },
  result: { 
    padding: 16, 
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    margin: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: { fontWeight: '700', fontSize: 16 },
  resultActions: {
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
  extractedText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  quickUrls: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  quickUrlsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  urlButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  urlBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  urlBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
}); 
