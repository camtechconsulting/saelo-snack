import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ImageBackground, 
  TextInput, 
  Keyboard, 
  TouchableWithoutFeedback,
  Modal,
  Alert
} from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import {
  Plus,
  X,
  FileText,
  Search,
  MoreVertical,
  FileUp,
  Zap,
  Sparkles,
  Briefcase,
  CheckCircle,
  Trash2,
  HardDrive,
  AlertTriangle
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformWorkspace } from '../lib/transforms';
import DataStateView from '../components/DataStateView';
import FormModal from '../components/FormModal';
import { insertWorkspace, deleteWorkspace } from '../lib/mutations';

export default function DocumentsScreen({ navigation }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const searchInputRef = useRef(null);

  const { user } = useAuth();
  const { data: workspaces, loading, error, refetch } = useSupabaseQuery('workspaces', {
    filters: { user_id: user.id },
    orderBy: { column: 'last_modified', ascending: false },
    transform: transformWorkspace,
  });

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  const handleWorkspacePress = (item) => {
    if (navigation) {
      navigation.navigate('ProjectDetail', { project: item });
    }
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleCloseOptions = () => {
    setSelectedProject(null);
    setIsConfirmingDelete(false);
  };

  const WORKSPACE_FIELDS = [
    { key: 'title', label: 'Project Name', type: 'text', required: true, placeholder: 'e.g. Client: TechCorp' },
    { key: 'type', label: 'Type', type: 'select', required: true, options: ['Business', 'Personal', 'Admin', 'Creative'] },
  ];

  const openWorkspaceForm = () => {
    setIsMenuOpen(false);
    setFormVisible(true);
  };

  const handleWorkspaceFormSubmit = async (values) => {
    setFormLoading(true);
    const { error: err } = await insertWorkspace(user.id, values);
    setFormLoading(false);
    if (err) {
      Alert.alert('Error', err.message);
      return;
    }
    setFormVisible(false);
    refetch();
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const { error: err } = await deleteWorkspace(selectedProject.id);
    if (err) {
      Alert.alert('Error', err.message);
      return;
    }
    handleCloseOptions();
    refetch();
  };

  const filteredWorkspaces = workspaces.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const renderWorkspaceCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => handleWorkspacePress(item)}
    >
      <ImageBackground 
        source={{ uri: item.image }} 
        style={styles.cardImage}
        imageStyle={{ borderRadius: 20 }}
      >
        <View style={styles.imageOverlay}>
          <View style={[styles.typeBadge, { backgroundColor: item.color }]}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => setSelectedProject(item)}
          >
            <MoreVertical size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.docInfo}>
            <FileText size={14} color="#666" />
            <Text style={styles.docCount}>{item.documentCount} Files</Text>
          </View>
          <Text style={styles.lastModified}>{item.lastModified}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={() => {
      closeSearch();
      setIsMenuOpen(false);
    }}>
      <View style={styles.container}>
        <View style={styles.header}>
          {!isSearchActive ? (
            <>
              <View>
                <Text style={styles.title}>Workspace</Text>
                <Text style={styles.subtitle}>Manage your projects & files</Text>
              </View>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => setIsSearchActive(true)}
              >
                <Search size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.searchBarContainer}>
              <Search size={20} color={colors.textSecondary} style={styles.searchIconInside} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search projects..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={closeSearch}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FlatList
          data={filteredWorkspaces}
          renderItem={renderWorkspaceCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridPadding}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{searchQuery ? 'No results' : 'No projects yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No workspaces matching "${searchQuery}"` : 'Tap + to create a project or client workspace'}
              </Text>
            </View>
          }
        />

        {isMenuOpen && (
          <View style={styles.menuOverlay}>
            <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
              <FileUp size={18} color={colors.primary} />
              <Text style={styles.pillText}>Upload Files</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuPill} onPress={openWorkspaceForm}>
              <Briefcase size={18} color={colors.primary} />
              <Text style={styles.pillText}>New Project/Client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={styles.pillText}>Document Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.pillText}>Analyze Project/Client</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={!!selectedProject}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseOptions}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseOptions}
          >
            <View style={styles.optionsContainer}>
              {!isConfirmingDelete ? (
                <>
                  <View style={styles.optionsHeader}>
                    <Text style={styles.optionsTitle} numberOfLines={1}>{selectedProject?.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.optionItem} onPress={handleCloseOptions}>
                    <CheckCircle size={20} color={colors.primary} />
                    <Text style={styles.optionText}>Mark as Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionItem} onPress={handleCloseOptions}>
                    <HardDrive size={20} color="#555" />
                    <Text style={styles.optionText}>Import Drive</Text>
                  </TouchableOpacity>
                  <View style={styles.optionDivider} />
                  <TouchableOpacity style={styles.optionItem} onPress={() => setIsConfirmingDelete(true)}>
                    <Trash2 size={20} color="#FF3B30" />
                    <Text style={[styles.optionText, { color: '#FF3B30' }]}>Delete Project</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.confirmDeleteContainer}>
                  <AlertTriangle size={40} color="#FF3B30" style={{ marginBottom: 15 }} />
                  <Text style={styles.confirmTitle}>Delete this project?</Text>
                  <Text style={styles.confirmSubtitle}>This will permanently remove all files and AI analysis for "{selectedProject?.title}".</Text>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteProject}
                  >
                    <Text style={styles.deleteButtonText}>Yes, Delete Project</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setIsConfirmingDelete(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        <FormModal
          visible={formVisible}
          title="New Project/Client"
          fields={WORKSPACE_FIELDS}
          onSubmit={handleWorkspaceFormSubmit}
          onClose={() => setFormVisible(false)}
          loading={formLoading}
        />

        <TouchableOpacity
          style={[styles.fab, isMenuOpen && styles.fabActive]}
          onPress={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X color="#fff" size={30} /> : <Plus color="#fff" size={30} />}
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    minHeight: 90,
  },
  title: { ...typography.heading1, color: colors.textPrimary, fontSize: 28 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  iconButton: { padding: 8, backgroundColor: '#F1F3F5', borderRadius: 12 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 15, paddingHorizontal: 12, height: 50 },
  searchIconInside: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  gridPadding: { padding: 16, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardImage: { height: 120, width: '100%' },
  imageOverlay: { flex: 1, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.15)' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docInfo: { flexDirection: 'row', alignItems: 'center' },
  docCount: { fontSize: 12, color: '#666', marginLeft: 4 },
  lastModified: { fontSize: 10, color: '#999' },
  fab: { position: 'absolute', bottom: 10, right: 10, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 2000 },
  fabActive: { backgroundColor: '#333' },
  menuOverlay: { position: 'absolute', bottom: 80, right: 10, alignItems: 'flex-end', zIndex: 1999 },
  menuPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, marginBottom: 10, elevation: 4, borderWidth: 1, borderColor: '#eee' },
  pillText: { marginLeft: 8, fontWeight: '600', color: '#333', fontSize: 13 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsContainer: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  optionsHeader: { paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 10 },
  optionsTitle: { fontSize: 16, fontWeight: '800', color: '#333', textAlign: 'center' },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 15 },
  optionDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 5 },
  confirmDeleteContainer: { alignItems: 'center', paddingVertical: 10 },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 10 },
  confirmSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25, paddingHorizontal: 20 },
  deleteButton: { backgroundColor: '#FF3B30', width: '100%', paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginBottom: 12 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' }
});