import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const IntegrationContext = createContext({});

export function IntegrationProvider({ children }) {
  const { user, session } = useAuth();
  const [googleStatus, setGoogleStatus] = useState(null); // null | integration row
  const [notionStatus, setNotionStatus] = useState(null); // null | integration row
  const [slackStatus, setSlackStatus] = useState(null); // null | integration row
  const [microsoftStatus, setMicrosoftStatus] = useState(null); // null | integration row
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isGoogleConnected = googleStatus?.refresh_token && !googleStatus?.disconnected_at;
  const isNotionConnected = notionStatus?.access_token && !notionStatus?.disconnected_at;
  const isSlackConnected = slackStatus?.access_token && !slackStatus?.disconnected_at;
  const isMicrosoftConnected = microsoftStatus?.refresh_token && !microsoftStatus?.disconnected_at;

  // Fetch integration status for all providers
  const fetchStatus = useCallback(async () => {
    if (!user) {
      setGoogleStatus(null);
      setNotionStatus(null);
      setSlackStatus(null);
      setMicrosoftStatus(null);
      return;
    }
    const { data } = await supabase
      .from('user_integrations')
      .select('id, provider, provider_email, scopes, connected_at, disconnected_at, last_sync_at, sync_status, sync_error, access_token, refresh_token')
      .eq('user_id', user.id);

    const rows = data || [];
    setGoogleStatus(rows.find(r => r.provider === 'google') || null);
    setNotionStatus(rows.find(r => r.provider === 'notion') || null);
    setSlackStatus(rows.find(r => r.provider === 'slack') || null);
    setMicrosoftStatus(rows.find(r => r.provider === 'microsoft') || null);
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ===== Google OAuth =====

  const connectGoogle = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const redirectUrl = Linking.createURL('integration-callback');

      const res = await fetch(`${supabaseUrl}/functions/v1/google-oauth-start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ redirectUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Google connect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  const syncGoogle = useCallback(async () => {
    if (!session?.access_token) return;
    setSyncing(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/google-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      await fetchStatus();
      return data;
    } catch (err) {
      console.error('Google sync error:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [session, fetchStatus]);

  const disconnectGoogle = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/google-disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Disconnect failed');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Google disconnect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  // ===== Notion OAuth =====

  const connectNotion = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const redirectUrl = Linking.createURL('integration-callback');

      const res = await fetch(`${supabaseUrl}/functions/v1/notion-oauth-start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ redirectUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get Notion OAuth URL');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Notion connect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  const disconnectNotion = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/notion-disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Disconnect failed');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Notion disconnect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  // ===== Slack OAuth =====

  const connectSlack = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const redirectUrl = Linking.createURL('integration-callback');

      const res = await fetch(`${supabaseUrl}/functions/v1/slack-oauth-start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ redirectUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get Slack OAuth URL');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Slack connect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  const disconnectSlack = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/slack-disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Disconnect failed');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Slack disconnect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  // ===== Microsoft OAuth =====

  const connectMicrosoft = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const redirectUrl = Linking.createURL('integration-callback');

      const res = await fetch(`${supabaseUrl}/functions/v1/microsoft-oauth-start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ redirectUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get Microsoft OAuth URL');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Microsoft connect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  const syncMicrosoft = useCallback(async () => {
    if (!session?.access_token) return;
    setSyncing(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/microsoft-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Microsoft sync failed');
      }

      await fetchStatus();
      return data;
    } catch (err) {
      console.error('Microsoft sync error:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [session, fetchStatus]);

  const disconnectMicrosoft = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/microsoft-disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Disconnect failed');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Microsoft disconnect error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchStatus]);

  return (
    <IntegrationContext.Provider value={{
      // Google
      googleStatus,
      isGoogleConnected,
      connectGoogle,
      syncGoogle,
      disconnectGoogle,
      // Notion
      notionStatus,
      isNotionConnected,
      connectNotion,
      disconnectNotion,
      // Slack
      slackStatus,
      isSlackConnected,
      connectSlack,
      disconnectSlack,
      // Microsoft
      microsoftStatus,
      isMicrosoftConnected,
      connectMicrosoft,
      syncMicrosoft,
      disconnectMicrosoft,
      // Shared
      loading,
      syncing,
      refetchStatus: fetchStatus,
    }}>
      {children}
    </IntegrationContext.Provider>
  );
}

export const useIntegrations = () => useContext(IntegrationContext);
