import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformEmail } from '../lib/transforms';
import { supabase } from '../lib/supabase';
import DataStateView from '../components/DataStateView';

export default function InboxScreen({ onSelectEmail, onUnreadCountChange }) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLabel, setActiveLabel] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: emails, loading, error, refetch } = useSupabaseQuery('emails', {
    filters: { user_id: user.id },
    orderBy: { column: 'timestamp', ascending: false },
    transform: transformEmail,
  });

  // Derive available providers from actual email data
  const availableProviders = useMemo(() => {
    if (!emails || emails.length === 0) return [];
    const providers = new Set(emails.map((e) => e.provider));
    return Array.from(providers);
  }, [emails]);

  // Derive available labels from actual email data
  const availableLabels = useMemo(() => {
    if (!emails || emails.length === 0) return [];
    const labels = new Set(emails.map((e) => e.label).filter((l) => l && l !== 'Uncategorized'));
    return Array.from(labels).sort();
  }, [emails]);

  // Filter emails by selected provider + label
  const filteredEmails = useMemo(() => {
    if (!emails) return [];
    let result = emails;
    if (activeFilter !== 'all') result = result.filter((e) => e.provider === activeFilter);
    if (activeLabel !== 'all') result = result.filter((e) => e.label === activeLabel);
    return result;
  }, [emails, activeFilter, activeLabel]);

  // Compute unread count and notify parent
  const unreadCount = useMemo(() => {
    const count = emails ? emails.filter((e) => !e.isRead).length : 0;
    return count;
  }, [emails]);

  // Notify parent of unread count changes
  React.useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const markAsRead = useCallback(async (emailId) => {
    await supabase
      .from('emails')
      .update({ is_read: true })
      .eq('id', emailId);
  }, []);

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const getProviderStyle = (provider) => {
    switch (provider) {
      case 'gmail': return { label: 'Gmail', color: colors.providerGmail };
      case 'outlook': return { label: 'Outlook', color: colors.providerOutlook };
      default: return { label: 'Email', color: colors.textSecondary };
    }
  };

  const getLabelStyle = (label) => {
    switch (label) {
      case 'Work': return { label: 'Work', color: colors.emailWork };
      case 'Personal': return { label: 'Personal', color: colors.emailPersonal };
      case 'School': return { label: 'School', color: colors.emailSchool };
      case 'Business': return { label: 'Business', color: colors.emailBusiness };
      case 'Invoices': return { label: 'Invoices', color: colors.emailInvoices };
      case 'Newsletters': return { label: 'Newsletters', color: colors.emailNewsletters };
      default: return { label: label || 'Uncategorized', color: colors.emailUncategorized };
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    ...availableProviders.map((p) => ({
      key: p,
      label: getProviderStyle(p).label,
    })),
  ];

  const renderEmailItem = ({ item }) => {
    const provider = getProviderStyle(item.provider);
    const label = getLabelStyle(item.label);
    const isUnread = !item.isRead;

    const handlePress = () => {
      // Mark as read on tap
      if (isUnread) {
        markAsRead(item.id);
        // Optimistically update local state by refetching
        refetch();
      }
      if (onSelectEmail) {
        onSelectEmail({
          ...item,
          type: 'email_summary',
          title: item.subject,
          targetAccount: `${provider.label}: ${item.providerAccountEmail || 'Connected'}`,
          detail: item.preview || '',
        });
      }
    };

    return (
      <TouchableOpacity
        style={styles.emailRow}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.leftColumn}>
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.contentColumn}>
          <View style={styles.topRow}>
            <Text
              style={[styles.sender, isUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {item.sender}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>

          <Text
            style={[styles.subject, isUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {item.subject}
          </Text>

          <View style={styles.bottomRow}>
            <View style={[styles.providerBadge, { backgroundColor: provider.color + '1A' }]}>
              <Text style={[styles.badgeLabel, { color: provider.color }]}>
                {provider.label}
              </Text>
            </View>
            {item.label && item.label !== 'Uncategorized' && (
              <View style={[styles.labelBadge, { backgroundColor: label.color + '1A' }]}>
                <Text style={[styles.badgeLabel, { color: label.color }]}>
                  {label.label}
                </Text>
              </View>
            )}
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Provider filter bar — only show if there are emails */}
      {emails && emails.length > 0 && filterOptions.length > 1 && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filterOptions.map((option) => {
              const isActive = activeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(option.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Label filter bar — only show if there are classified labels */}
      {emails && emails.length > 0 && availableLabels.length > 0 && (
        <View style={styles.labelFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, activeLabel === 'all' && styles.filterPillActive]}
              onPress={() => setActiveLabel('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, activeLabel === 'all' && styles.filterPillTextActive]}>All Labels</Text>
            </TouchableOpacity>
            {availableLabels.map((label) => {
              const isActive = activeLabel === label;
              const style = getLabelStyle(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.filterPill, isActive && { backgroundColor: style.color, borderColor: style.color }]}
                  onPress={() => setActiveLabel(label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, isActive && { color: '#FFFFFF', fontWeight: typography.fontWeight.semibold }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredEmails}
        renderItem={renderEmailItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {activeFilter !== 'all' || activeLabel !== 'all'
                ? 'No matching emails'
                : 'No emails yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter !== 'all' || activeLabel !== 'all'
                ? 'Try changing your filters to see more emails'
                : 'Connect Gmail or Outlook in Account settings to sync your inbox'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  filterBar: {
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 10,
  },
  labelFilterBar: {
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.bodySmall,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  emailRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
  },
  leftColumn: {
    width: 24,
    alignItems: 'center',
    paddingTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  contentColumn: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sender: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  subject: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  labelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeLabel: {
    ...typography.caption,
    fontWeight: typography.fontWeight.medium,
  },
  preview: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadText: {
    fontWeight: typography.fontWeight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.backgroundDark,
    marginLeft: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
