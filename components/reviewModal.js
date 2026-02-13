import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Check,
  X,
  Calendar,
  DollarSign,
  Mail,
  Info,
  Mic,
  Search,
  Zap,
  FileText,
  User,
  Edit3,
  CheckSquare,
  FolderPlus,
  PenTool,
} from 'lucide-react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

/**
 * Intent type badge colors
 */
const INTENT_COLORS = {
  log: { bg: '#E8F5E9', text: '#2E7D32', label: 'LOG' },
  query: { bg: '#E3F2FD', text: '#1565C0', label: 'QUERY' },
  act: { bg: '#FFF3E0', text: '#E65100', label: 'ACT' },
};

/**
 * Category icons
 */
const CATEGORY_ICONS = {
  expense: DollarSign,
  income: DollarSign,
  transaction: DollarSign,
  event: Calendar,
  contact: User,
  note: FileText,
  email: Mail,
  task: Check,
  todo: CheckSquare,
  workspace: FolderPlus,
  draft: PenTool,
  general: Info,
};

/**
 * Get the confirm button label based on intent type and category
 */
function getConfirmLabel(intentType, category) {
  if (intentType === 'query') return 'Ask';
  if (intentType === 'act') {
    switch (category) {
      case 'email': return 'Send';
      case 'event': return 'Schedule';
      case 'todo': return 'Create';
      case 'workspace': return 'Create';
      case 'draft': return 'Save Draft';
      default: return 'Execute';
    }
  }
  return 'Approve';
}

