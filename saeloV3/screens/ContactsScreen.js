import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { Search, Plus, MapPin, Calendar as CalendarIcon, Target, MoreHorizontal, Mic, X, UserPlus, MessageSquare, Clock, Paperclip, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformContact } from '../lib/transforms';
import DataStateView from '../components/DataStateView';
import FormModal from '../components/FormModal';
import { insertContact, syncDeviceContacts } from '../lib/mutations';

const GROUPS = ['All', 'Friends', 'Colleagues', 'Family', 'Vendors', 'Partners', 'Employees'];
const FILTERS = ['New Connection', 'Followed-Up', 'Reached Out'];

export default function ContactsScreen({ onSelectContact }) {
  const [activeGroup, setActiveGroup] = useState('All');
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { user } = useAuth();
  const { data: contacts, loading, error, refetch } = useSupabaseQuery('contacts', {
    filters: { user_id: user.id },
    orderBy: { column: 'when_met', ascending: false },
    transform: transformContact,
  });

  const handleContactPress = (contact) => {
    if (onSelectContact) {
      onSelectContact({
        ...contact,
        type: 'contact_preview', 
        title: contact.name, // Title for the InfoCardModal
        targetAccount: `${contact.role} at ${contact.company}`, // Subtitle for the InfoCardModal
        detail: `AI Summary: Met at ${contact.where} on ${contact.when}. \n\nGoal: ${contact.why}. \n\nCurrent Status: ${contact.status}.`,
        notes: `Met at ${contact.where}. Reason for connection: ${contact.why}. Follow-up status: ${contact.status}.`
      });
    }
  };

  const CONTACT_FIELDS = [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Full name' },
    { key: 'role', label: 'Role / Title', type: 'text', placeholder: 'e.g. Head of Operations' },
    { key: 'company', label: 'Company', type: 'text', placeholder: 'e.g. Nexus AI' },
    { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 (555) 123-4567' },
    { key: 'group', label: 'Group', type: 'select', options: ['Friends', 'Colleagues', 'Family', 'Vendors', 'Partners', 'Employees'] },
    { key: 'whereMet', label: 'Where Met', type: 'text', placeholder: 'e.g. TechCrunch Disrupt' },
    { key: 'why', label: 'Why / Notes', type: 'text', placeholder: 'Reason for connection' },
  ];

  const openContactForm = () => {
    setIsMenuOpen(false);
    setFormVisible(true);
  };

  const handleContactFormSubmit = async (values) => {
    setFormLoading(true);
    const { error: err } = await insertContact(user.id, values);
    setFormLoading(false);
    if (err) {
      Alert.alert('Error', err.message);
      return;
    }
    setFormVisible(false);
    refetch();
  };

  const handleSyncContacts = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Device Only', 'Contact sync is available on your phone. Please use the mobile app to sync contacts from your device.');
      return;
    }

    try {
      const Contacts = require('expo-contacts');
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Saelo needs access to your contacts to sync them.');
        return;
      }

      setSyncing(true);
      setIsMenuOpen(false);

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Company, Contacts.Fields.JobTitle],
      });

      if (!data || data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on your device.');
        setSyncing(false);
        return;
      }

      const deviceContacts = data
        .filter(c => c.name)
        .map(c => ({
          name: c.name,
          phone: c.phoneNumbers?.[0]?.number || null,
          company: c.company || null,
          role: c.jobTitle || null,
        }));

      const { error: syncError, count } = await syncDeviceContacts(user.id, deviceContacts);
      setSyncing(false);

      if (syncError) {
        Alert.alert('Sync Error', syncError.message);
      } else if (count === 0) {
        Alert.alert('All Synced', 'All your device contacts are already in Saelo.');
      } else {
        Alert.alert('Sync Complete', `${count} new contact${count === 1 ? '' : 's'} added to Saelo.`);
        refetch();
      }
    } catch (err) {
      setSyncing(false);
      Alert.alert('Error', err.message || 'Failed to sync contacts.');
    }
  };

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(contact => {
      const matchesGroup = activeGroup === 'All' ? true : contact.group === activeGroup;
      const matchesFilter = activeFilter ? contact.status === activeFilter : true;
      const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGroup && matchesFilter && matchesSearch;
    });
  }, [activeGroup, activeFilter, searchQuery, contacts]);

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'New Connection': return { bg: '#E3F2FD', text: '#1976D2' };
      case 'Followed-Up': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'Reached Out': return { bg: '#FFF3E0', text: '#E65100' };
      default: return { bg: '#F5F5F5', text: '#666' };
    }
  };

  const renderContactCard = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleContactPress(item)} // Now correctly triggers handleContactPress
      >
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.photo }} style={styles.avatar} />
          <View style={styles.nameContainer}>
            <Text style={styles.contactName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
            </View>
          </View>
          <TouchableOpacity><MoreHorizontal size={20} color="#CCC" /></TouchableOpacity>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.detailText} numberOfLines={1}>{item.where}</Text>
          </View>
          <View style={styles.detailItem}>
            <CalendarIcon size={14} color={colors.primary} />
            <Text style={styles.detailText}>{item.when}</Text>
          </View>
        </View>

        <View style={styles.whySection}>
          <Target size={14} color="#666" />
          <Text style={styles.whyText} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>Why: </Text>{item.why}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topActionArea}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#999" style={{ marginLeft: 12 }} />
          <TextInput 
            placeholder="Search network..." 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.micButton}>
            <Mic size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.groupBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
          {GROUPS.map(group => (
            <TouchableOpacity 
              key={group} 
              onPress={() => setActiveGroup(group)}
              style={[styles.groupTab, activeGroup === group && styles.groupTabActive]}
            >
              <Text style={[styles.groupLabel, activeGroup === group && styles.groupLabelActive]}>{group}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter} 
              onPress={() => setActiveFilter(activeFilter === filter ? null : filter)}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
            >
              <Text style={[styles.filterLabel, activeFilter === filter && styles.filterLabelActive]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {syncing && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.syncText}>Syncing contacts from device...</Text>
        </View>
      )}

      <FlatList
        data={filteredContacts}
        renderItem={renderContactCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listPadding}
        ListHeaderComponent={
          <Text style={styles.sectionHeader}>
            {activeGroup === 'All' ? 'Full Network' : activeGroup}
            {activeFilter ? ` • ${activeFilter}s` : ''}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? `No results for "${searchQuery}"` : 'Tap + to add a contact or sync from your device'}
            </Text>
          </View>
        }
      />

      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuPill} onPress={handleSyncContacts}>
            <RefreshCw size={18} color={colors.primary} />
            <Text style={styles.pillText}>Sync All Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={openContactForm}>
            <UserPlus size={18} color={colors.primary} />
            <Text style={styles.pillText}>Add New Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <MessageSquare size={18} color={colors.primary} />
            <Text style={styles.pillText}>Log Interaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <Clock size={18} color={colors.primary} />
            <Text style={styles.pillText}>Set Follow-Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <Paperclip size={18} color={colors.primary} />
            <Text style={styles.pillText}>Upload Business Card</Text>
          </TouchableOpacity>
        </View>
      )}

      <FormModal
        visible={formVisible}
        title="Add New Contact"
        fields={CONTACT_FIELDS}
        onSubmit={handleContactFormSubmit}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topActionArea: { padding: 16, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 15, height: 50 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 16 },
  micButton: { padding: 10, marginRight: 5 },
  groupBarContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  groupScroll: { paddingHorizontal: 10, paddingVertical: 12 },
  groupTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  groupTabActive: { backgroundColor: colors.primary },
  groupLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  groupLabelActive: { color: '#fff' },
  filterBarContainer: { backgroundColor: '#F8F9FA' },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 15, marginRight: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' },
  filterPillActive: { backgroundColor: '#333', borderColor: '#333' },
  filterLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  filterLabelActive: { color: '#fff' },
  listPadding: { padding: 16, paddingBottom: 100 },
  sectionHeader: { ...typography.body, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE' },
  nameContainer: { flex: 1, marginLeft: 12 },
  contactName: { fontSize: 17, fontWeight: '700', color: '#000' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailsGrid: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginTop: 4 },
  detailText: { marginLeft: 6, fontSize: 13, color: '#666' },
  whySection: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  whyText: { marginLeft: 8, fontSize: 13, color: '#444', lineHeight: 18, flex: 1 },
  fab: { 
    position: 'absolute', 
    bottom: 10, 
    right: 10, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5, 
    zIndex: 2000 
  },
  fabActive: { backgroundColor: '#333' },
  menuOverlay: { 
    position: 'absolute', 
    bottom: 80, 
    right: 10, 
    alignItems: 'flex-end', 
    zIndex: 1999 
  },
  menuPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 25, 
    marginBottom: 10, 
    elevation: 4, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  pillText: { marginLeft: 8, fontWeight: '600', color: '#333', fontSize: 13 },
  syncBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F2FD', paddingVertical: 10, paddingHorizontal: 16 },
  syncText: { marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#1976D2' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});