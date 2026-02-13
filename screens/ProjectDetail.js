import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Image
} from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  FileText,
  Download,
  MoreHorizontal,
  MapPin,
  Calendar
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformTodo, transformFile } from '../lib/transforms';
import DataStateView from '../components/DataStateView';
import { supabase } from '../lib/supabase';

export default function ProjectDetailScreen({ route, navigation }) {
  const { project } = route.params;
  const { user } = useAuth();

  const { data: fetchedTodos, loading: todosLoading, error: todosError } = useSupabaseQuery('project_todos', {
    filters: { project_id: project.id },
    transform: transformTodo,
  });
  const { data: files, loading: filesLoading, error: filesError } = useSupabaseQuery('project_files', {
    filters: { project_id: project.id },
    transform: transformFile,
  });

  const [todos, setTodos] = useState([]);
  useEffect(() => {
    if (fetchedTodos) setTodos(fetchedTodos);
  }, [fetchedTodos]);

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    const { error } = await supabase.from('project_todos').update({ completed: !todo.completed }).eq('id', id);
    if (error) setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: todo.completed } : t));
  };

  const loading = todosLoading || filesLoading;
  const fetchError = todosError || filesError;

  if (loading || fetchError) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={fetchError} onRetry={() => {}} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        bounces={false} 
        showsVerticalScrollIndicator={false}
        // Increased padding to 160 to ensure content clears all UI overlays
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* 1. Dynamic Cover Image */}
        <ImageBackground source={{ uri: project.image }} style={styles.coverImage}>
          <View style={styles.imageOverlay}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={styles.contentBody}>
          {/* 2. Title & Type */}
          <View style={styles.headerSection}>
            <View style={[styles.typeBadge, { backgroundColor: project.color }]}>
              <Text style={styles.typeText}>{project.type}</Text>
            </View>
            <Text style={styles.mainTitle}>{project.title}</Text>
            <Text style={styles.lastEdited}>Last activity: {project.lastModified}</Text>
          </View>

          {/* 3. AI Generated To-Do List */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>AI Action Plan</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI Insight</Text>
              </View>
            </View>
            <View style={styles.todoContainer}>
              {todos.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.todoItem} 
                  onPress={() => toggleTodo(item.id)}
                >
                  {item.completed ? 
                    <CheckCircle2 size={22} color={colors.primary} /> : 
                    <Circle size={22} color="#CCC" />
                  }
                  <Text style={[styles.todoText, item.completed && styles.todoTextDone]}>
                    {item.task}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 4. Files Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Files</Text>
            {files.map(file => (
              <View key={file.id} style={styles.fileCard}>
                <View style={styles.fileIconBox}>
                  <FileText size={24} color={colors.primary} />
                </View>
                <View style={styles.fileMeta}>
                  <Text style={styles.fileName}>{file.fileName}</Text>
                  <Text style={styles.fileSize}>{file.fileSize} • Edited {file.lastEdited}</Text>
                </View>
                <TouchableOpacity><Download size={20} color="#999" /></TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 5. Primary Contact Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Contact</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <Image source={{ uri: 'https://i.pravatar.cc/150?u=sarah' }} style={styles.avatar} />
                <View style={styles.contactNameInfo}>
                  <Text style={styles.contactName}>Sarah Jenkins</Text>
                  <Text style={styles.contactRole}>Head of Operations</Text>
                </View>
                <TouchableOpacity><MoreHorizontal size={20} color="#CCC" /></TouchableOpacity>
              </View>
              <View style={styles.contactDetails}>
                <View style={styles.detailRow}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.detailText}>Nexus AI HQ</Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={colors.primary} />
                  <Text style={styles.detailText}>Met Feb 02</Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: {
    paddingBottom: 160, // Increased extra space at the bottom
  },
  coverImage: { height: 250, width: '100%' },
  imageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  contentBody: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30, padding: 24 },
  headerSection: { marginBottom: 24 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  typeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  mainTitle: { ...typography.heading1, fontSize: 26, color: '#000' },
  lastEdited: { fontSize: 13, color: '#999', marginTop: 4 },
  section: { marginTop: 32 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 16 },
  aiBadge: { backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 10, marginBottom: 16 },
  aiBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  todoContainer: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 16 },
  todoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  todoText: { marginLeft: 12, fontSize: 15, color: '#444', fontWeight: '500' },
  todoTextDone: { textDecorationLine: 'line-through', color: '#AAA' },
  fileCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEE', marginBottom: 12 },
  fileIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F1F3F5', justifyContent: 'center', alignItems: 'center' },
  fileMeta: { flex: 1, marginLeft: 16 },
  fileName: { fontSize: 15, fontWeight: '700', color: '#333' },
  fileSize: { fontSize: 12, color: '#999', marginTop: 2 },
  contactCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  contactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 45, height: 45, borderRadius: 22.5 },
  contactNameInfo: { flex: 1, marginLeft: 12 },
  contactName: { fontSize: 16, fontWeight: '700' },
  contactRole: { fontSize: 13, color: '#666' },
  contactDetails: { flexDirection: 'row' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  detailText: { marginLeft: 6, fontSize: 12, color: '#666' }
});