export default function ReviewModal({
  isVisible,
  draft,
  transcript,
  queryResponse,
  actResult,
  onConfirm,
  onReject,
  onDismissQuery,
  onDismissAct,
}) {
  // Editable state
  const [editedDraft, setEditedDraft] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Reset state when draft changes
  useEffect(() => {
    if (draft) {
      setEditedDraft({ ...draft });
      // ACT intents start in editing mode so users can review/edit fields
      setIsEditing(draft.intentType === 'act');
    }
  }, [draft]);

  if (!draft || !editedDraft) return null;

  const isVoiceIntent = !!transcript || !!draft.intentType;
  const intentType = draft.intentType || draft.type;
  const intentStyle = INTENT_COLORS[intentType] || INTENT_COLORS.log;

  // Get appropriate icon
  const getHeaderInfo = () => {
    if (isVoiceIntent) {
      const IconComponent = CATEGORY_ICONS[draft.category] || Mic;
      return {
        icon: <IconComponent color={colors.primary} size={24} />,
        title: draft.category ? draft.category.toUpperCase() : 'VOICE COMMAND',
      };
    }

    switch (draft.type) {
      case 'calendar':
        return { icon: <Calendar color={colors.primary} size={24} />, title: 'Calendar Draft' };
      case 'finance':
      case 'finance_record':
        return { icon: <DollarSign color={colors.secondary} size={24} />, title: 'Finance Entry' };
      case 'email_summary':
        return { icon: <Mail color={colors.primary} size={24} />, title: 'AI Briefing' };
      case 'contact':
        return { icon: <User color={colors.primary} size={24} />, title: 'New Contact' };
      default:
        return { icon: <Info color={colors.accent} size={24} />, title: 'Review' };
    }
  };

  const header = getHeaderInfo();
  const isSummary = draft.type === 'email_summary';

  // Handle field changes
  const updateField = (field, value) => {
    setEditedDraft(prev => ({
      ...prev,
      [field]: value,
      entities: {
        ...prev.entities,
        [field]: value,
      },
    }));
  };

  // Handle confirm with edited data
  const handleConfirm = () => {
    onConfirm(editedDraft);
  };

  // Render intent badge
  const renderIntentBadge = () => {
    if (!isVoiceIntent) return null;

    const IntentIcon = intentType === 'query' ? Search : intentType === 'act' ? Zap : FileText;

    return (
      <View style={[styles.intentBadge, { backgroundColor: intentStyle.bg }]}>
        <IntentIcon color={intentStyle.text} size={14} />
        <Text style={[styles.intentBadgeText, { color: intentStyle.text }]}>
          {intentStyle.label}
        </Text>
      </View>
    );
  };

  // Render editable fields based on intent type + category
  const renderEditableFields = () => {
    if (!isVoiceIntent || !isEditing) return null;

    const category = draft.category;
    const entities = editedDraft.entities || {};

    // ACT-specific fields per category
    if (intentType === 'act') {
      return (
        <View style={styles.editableFields}>
          {renderActFields(category, entities)}
        </View>
      );
    }

    // LOG fields (existing behavior)
    return (
      <View style={styles.editableFields}>
        {/* Amount field for expense/income */}
        {(category === 'expense' || category === 'income') && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(Math.abs(entities.amount || 0))}
                onChangeText={(val) => updateField('amount', parseFloat(val) || 0)}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>
        )}

        {/* Category/Description field */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputFull]}
            value={entities.description || editedDraft.detail || ''}
            onChangeText={(val) => updateField('description', val)}
            placeholder="Add description..."
            multiline
          />
        </View>

        {/* Date field for events */}
        {category === 'event' && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputFull]}
              value={entities.date || ''}
              onChangeText={(val) => updateField('date', val)}
              placeholder="Tomorrow, March 15, etc."
            />
          </View>
        )}

        {/* Person field for contacts */}
        {category === 'contact' && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputFull]}
              value={entities.person || ''}
              onChangeText={(val) => updateField('person', val)}
              placeholder="Contact name"
            />
          </View>
        )}
      </View>
    );
  };

  // Render ACT-specific editable fields per category
  const renderActFields = (category, entities) => {
    switch (category) {
      case 'email':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>To</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.to || ''}
                onChangeText={(val) => updateField('to', val)}
                placeholder="Recipient name or email"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.subject || editedDraft.title || ''}
                onChangeText={(val) => updateField('subject', val)}
                placeholder="Email subject"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull, { minHeight: 80 }]}
                value={entities.body || editedDraft.detail || ''}
                onChangeText={(val) => updateField('body', val)}
                placeholder="Email body..."
                multiline
              />
            </View>
          </>
        );

      case 'event':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Event Title</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.title || editedDraft.title || ''}
                onChangeText={(val) => updateField('title', val)}
                placeholder="Meeting name"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.date || ''}
                onChangeText={(val) => updateField('date', val)}
                placeholder="Tomorrow, March 15, etc."
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.time || ''}
                onChangeText={(val) => updateField('time', val)}
                placeholder="2:00 PM"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Duration</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.duration || ''}
                onChangeText={(val) => updateField('duration', val)}
                placeholder="1 hour"
              />
            </View>
            {entities.location !== undefined && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputFull]}
                  value={entities.location || ''}
                  onChangeText={(val) => updateField('location', val)}
                  placeholder="Location"
                />
              </View>
            )}
          </>
        );

      case 'todo':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Task</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.title || editedDraft.title || ''}
                onChangeText={(val) => updateField('title', val)}
                placeholder="Task description"
              />
            </View>
            {(entities.due_date !== undefined || true) && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Due Date</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputFull]}
                  value={entities.due_date || ''}
                  onChangeText={(val) => updateField('due_date', val)}
                  placeholder="Friday, March 15, etc."
                />
              </View>
            )}
          </>
        );

      case 'workspace':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Workspace Name</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.title || editedDraft.title || ''}
                onChangeText={(val) => updateField('title', val)}
                placeholder="Project Alpha"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Type</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.type || 'Personal'}
                onChangeText={(val) => updateField('type', val)}
                placeholder="Business, Personal, Admin, Creative"
              />
            </View>
          </>
        );

      case 'contact':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.name || entities.person || ''}
                onChangeText={(val) => updateField('name', val)}
                placeholder="Contact name"
              />
            </View>
            {(entities.phone !== undefined || true) && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputFull]}
                  value={entities.phone || ''}
                  onChangeText={(val) => updateField('phone', val)}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
            )}
            {entities.company !== undefined && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Company</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputFull]}
                  value={entities.company || ''}
                  onChangeText={(val) => updateField('company', val)}
                  placeholder="Company"
                />
              </View>
            )}
            {entities.role !== undefined && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Role</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputFull]}
                  value={entities.role || ''}
                  onChangeText={(val) => updateField('role', val)}
                  placeholder="Role"
                />
              </View>
            )}
          </>
        );

      case 'transaction':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={String(Math.abs(entities.amount || 0))}
                  onChangeText={(val) => updateField('amount', parseFloat(val) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.description || entities.store || editedDraft.detail || ''}
                onChangeText={(val) => updateField('description', val)}
                placeholder="What is this for?"
                multiline
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.category || 'Personal Expenses'}
                onChangeText={(val) => updateField('category', val)}
                placeholder="Income, Personal Expenses, Business Expenses"
              />
            </View>
          </>
        );

      case 'draft':
        return (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>To</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.to || ''}
                onChangeText={(val) => updateField('to', val)}
                placeholder="Recipient (optional)"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull]}
                value={entities.subject || editedDraft.title || ''}
                onChangeText={(val) => updateField('subject', val)}
                placeholder="Subject"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Body</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputFull, { minHeight: 80 }]}
                value={entities.body || editedDraft.detail || ''}
                onChangeText={(val) => updateField('body', val)}
                placeholder="Draft content..."
                multiline
              />
            </View>
          </>
        );

      default:
        return (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Details</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputFull]}
              value={editedDraft.detail || ''}
              onChangeText={(val) => updateField('description', val)}
              placeholder="Details..."
              multiline
            />
          </View>
        );
    }
  };

  // Determine button label
  const confirmLabel = getConfirmLabel(intentType, draft.category);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onReject}
    >
      <TouchableWithoutFeedback onPress={onReject}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centeredView}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalView}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {header.icon}
                  <Text style={styles.modalTitle}>{header.title}</Text>
                </View>
                {renderIntentBadge()}
              </View>

              {/* Transcript (if voice) */}
              {transcript && !actResult && (
                <View style={styles.transcriptContainer}>
                  <Mic color={colors.textDisabled} size={14} />
                  <Text style={styles.transcriptText} numberOfLines={2}>
                    "{transcript}"
                  </Text>
                </View>
              )}

              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main content */}
                <View style={styles.content}>
                  {/* ACT result display */}
                  {actResult ? (
                    <View style={styles.actResultContainer}>
                      <View style={styles.actResultIcon}>
                        <Check color="#2E7D32" size={32} />
                      </View>
                      <Text style={styles.actResultTitle}>Done!</Text>
                      <Text style={styles.actResultDetail}>
                        {getActSuccessMessage(draft.category, editedDraft)}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.mainDetail}>{editedDraft.title}</Text>
                      {editedDraft.detail && !isEditing && (
                        <Text style={styles.subDetail}>{editedDraft.detail}</Text>
                      )}

                      {/* Confidence indicator */}
                      {draft.confidence && (
                        <View style={styles.confidenceRow}>
                          <View style={styles.confidenceBar}>
                            <View
                              style={[
                                styles.confidenceFill,
                                { width: `${draft.confidence * 100}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.confidenceText}>
                            {Math.round(draft.confidence * 100)}% confident
                          </Text>
                        </View>
                      )}

                      {/* Query response display */}
                      {queryResponse && (
                        <View style={styles.queryResponseContainer}>
                          <Text style={styles.queryResponseText}>{queryResponse}</Text>
                        </View>
                      )}

                      {/* Editable fields (hidden when showing query response) */}
                      {!queryResponse && renderEditableFields()}

                      <Text style={styles.contextHint}>
                        {editedDraft.targetAccount || 'Saelo'}
                      </Text>
                    </>
                  )}
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.buttonRow}>
                {actResult ? (
                  /* After ACT result: single "Done" dismiss button */
                  <TouchableOpacity
                    style={[styles.button, styles.buttonActSuccess, { flex: 1 }]}
                    onPress={onDismissAct || onReject}
                  >
                    <Check color="white" size={24} style={{ marginRight: 8 }} />
                    <Text style={styles.confirmText}>Done</Text>
                  </TouchableOpacity>
                ) : queryResponse ? (
                  /* After query response: single "Got it" dismiss button */
                  <TouchableOpacity
                    style={[styles.button, styles.buttonConfirm, { flex: 1 }]}
                    onPress={onDismissQuery || onReject}
                  >
                    <Check color="white" size={24} style={{ marginRight: 8 }} />
                    <Text style={styles.confirmText}>Got it</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* Cancel button */}
                    {!isSummary && (
                      <TouchableOpacity
                        style={[styles.button, styles.buttonReject]}
                        onPress={onReject}
                      >
                        <X color="white" size={24} />
                      </TouchableOpacity>
                    )}

                    {/* Edit toggle button (for LOG voice intents, not for queries/ACT) */}
                    {isVoiceIntent && !isSummary && intentType !== 'query' && intentType !== 'act' && (
                      <TouchableOpacity
                        style={[styles.button, styles.buttonEdit, isEditing && styles.buttonEditActive]}
                        onPress={() => setIsEditing(!isEditing)}
                      >
                        <Edit3 color={isEditing ? 'white' : colors.primary} size={20} />
                      </TouchableOpacity>
                    )}

                    {/* Confirm button */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        isSummary ? styles.buttonSummary :
                        intentType === 'act' ? styles.buttonAct :
                        styles.buttonConfirm
                      ]}
                      onPress={handleConfirm}
                    >
                      {isSummary ? (
                        <Text style={styles.confirmText}>Got it</Text>
                      ) : (
                        <>
                          {intentType === 'query' && <Search color="white" size={24} style={{ marginRight: 8 }} />}
                          {intentType === 'act' && <Zap color="white" size={24} style={{ marginRight: 8 }} />}
                          {intentType !== 'query' && intentType !== 'act' && <Check color="white" size={24} style={{ marginRight: 8 }} />}
                          <Text style={styles.confirmText}>{confirmLabel}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Get a user-friendly success message for ACT results
 */
function getActSuccessMessage(category, draft) {
  const entities = draft?.entities || {};
  switch (category) {
    case 'email':
      return `Email sent to ${entities.to || 'recipient'}.`;
    case 'event':
      return `Event "${entities.title || draft?.title || 'event'}" scheduled${entities.date ? ` for ${entities.date}` : ''}.`;
    case 'todo':
      return `Task "${entities.title || draft?.title || 'task'}" created.`;
    case 'workspace':
      return `Workspace "${entities.title || draft?.title || 'workspace'}" created.`;
    case 'contact':
      return `Contact "${entities.name || entities.person || 'contact'}" added.`;
    case 'transaction':
      return `Transaction of $${Math.abs(entities.amount || 0)} recorded.`;
    case 'draft':
      return `Draft "${entities.subject || draft?.title || 'draft'}" saved.`;
    default:
      return 'Action completed successfully.';
  }
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '88%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  intentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transcriptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary || '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  transcriptText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  scrollContent: {
    maxHeight: 300,
  },
  content: {
    marginBottom: 24,
  },
  mainDetail: {
    ...typography.heading3,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  subDetail: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  queryResponseContainer: {
    marginTop: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  queryResponseText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  actResultContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  actResultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actResultTitle: {
    ...typography.heading3,
    fontSize: 22,
    color: '#2E7D32',
    marginBottom: 8,
  },
  actResultDetail: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  editableFields: {
    marginTop: 16,
    gap: 12,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  fieldInputFull: {
    minHeight: 44,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  contextHint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonReject: {
    flex: 1,
    backgroundColor: colors.textDisabled,
  },
  buttonEdit: {
    width: 58,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonEditActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonConfirm: {
    flex: 2,
    backgroundColor: colors.primary,
  },
  buttonAct: {
    flex: 2,
    backgroundColor: '#E65100',
  },
  buttonActSuccess: {
    backgroundColor: '#2E7D32',
  },
  buttonSummary: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  confirmText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
