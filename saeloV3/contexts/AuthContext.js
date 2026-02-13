import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const fetchOnboardingStatus = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();
    setOnboardingCompleted(data?.onboarding_completed ?? false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOnboardingStatus(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchOnboardingStatus(session.user.id);
        } else {
          setOnboardingCompleted(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const completeOnboarding = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);
    if (!error) {
      setOnboardingCompleted(true);
    }
  };

  // Generic OAuth sign-in via expo-web-browser + PKCE
  const signInWithProvider = async (provider, scopes) => {
    const redirectUrl = Linking.createURL('auth-callback');
    const options = {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    };
    if (scopes) options.scopes = scopes;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    if (result.type === 'success') {
      const url = new URL(result.url);

      // Prefer PKCE code exchange (more secure — server validates code_verifier)
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        return;
      }

      // Fallback: implicit flow token extraction (for providers that return tokens directly)
      const fragment = url.hash?.substring(1);
      const params = new URLSearchParams(fragment || '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  };

  const signInWithGoogle = () => signInWithProvider('google');
  const signInWithMicrosoft = () => signInWithProvider('azure');

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      onboardingCompleted,
      completeOnboarding,
      signUp,
      signInWithEmail,
      signInWithGoogle,
      signInWithMicrosoft,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
