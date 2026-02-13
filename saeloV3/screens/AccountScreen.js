import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import {
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  CheckCircle,
  HardDrive,
  Zap,
  ShieldAlert,
  Pencil,
  RefreshCw,
  Unplug,
} from 'lucide-react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { useAuth } from '../contexts/AuthContext';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useSupabaseSingle } from '../hooks/useSupabaseQuery';
import { transformProfile } from '../lib/transforms';
import DataStateView from '../components/DataStateView';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const {
    isGoogleConnected,
    googleStatus,
    isNotionConnected,
    notionStatus,
    isSlackConnected,
    slackStatus,
    isMicrosoftConnected,
    microsoftStatus,
    loading: integrationLoading,
    syncing,
    connectGoogle,
    syncGoogle,
    disconnectGoogle,
    connectNotion,
    disconnectNotion,
    connectSlack,
    disconnectSlack,
    connectMicrosoft,
    syncMicrosoft,
    disconnectMicrosoft,
  } = useIntegrations();
  const [actionLoading, setActionLoading] = useState(false);
  const { data: profile, loading, error, refetch } = useSupabaseSingle('profiles', {
    match: { id: user.id },
    transform: transformProfile,
  });

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '';

  const SettingItem = ({ icon: Icon, label, value, isConnected, logoUrl }) => (
    <TouchableOpacity style={styles.item}>
      <View style={styles.itemLeft}>
        {logoUrl ? (
          <View style={styles.logoContainer}>
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          </View>
        ) : (
          <Icon color={colors.textSecondary} size={22} />
        )}
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <View style={styles.itemRight}>
        {isConnected && <CheckCircle color={colors.success} size={16} style={{marginRight: 8}} />}
        <Text style={[styles.itemValue, isConnected && {color: colors.success}]}>
          {value}
        </Text>
        <ChevronRight color={colors.textDisabled} size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Navigation Header */}
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>My Account</Text>
        <TouchableOpacity style={styles.editIconButton}>
          <Pencil size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Banner Area */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop' }} 
          style={styles.heroBanner}
        >
          <View style={styles.profileInfoContainer}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </ImageBackground>

        {/* Content Body */}
        <View style={styles.contentBody}>
          {/* Stats Section - Floating just below the image */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.statHeader}>
                <HardDrive size={18} color={colors.primary} />
                <Text style={styles.statLabel}>Used Space</Text>
              </View>
              <Text style={styles.statValue}>{profile.usedSpace} GB</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min((profile.usedSpace / 5) * 100, 100)}%` }]} />
              </View>
            </View>
            
            <View style={styles.statBox}>
              <View style={styles.statHeader}>
                <Zap size={18} color="#FBBC05" />
                <Text style={styles.statLabel}>AI Analyses</Text>
              </View>
              <Text style={styles.statValue}>{profile.aiAnalysesUsed} / {profile.aiAnalysesLimit}</Text>
              <Text style={styles.statSubtext}>Monthly Limit</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connections</Text>
            {isGoogleConnected ? (
              <View>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <Image
                      source={require('../assets/integrations/Gmail-Logo.png')}
                      style={styles.logoImage}
                    />
                    <View>
                      <Text style={styles.itemLabel}>Google</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {googleStatus?.provider_email || 'Connected'}
                      </Text>
                      {googleStatus?.last_sync_at && (
                        <Text style={{ fontSize: 11, color: colors.textDisabled, marginTop: 2 }}>
                          Last sync: {new Date(googleStatus.last_sync_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <CheckCircle color={colors.success} size={16} style={{ marginRight: 4 }} />
                  </View>
                </View>
                <View style={styles.googleActions}>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={async () => {
                      setActionLoading(true);
                      try {
                        const result = await syncGoogle();
                        Alert.alert('Sync Complete', `Synced ${result.emails_synced} emails and ${result.calendar_events_synced} calendar events.`);
                      } catch (err) {
                        Alert.alert('Sync Failed', err.message);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={syncing || actionLoading}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <RefreshCw color={colors.primary} size={16} />
                    )}
                    <Text style={styles.googleActionText}>Sync Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={() => {
                      Alert.alert(
                        'Disconnect Google?',
                        'This will revoke access and stop syncing. You can reconnect anytime.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Disconnect',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await disconnectGoogle();
                              } catch (err) {
                                Alert.alert('Error', err.message);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <Unplug color={colors.error} size={16} />
                    <Text style={[styles.googleActionText, { color: colors.error }]}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.item}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    await connectGoogle();
                    try { await syncGoogle(); } catch {}
                    Alert.alert('Connected', 'Google connected and syncing!');
                  } catch (err) {
                    Alert.alert('Connection Failed', err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={integrationLoading || actionLoading}
              >
                <View style={styles.itemLeft}>
                  <Image
                    source={require('../assets/integrations/Gmail-Logo.png')}
                    style={styles.logoImage}
                  />
                  <Text style={styles.itemLabel}>Connect Google</Text>
                </View>
                <View style={styles.itemRight}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ChevronRight color={colors.textDisabled} size={20} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            {/* Notion Connection */}
            {isNotionConnected ? (
              <View>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <Image
                      source={require('../assets/integrations/Notion-Logo.png')}
                      style={styles.logoImage}
                    />
                    <View>
                      <Text style={styles.itemLabel}>Notion</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {(() => {
                          try {
                            const parsed = JSON.parse(notionStatus?.scopes || '{}');
                            return parsed.workspace_name || 'Connected';
                          } catch { return 'Connected'; }
                        })()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <CheckCircle color={colors.success} size={16} style={{ marginRight: 4 }} />
                  </View>
                </View>
                <View style={styles.googleActions}>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={() => {
                      Alert.alert(
                        'Disconnect Notion?',
                        'This will revoke access. You can reconnect anytime.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Disconnect',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await disconnectNotion();
                              } catch (err) {
                                Alert.alert('Error', err.message);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <Unplug color={colors.error} size={16} />
                    <Text style={[styles.googleActionText, { color: colors.error }]}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.item}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    await connectNotion();
                    Alert.alert('Connected', 'Notion connected successfully!');
                  } catch (err) {
                    Alert.alert('Connection Failed', err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={integrationLoading || actionLoading}
              >
                <View style={styles.itemLeft}>
                  <Image
                    source={require('../assets/integrations/Notion-Logo.png')}
                    style={styles.logoImage}
                  />
                  <Text style={styles.itemLabel}>Connect Notion</Text>
                </View>
                <View style={styles.itemRight}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ChevronRight color={colors.textDisabled} size={20} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            {/* Slack Connection */}
            {isSlackConnected ? (
              <View>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <Image
                      source={require('../assets/integrations/Slack-Logo.png')}
                      style={styles.logoImage}
                    />
                    <View>
                      <Text style={styles.itemLabel}>Slack</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {(() => {
                          try {
                            const parsed = JSON.parse(slackStatus?.scopes || '{}');
                            return parsed.team_name || 'Connected';
                          } catch { return 'Connected'; }
                        })()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <CheckCircle color={colors.success} size={16} style={{ marginRight: 4 }} />
                  </View>
                </View>
                <View style={styles.googleActions}>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={() => {
                      Alert.alert(
                        'Disconnect Slack?',
                        'This will revoke access. You can reconnect anytime.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Disconnect',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await disconnectSlack();
                              } catch (err) {
                                Alert.alert('Error', err.message);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <Unplug color={colors.error} size={16} />
                    <Text style={[styles.googleActionText, { color: colors.error }]}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.item}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    await connectSlack();
                    Alert.alert('Connected', 'Slack connected successfully!');
                  } catch (err) {
                    Alert.alert('Connection Failed', err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={integrationLoading || actionLoading}
              >
                <View style={styles.itemLeft}>
                  <Image
                    source={require('../assets/integrations/Slack-Logo.png')}
                    style={styles.logoImage}
                  />
                  <Text style={styles.itemLabel}>Connect Slack</Text>
                </View>
                <View style={styles.itemRight}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ChevronRight color={colors.textDisabled} size={20} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            {/* Microsoft Connection (Outlook + OneDrive) */}
            {isMicrosoftConnected ? (
              <View>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <Image
                      source={require('../assets/integrations/microsoft-outlook-logo.png')}
                      style={styles.logoImage}
                    />
                    <View>
                      <Text style={styles.itemLabel}>Microsoft</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {microsoftStatus?.provider_email || 'Connected'}
                      </Text>
                      {microsoftStatus?.last_sync_at && (
                        <Text style={{ fontSize: 11, color: colors.textDisabled, marginTop: 2 }}>
                          Last sync: {new Date(microsoftStatus.last_sync_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <CheckCircle color={colors.success} size={16} style={{ marginRight: 4 }} />
                  </View>
                </View>
                <View style={styles.googleActions}>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={async () => {
                      setActionLoading(true);
                      try {
                        const result = await syncMicrosoft();
                        Alert.alert('Sync Complete', `Synced ${result.emails_synced} emails and ${result.events_synced} calendar events.`);
                      } catch (err) {
                        Alert.alert('Sync Failed', err.message);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={syncing || actionLoading}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <RefreshCw color={colors.primary} size={16} />
                    )}
                    <Text style={styles.googleActionText}>Sync Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.googleActionBtn}
                    onPress={() => {
                      Alert.alert(
                        'Disconnect Microsoft?',
                        'This will remove access to Outlook and OneDrive. You can reconnect anytime.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Disconnect',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await disconnectMicrosoft();
                              } catch (err) {
                                Alert.alert('Error', err.message);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <Unplug color={colors.error} size={16} />
                    <Text style={[styles.googleActionText, { color: colors.error }]}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.item}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    await connectMicrosoft();
                    try { await syncMicrosoft(); } catch {}
                    Alert.alert('Connected', 'Microsoft connected and syncing!');
                  } catch (err) {
                    Alert.alert('Connection Failed', err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={integrationLoading || actionLoading}
              >
                <View style={styles.itemLeft}>
                  <Image
                    source={require('../assets/integrations/microsoft-outlook-logo.png')}
                    style={styles.logoImage}
                  />
                  <Text style={styles.itemLabel}>Connect Microsoft</Text>
                </View>
                <View style={styles.itemRight}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ChevronRight color={colors.textDisabled} size={20} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <SettingItem icon={Bell} label="Notifications" value="On" />
            <SettingItem icon={Settings} label="Voice Engine" value="Gemini v1.5" />
            <SettingItem icon={ShieldAlert} label="Privacy Policy" value="" />
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
            <LogOut color={colors.error} size={20} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          
          {/* Extended Bottom Padding for Recording Button Safety */}
          <View style={{ height: 180 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  navHeader: {
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  editIconButton: { padding: 8 },
  heroBanner: { 
    width: '100%', 
    height: 220, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginTop: -20,
  },
  avatarLarge: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10,
    borderWidth: 4,
    borderColor: 'white',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  avatarText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: '800', color: 'white', textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 4 },
  email: { fontSize: 14, color: 'white', fontWeight: '500', opacity: 0.9, textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 4 },
  
  contentBody: {
    marginTop: 20,
    paddingHorizontal: 16
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    flex: 0.48,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 11, color: '#666', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#000' },
  statSubtext: { fontSize: 10, color: '#999', marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  section: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    overflow: 'hidden' 
  },
  sectionTitle: { paddingHorizontal: 16, paddingVertical: 12, ...typography.caption, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.backgroundLight },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemLabel: { ...typography.body, color: colors.textPrimary },
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  itemValue: { ...typography.body, color: colors.textSecondary, marginRight: 4 },
  
  logoContainer: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 20, height: 20, resizeMode: 'contain' },

  googleActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  googleActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight || '#EEE',
  },
  googleActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, padding: 20 },
  logoutText: { color: colors.error, fontWeight: 'bold', fontSize: 16 }
});