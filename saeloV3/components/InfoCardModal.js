import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback, Pressable } from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { 
  X, 
  Mail, 
  Calendar, 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  MapPin, 
  Briefcase, 
  Smartphone,
  ExternalLink
} from 'lucide-react-native';

export default function InfoCardModal({ isVisible, data, onClose }) {
  if (!data) return null;

  // Helper to render badges for "Business" or "Personal" context
  const ContextBadge = ({ type }) => (
    <View style={[styles.badge, type === 'Business' ? styles.businessBadge : styles.personalBadge]}>
      <Text style={styles.badgeText}>{type}</Text>
    </View>
  );

  const renderContent = () => {
    switch (data.type) {
      case 'email_summary':
        return (
          <View>
            <View style={styles.headerRow}>
              <Mail size={20} color={colors.primary} />
              <Text style={styles.modalCategory}>Email Summary</Text>
            </View>
            <Text style={styles.modalTitle}>{data.title}</Text>
            <Text style={styles.accountLabel}>{data.targetAccount}</Text>
            
            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>AI SUMMARY</Text>
              <Text style={styles.bodyText}>{data.detail}</Text>
            </View>

            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>KEY TAKEAWAYS</Text>
              <Text style={styles.bulletItem}>• Action required regarding the deadline.</Text>
              <Text style={styles.bulletItem}>• Follow up scheduled for Friday.</Text>
            </View>
          </View>
        );

      case 'event_detail':
        return (
          <View>
            <View style={styles.headerRow}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.modalCategory}>Calendar Event</Text>
              <ContextBadge type={data.context || 'Business'} />
            </View>
            <Text style={styles.modalTitle}>{data.title}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Clock size={16} color="#666" />
                <Text style={styles.infoText}>{data.detail}</Text>
              </View>
              <View style={styles.infoItem}>
                <MapPin size={16} color="#666" />
                <Text style={styles.infoText}>{data.location || 'Google Meet / Zoom'}</Text>
              </View>
            </View>

            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>CONTEXT</Text>
              <Text style={styles.bodyText}>This session is focused on Q1 infrastructure planning. You previously discussed this in the 'Project Alpha' email thread.</Text>
            </View>
          </View>
        );

      case 'contact_preview':
        return (
          <View>
            <View style={styles.headerRow}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.modalCategory}>Network Insight</Text>
            </View>
            <Text style={styles.modalTitle}>{data.name}</Text>
            <View style={styles.companyRow}>
              <Briefcase size={16} color="#666" />
              <Text style={styles.companyText}>{data.company} • {data.role}</Text>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <Smartphone size={18} color={colors.primary} />
                <Text style={styles.actionText}>{data.phone}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Mail size={18} color={colors.primary} />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>CONNECTION NOTES</Text>
              <Text style={styles.bodyText}>{data.notes || "Met at TechCrunch Disrupt. Discussing AI infrastructure and potential partnership for Q3."}</Text>
            </View>
          </View>
        );

      case 'finance_detail':
        return (
          <View>
            <View style={styles.headerRow}>
              <DollarSign size={20} color="#6B8E4E" />
              <Text style={styles.modalCategory}>Financial Record</Text>
            </View>
            <Text style={styles.modalTitle}>{data.store}</Text>
            <Text style={styles.amountLarge}>{data.amount > 0 ? '+' : ''}${Math.abs(data.amount).toFixed(2)}</Text>

            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>TRANSACTION ANALYSIS</Text>
              <Text style={styles.bodyText}>This appears to be a recurring subscription. It is categorized under {data.category} and matched to your 'Business' tax profile.</Text>
            </View>

            <TouchableOpacity style={styles.attachmentButton}>
              <FileText size={18} color="#666" />
              <Text style={styles.attachmentText}>View Receipt / Invoice PDF</Text>
              <ExternalLink size={14} color="#999" />
            </TouchableOpacity>
          </View>
        );

      default:
        return <Text>No detailed information available.</Text>;
    }
  };

  return (
    <Modal 
      visible={isVisible} 
      animationType="slide" 
      transparent={true} 
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* TouchableWithoutFeedback prevents taps inside the card from closing the modal */}
        <TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            {/* The drag handle is a visual hint for swiping */}
            <View style={styles.dragHandle} />
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderContent()}
              {/* Extra padding at bottom for better scroll feel */}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '85%',
    // Shadow for better depth perception
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  dragHandle: { 
    width: 40, 
    height: 5, 
    backgroundColor: '#EEE', 
    borderRadius: 10, 
    alignSelf: 'center', 
    marginBottom: 15 
  },
  closeButton: { 
    position: 'absolute', 
    right: 20, 
    top: 20, 
    zIndex: 10 
  },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalCategory: { fontSize: 12, fontWeight: '800', color: '#666', textTransform: 'uppercase', marginLeft: 8, letterSpacing: 1 },
  modalTitle: { ...typography.heading1, fontSize: 24, marginBottom: 8 },
  
  aiSection: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 16, marginTop: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, marginBottom: 8, letterSpacing: 0.5 },
  bodyText: { ...typography.body, lineHeight: 22, color: '#444' },
  bulletItem: { ...typography.body, marginBottom: 4, color: '#444' },

  accountLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  infoGrid: { marginTop: 15 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 10, color: '#555', fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  businessBadge: { backgroundColor: '#E8F0FE' },
  personalBadge: { backgroundColor: '#E6F4EA' },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },

  companyRow: { flexDirection: 'row', alignItems: 'center' },
  companyText: { marginLeft: 8, color: '#666', fontWeight: '600' },
  actionGrid: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' },
  actionButton: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  actionText: { marginLeft: 8, fontWeight: '700', color: '#333' },

  amountLarge: { fontSize: 32, fontWeight: '900', color: '#000', marginVertical: 10 },
  attachmentButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F1F3F5', marginTop: 15 },
  attachmentText: { flex: 1, marginLeft: 12, fontWeight: '600', color: '#444' }
});