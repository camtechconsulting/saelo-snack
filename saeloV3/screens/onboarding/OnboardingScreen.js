import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ImageBackground,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  Mic,
  Calendar,
  DollarSign,
  Users,
  Mail,
  FileText,
  CircleCheck,
  Check,
  X,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import GlassButton from '../../components/GlassButton';
import ProgressDots from '../../components/ProgressDots';
import { requestMicPermission, requestContactsPermission, isNativePlatform } from '../../lib/onboarding';
import { colors } from '../../styles/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useIntegrations } from '../../contexts/IntegrationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Back Button ────────────────────────────────────────────────────
function BackButton({ onPress, light = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.backButton}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <ChevronLeft color={light ? '#FFFFFF' : colors.textSecondary} size={24} />
    </TouchableOpacity>
  );
}

// ─── Screen 1: Splash ───────────────────────────────────────────────
function SplashStep({ onNext, goTo }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.centerContent}>
        <Animated.Image
          source={require('../../assets/logo-icon.png')}
          style={[styles.logoIcon, { opacity: logoOpacity }]}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('../../assets/logo-text.png')}
          style={[styles.logoText, { opacity: textOpacity }]}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Say More. Do Less.
        </Animated.Text>
      </View>
      <View style={styles.bottomSection}>
        <GlassButton title="Continue" onPress={onNext} variant="gold" shimmer />
        <ProgressDots total={7} current={0} onGoTo={goTo} />
      </View>
    </View>
  );
}

// ─── Screen 2: About Saelo ──────────────────────────────────────────
function AboutSaeloStep({ onNext, onBack, goTo }) {
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.stepContainer}>
      <BackButton onPress={onBack} />
      <ScrollView contentContainerStyle={styles.aboutScrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.centerContent, { opacity: fadeIn, paddingTop: 80 }]}>
          <Image
            source={require('../../assets/logo-icon.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <Text style={styles.stepTitle}>Meet Saelo</Text>
          <Text style={styles.aboutBody}>
            Saelo is your universal life and business organizer. A voice-first interface that connects your calendars, inboxes, contacts, projects, and more.{'\n\n'}Speak naturally, and Saelo uses your connected apps to route your intent, log data, and answer questions.{'\n\n'}For the everyday person & business owner.{'\n'}Your life or business on a central view.
          </Text>
        </Animated.View>
      </ScrollView>
      <View style={styles.bottomSection}>
        <GlassButton title="Continue" onPress={onNext} variant="gold" shimmer />
        <ProgressDots total={7} current={1} onGoTo={goTo} />
      </View>
    </View>
  );
}

// ─── Screen 3: Voice Education ───────────────────────────────────────
const ORBIT_ICONS = [
  { Icon: Calendar, label: 'Calendar' },
  { Icon: DollarSign, label: 'Finance' },
  { Icon: Users, label: 'Contacts' },
  { Icon: Mail, label: 'Email' },
  { Icon: FileText, label: 'Docs' },
];

const EXAMPLE_COMMANDS = [
  "What's on my calendar?",
  'Log $47 for coffee',
  'Who\'s in my contacts?',
];

