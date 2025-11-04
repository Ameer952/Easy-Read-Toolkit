import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'scan' | 'web' | 'pdf';
  date: string;
  url?: string;
  imageUri?: string;
  fileName?: string;
}

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const savedDocs = await AsyncStorage.getItem('documents');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleDocumentPress = (doc: Document) => {
    const typeLabel = doc.type === 'scan' ? 'Scanned Document' : doc.type === 'pdf' ? 'PDF Document' : 'Web Article';
    Alert.alert(
      doc.title,
      `Type: ${typeLabel}\nDate: ${new Date(doc.date).toLocaleDateString()}\n\nContent preview:\n${doc.content.substring(0, 200)}...`,
      [
        { text: 'View Full', onPress: () => viewFullDocument(doc) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const viewFullDocument = (doc: Document) => {
    // For now, show in alert. In a real app, you'd navigate to a document viewer
    Alert.alert(doc.title, doc.content);
  };

  const handleAddDocument = () => {
    Alert.alert('Add Document', 'Choose how to add a new document', [
      { text: 'Scan', onPress: () => router.push('/camera') },
      { text: 'Import URL', onPress: () => router.push('/url-import') },
      { text: 'Upload PDF', onPress: () => router.push('/pdf-upload') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: Colors[theme].headerBackground, paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.headerTitle}>Documents</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Your reading library</ThemedText>
      </ThemedView>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddDocument}>
          <IconSymbol name="plus" size={20} color="#fff" />
          <ThemedText style={styles.addButtonText}>Add Document</ThemedText>
        </TouchableOpacity>

        {documents.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="doc.text" size={64} color={Colors[theme].icon} />
            <ThemedText style={styles.emptyStateText}>
              No documents yet.{'\n'}Add your first document to get started!
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.documentsSection}>
            <ThemedText style={styles.sectionTitle}>Recent Documents</ThemedText>
            {documents.map(doc => (
              <TouchableOpacity 
                key={doc.id} 
                style={styles.documentItem}
                onPress={() => handleDocumentPress(doc)}
              >
                <ThemedView style={styles.documentIcon}>
                  <IconSymbol 
                    name={doc.type === 'scan' ? 'doc.text.image' : doc.type === 'pdf' ? 'doc.fill' : 'globe'} 
                    size={24} 
                    color={Colors[theme].accent} 
                  />
                </ThemedView>
                <ThemedView style={styles.documentInfo}>
                  <ThemedText style={styles.documentTitle} numberOfLines={1}>
                    {doc.title}
                  </ThemedText>
                  <ThemedText style={styles.documentDate}>
                    {new Date(doc.date).toLocaleDateString()}
                  </ThemedText>
                  <ThemedText style={styles.documentPreview} numberOfLines={2}>
                    {doc.content.substring(0, 100)}...
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#961A36',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  documentPreview: {
    fontSize: 12,
    opacity: 0.5,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 16,
    lineHeight: 20,
  },
});