function VoiceEducationStep({ onNext, onBack, goTo }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [exampleIndex, setExampleIndex] = useState(0);
  const pillOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(pillOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setExampleIndex((i) => (i + 1) % EXAMPLE_COMMANDS.length);
        Animated.timing(pillOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const ORBIT_RADIUS = 72;

  return (
    <View style={styles.stepContainer}>
      <BackButton onPress={onBack} />
      <View style={styles.centerContent}>
        {/* Orbit composition */}
        <View style={styles.orbitContainer}>
          <View style={styles.micCenter}>
            <Mic color={colors.primary} size={48} />
          </View>
          <Animated.View style={[styles.orbitRing, { transform: [{ rotate: spin }] }]}>
            {ORBIT_ICONS.map((item, i) => {
              const angle = (i / ORBIT_ICONS.length) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * ORBIT_RADIUS;
              const y = Math.sin(angle) * ORBIT_RADIUS;
              return (
                <View
                  key={item.label}
                  style={[
                    styles.orbitIcon,
                    { transform: [{ translateX: x }, { translateY: y }] },
                  ]}
                >
                  <Animated.View style={{ transform: [{ rotate: counterSpin }] }}>
                    <item.Icon color={colors.textSecondary} size={20} />
                  </Animated.View>
                </View>
              );
            })}
          </Animated.View>
        </View>

        <Text style={styles.stepTitle}>Just Speak</Text>
        <Text style={styles.stepBody}>
          Tap the voice button to log, query, or act across all your apps
        </Text>

        <Animated.View style={[styles.examplePill, { opacity: pillOpacity }]}>
          <Text style={styles.exampleText}>"{EXAMPLE_COMMANDS[exampleIndex]}"</Text>
        </Animated.View>
      </View>
      <View style={styles.bottomSection}>
        <GlassButton title="Continue" onPress={onNext} variant="gold" shimmer />
        <ProgressDots total={7} current={2} onGoTo={goTo} />
      </View>
    </View>
  );
}

// ─── Screen 4: Permissions ───────────────────────────────────────────
function PermissionsStep({ onNext, onBack, goTo }) {
  const [micStatus, setMicStatus] = useState('pending');
  const [contactsStatus, setContactsStatus] = useState('pending');
  const showContacts = isNativePlatform();

  const handleMic = async () => {
    const result = await requestMicPermission();
    setMicStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const handleContacts = async () => {
    const result = await requestContactsPermission();
    setContactsStatus(result === 'granted' ? 'granted' : result === 'unavailable' ? 'unavailable' : 'denied');
  };

  const micGranted = micStatus === 'granted';

  return (
    <View style={styles.stepContainer}>
      <BackButton onPress={onBack} />
      <View style={styles.centerContent}>
        <Text style={styles.stepTitle}>Enable Voice</Text>

        {/* Mic card */}
        <View style={styles.permCard}>
          <View style={styles.permHeader}>
            <View style={[styles.permIconWrap, micGranted && styles.permIconGranted]}>
              {micGranted ? <Check color={colors.success} size={24} /> : <Mic color={colors.primary} size={24} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>Microphone Access</Text>
              <Text style={styles.permDesc}>Required for voice commands</Text>
            </View>
          </View>
          {micStatus === 'pending' && (
            <GlassButton title="Grant Access" onPress={handleMic} variant="gold" style={{ marginTop: 12 }} />
          )}
          {micStatus === 'granted' && (
            <View style={styles.permStatusRow}>
              <Check color={colors.success} size={16} />
              <Text style={[styles.permStatusText, { color: colors.success }]}>Granted</Text>
            </View>
          )}
          {micStatus === 'denied' && (
            <TouchableOpacity onPress={handleMic} style={styles.permStatusRow}>
              <X color={colors.error} size={16} />
              <Text style={[styles.permStatusText, { color: colors.error }]}>Denied — Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contacts card (native only) */}
        {showContacts && (
          <View style={styles.permCard}>
            <View style={styles.permHeader}>
              <View style={[styles.permIconWrap, contactsStatus === 'granted' && styles.permIconGranted]}>
                {contactsStatus === 'granted' ? (
                  <Check color={colors.success} size={24} />
                ) : (
                  <Users color={colors.primary} size={24} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>Device Contacts</Text>
                <Text style={styles.permDesc}>Sync contacts for voice logging</Text>
              </View>
            </View>
            {contactsStatus === 'pending' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 }}>
                <GlassButton title="Grant Access" onPress={handleContacts} variant="glass" style={{ flex: 1 }} />
              </View>
            )}
            {contactsStatus === 'granted' && (
              <View style={styles.permStatusRow}>
                <Check color={colors.success} size={16} />
                <Text style={[styles.permStatusText, { color: colors.success }]}>Granted</Text>
              </View>
            )}
            {contactsStatus === 'denied' && (
              <TouchableOpacity onPress={handleContacts} style={styles.permStatusRow}>
                <X color={colors.error} size={16} />
                <Text style={[styles.permStatusText, { color: colors.error }]}>Denied — Tap to retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.bottomSection}>
        <GlassButton
          title="Continue"
          onPress={onNext}
          variant="gold"
          shimmer
          disabled={!micGranted}
        />
        <ProgressDots total={7} current={3} onGoTo={goTo} />
      </View>
    </View>
  );
}

// ─── Screen 6: Connect Your Cosmos ──────────────────────────────────
const GOOGLE_APPS = ['Gmail', 'Google Drive'];
const NOTION_APPS = ['Notion'];
const SLACK_APPS = ['Slack'];
const MICROSOFT_APPS = ['Outlook', 'OneDrive'];

const INTEGRATIONS = [
  { name: 'Gmail', image: require('../../assets/integrations/Gmail-Logo.png') },
  { name: 'Google Drive', image: require('../../assets/integrations/Google-Drive-Logo.png') },
  { name: 'Slack', image: require('../../assets/integrations/Slack-Logo.png') },
  { name: 'Notion', image: require('../../assets/integrations/Notion-Logo.png') },
  { name: 'Stripe', image: require('../../assets/integrations/Stripe-Logo.png') },
  { name: 'GitHub', image: require('../../assets/integrations/GitHub-Logo.png') },
  { name: 'Outlook', image: require('../../assets/integrations/microsoft-outlook-logo.png') },
  { name: 'OneDrive', image: require('../../assets/integrations/Microsoft-OneDrive-Logo.png') },
  { name: 'Salesforce', image: require('../../assets/integrations/Salesforce-Logo.png') },
  { name: 'Dropbox', image: require('../../assets/integrations/Dropbox-logo.png') },
  { name: 'Monday.com', image: require('../../assets/integrations/Monday.com-Logo.png') },
];

function ConnectCosmosStep({ onNext, onBack, goTo }) {
  const {
    isGoogleConnected, loading: integrationLoading, connectGoogle, syncGoogle,
    isNotionConnected, connectNotion,
    isSlackConnected, connectSlack,
    isMicrosoftConnected, connectMicrosoft,
  } = useIntegrations();
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [connectingSlack, setConnectingSlack] = useState(false);
  const [connectingMicrosoft, setConnectingMicrosoft] = useState(false);

  const handleConnect = async (appName) => {
    if (GOOGLE_APPS.includes(appName)) {
      if (isGoogleConnected) {
        Alert.alert('Already Connected', 'Google is already connected. Your data will sync automatically.');
        return;
      }
      setConnectingGoogle(true);
      try {
        await connectGoogle();
        try { await syncGoogle(); } catch {}
        Alert.alert('Connected', 'Google connected successfully! Your Gmail and Calendar are syncing.');
      } catch (err) {
        Alert.alert('Connection Failed', err.message || 'Could not connect Google. Please try again.');
      } finally {
        setConnectingGoogle(false);
      }
    } else if (NOTION_APPS.includes(appName)) {
      if (isNotionConnected) {
        Alert.alert('Already Connected', 'Notion is already connected.');
        return;
      }
      setConnectingNotion(true);
      try {
        await connectNotion();
        Alert.alert('Connected', 'Notion connected successfully!');
      } catch (err) {
        Alert.alert('Connection Failed', err.message || 'Could not connect Notion. Please try again.');
      } finally {
        setConnectingNotion(false);
      }
    } else if (SLACK_APPS.includes(appName)) {
      if (isSlackConnected) {
        Alert.alert('Already Connected', 'Slack is already connected.');
        return;
      }
      setConnectingSlack(true);
      try {
        await connectSlack();
        Alert.alert('Connected', 'Slack connected successfully!');
      } catch (err) {
        Alert.alert('Connection Failed', err.message || 'Could not connect Slack. Please try again.');
      } finally {
        setConnectingSlack(false);
      }
    } else if (MICROSOFT_APPS.includes(appName)) {
      if (isMicrosoftConnected) {
        Alert.alert('Already Connected', 'Microsoft is already connected. Your Outlook and OneDrive are linked.');
        return;
      }
      setConnectingMicrosoft(true);
      try {
        await connectMicrosoft();
        Alert.alert('Connected', 'Microsoft connected successfully! Your Outlook and OneDrive are linked.');
      } catch (err) {
        Alert.alert('Connection Failed', err.message || 'Could not connect Microsoft. Please try again.');
      } finally {
        setConnectingMicrosoft(false);
      }
    } else {
      Alert.alert('Coming Soon', `We'll notify you when ${appName} is ready.`);
    }
  };

  const isGoogle = (name) => GOOGLE_APPS.includes(name);
  const isNotion = (name) => NOTION_APPS.includes(name);
  const isSlack = (name) => SLACK_APPS.includes(name);
  const isMicrosoft = (name) => MICROSOFT_APPS.includes(name);

  return (
    <View style={styles.stepContainer}>
      <BackButton onPress={onBack} />
      <Text style={[styles.stepTitle, { marginTop: 60 }]}>Connect Your Cosmos</Text>
      <Text style={[styles.stepBody, { marginBottom: 16 }]}>
        Link your favorite apps. You can always do this later.
      </Text>

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {INTEGRATIONS.map((app) => {
            const googleApp = isGoogle(app.name);
            const notionApp = isNotion(app.name);
            const slackApp = isSlack(app.name);
            const microsoftApp = isMicrosoft(app.name);
            const connected = (googleApp && isGoogleConnected) || (notionApp && isNotionConnected) || (slackApp && isSlackConnected) || (microsoftApp && isMicrosoftConnected);
            const isConnecting = (connectingGoogle && googleApp) || (connectingNotion && notionApp) || (connectingSlack && slackApp) || (connectingMicrosoft && microsoftApp);
            return (
              <TouchableOpacity
                key={app.name}
                style={[styles.integrationTile, connected && styles.integrationTileConnected]}
                onPress={() => handleConnect(app.name)}
                disabled={isConnecting}
                activeOpacity={0.7}
              >
                {isConnecting ? (
                  <ActivityIndicator color={colors.primary} style={styles.integrationIcon} />
                ) : (
                  <Image source={app.image} style={styles.integrationIcon} resizeMode="contain" />
                )}
                <Text style={styles.integrationName}>{app.name}</Text>
                {connected && (
                  <View style={styles.connectedPill}>
                    <Check color={colors.success} size={12} />
                    <Text style={styles.connectedPillText}>Connected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomSection, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={onNext}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
        <GlassButton title="Continue" onPress={onNext} variant="gold" shimmer style={{ marginTop: 12 }} />
        <ProgressDots total={7} current={5} onGoTo={goTo} />
      </View>
    </View>
  );
}

// ─── Screen 7: Get Started ──────────────────────────────────────────
const SUGGESTIONS = [
  "What's on my calendar?",
  'Log an expense',
  'Show my contacts',
];

function ShimmerPill({ text, delay = 0 }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(800),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  // Sweep diagonally from bottom-left (-200) to top-right (+200)
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.suggestionPill}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(212, 175, 55, 0.15)',
            'rgba(212, 175, 55, 0.45)',
            'rgba(212, 175, 55, 0.15)',
            'transparent',
          ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ width: 200, height: '100%' }}
        />
      </Animated.View>
      <Text style={styles.suggestionText}>{text}</Text>
    </View>
  );
}

function GetStartedStep({ onNext, onBack, goTo }) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/onboarding-bg.jpg')}
      style={styles.stepContainer}
      resizeMode="cover"
    >
      <BackButton onPress={onBack} light />
      <LinearGradient
        colors={['rgba(59, 56, 49, 0.25)', 'rgba(59, 56, 49, 0.6)']}
        locations={[0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.centerContent}>
        <View style={styles.checkContainer}>
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: checkScale }] }]} />
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <CircleCheck color={colors.primary} size={64} />
          </Animated.View>
        </View>
        <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>You're All Set</Text>

        <View style={styles.suggestionsRow}>
          {SUGGESTIONS.map((s, i) => (
            <ShimmerPill key={s} text={s} delay={i * 300} />
          ))}
        </View>
      </View>
      <View style={styles.bottomSection}>
        <GlassButton title="Continue" onPress={onNext} variant="gold" shimmer />
        <ProgressDots total={7} current={6} onGoTo={goTo} />
      </View>
    </ImageBackground>
  );
}

// ─── Screen 5: Auth ─────────────────────────────────────────────────
function AuthStep({ onComplete, onBack, goTo, signUp, signInWithEmail, signInWithGoogle, signInWithMicrosoft }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(null); // 'google' | 'microsoft' | null
  const [error, setError] = useState(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(trimmedEmail, password);
        setSignUpSuccess(true);
        setIsSignUp(false);
      } else {
        await signInWithEmail(trimmedEmail, password);
        onComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider, signInFn) => {
    setProviderLoading(provider);
    setError(null);
    try {
      await signInFn();
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setProviderLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.stepContainer, { justifyContent: 'center' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BackButton onPress={onBack} />
      <View style={styles.centerContent}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={{ width: 64, height: 64, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={styles.stepTitle}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>

        {signUpSuccess && (
          <View style={styles.confirmBanner}>
            <Text style={styles.confirmText}>
              Check your email to confirm, then sign in below.
            </Text>
          </View>
        )}

        <View style={styles.authForm}>
          <TextInput
            style={styles.authInput}
            placeholder="Email"
            placeholderTextColor={colors.textDisabled}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.authInput}
            placeholder="Password"
            placeholderTextColor={colors.textDisabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.authError}>{error}</Text>}

          <GlassButton
            title={loading ? '' : (isSignUp ? 'Sign Up' : 'Sign In')}
            onPress={handleEmailAuth}
            variant="gold"
            disabled={loading}
            shimmer={!loading}
          />

          {loading && (
            <ActivityIndicator
              color={colors.textOnPrimary}
              style={{ position: 'absolute', bottom: 120, alignSelf: 'center' }}
            />
          )}

          <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(null); setSignUpSuccess(false); }}>
            <Text style={styles.authToggle}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.authDivider}>
          <View style={styles.authDividerLine} />
          <Text style={styles.authDividerText}>or</Text>
          <View style={styles.authDividerLine} />
        </View>

        <View style={styles.providerButtons}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleProviderSignIn('google', signInWithGoogle)}
            disabled={!!providerLoading}
          >
            {providerLoading === 'google' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <View style={styles.providerBtnContent}>
                <Image source={require('../../assets/integrations/Google-Drive-Logo.png')} style={styles.providerIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleProviderSignIn('microsoft', signInWithMicrosoft)}
            disabled={!!providerLoading}
          >
            {providerLoading === 'microsoft' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <View style={styles.providerBtnContent}>
                <Image source={require('../../assets/integrations/microsoft-outlook-logo.png')} style={styles.providerIcon} />
                <Text style={styles.googleButtonText}>Continue with Microsoft</Text>
              </View>
            )}
          </TouchableOpacity>

        </View>
      </View>
      <View style={styles.bottomSection}>
        <ProgressDots total={7} current={4} onGoTo={goTo} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main OnboardingScreen ──────────────────────────────────────────
export default function OnboardingScreen({ onComplete, signUp, signInWithEmail, signInWithGoogle, signInWithMicrosoft }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const AUTH_STEP = 4;
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const goTo = (i) => setStep(!user && i > AUTH_STEP ? AUTH_STEP : i);

  switch (step) {
    case 0:
      return <SplashStep onNext={next} goTo={goTo} />;
    case 1:
      return <AboutSaeloStep onNext={next} onBack={back} goTo={goTo} />;
    case 2:
      return <VoiceEducationStep onNext={next} onBack={back} goTo={goTo} />;
    case 3:
      return <PermissionsStep onNext={next} onBack={back} goTo={goTo} />;
    case 4:
      return <AuthStep onComplete={next} onBack={back} goTo={goTo} signUp={signUp} signInWithEmail={signInWithEmail} signInWithGoogle={signInWithGoogle} signInWithMicrosoft={signInWithMicrosoft} />;
    case 5:
      return <ConnectCosmosStep onNext={next} onBack={back} goTo={goTo} />;
    case 6:
      return <GetStartedStep onNext={onComplete} onBack={back} goTo={goTo} />;
    default:
      return null;
  }
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 54,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    paddingBottom: 48,
    gap: 16,
    alignItems: 'center',
  },

  // Screen 1: Splash
  logoIcon: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  logoText: {
    width: 200,
    height: 48,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Screen 2: About Saelo
  aboutScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  aboutLogo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  aboutBody: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },

  // Screen 3: Voice Education
  orbitContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  micCenter: {
    position: 'absolute',
    zIndex: 2,
  },
  orbitRing: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepBody: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  examplePill: {
    marginTop: 24,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  exampleText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Screen 3: Permissions
  permCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  permHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  permIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permIconGranted: {
    backgroundColor: '#EDF5E8',
  },
  permTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  permStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  permStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Screen 6: Connect Your Cosmos
  gridScroll: {
    flex: 1,
    width: '100%',
  },
  gridContent: {
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  integrationTile: {
    width: (SCREEN_WIDTH - 72) / 3,
    minWidth: 100,
    maxWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  integrationIcon: {
    width: 40,
    height: 40,
  },
  integrationName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  integrationTileConnected: {
    borderColor: 'rgba(107, 142, 78, 0.4)',
    backgroundColor: 'rgba(107, 142, 78, 0.04)',
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 142, 78, 0.12)',
  },
  connectedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  skipText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // Screen 7: Get Started
  checkContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
  },
  suggestionsRow: {
    marginTop: 24,
    gap: 10,
    alignItems: 'center',
  },
  suggestionPill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.7)',
    overflow: 'hidden',
  },
  suggestionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Screen 5: Auth
  confirmBanner: {
    backgroundColor: 'rgba(107, 142, 78, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 78, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    width: '100%',
    maxWidth: 320,
  },
  confirmText: {
    fontSize: 14,
    color: colors.success,
    textAlign: 'center',
    lineHeight: 20,
  },
  authForm: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  authInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  authError: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  authToggle: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginVertical: 20,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  authDividerText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginHorizontal: 12,
  },
  providerButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  providerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  providerIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  googleButtonText: {
    color: '#3B3831',
    fontSize: 16,
    fontWeight: '700',
  },
});
