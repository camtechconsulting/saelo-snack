import React, { useState, useRef } from 'react';
import { View, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Mail, Calendar, Users, FileText, DollarSign, UserCircle } from 'lucide-react-native';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IntegrationProvider } from './contexts/IntegrationContext';
import { VoiceProvider, useVoice, VoiceState } from './contexts/VoiceContext';
import VoiceButton from './components/VoiceButton';
import ProcessingShimmer from './components/ProcessingShimmer';
import ReviewModal from './components/reviewModal';
import InfoCardModal from './components/InfoCardModal';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import { insertDraft } from './lib/mutations';
import InboxScreen from './screens/InboxScreen';
import CalendarScreen from './screens/CalendarScreen';
import ContactsScreen from './screens/ContactsScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import FinanceScreen from './screens/FinanceScreen';
import AccountScreen from './screens/AccountScreen';
import ProjectDetailScreen from './screens/ProjectDetail';
import { colors } from './styles/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ navigation, handleItemPress, unreadCount, onUnreadCountChange }) {

  const HeaderRight = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Account')}
      style={{ marginRight: 15 }}
    >
      <UserCircle color={colors.textPrimary} size={26} />
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: 'bold', fontFamily: 'PlayfairDisplay_700Bold', color: colors.textPrimary },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tab.Screen
        name="Inbox"
        options={{
          tabBarIcon: ({color}) => <Mail color={color} size={24} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.textOnPrimary, fontSize: 11, fontWeight: '700' },
        }}
      >
        {(props) => <InboxScreen {...props} onSelectEmail={handleItemPress} onUnreadCountChange={onUnreadCountChange} />}
      </Tab.Screen>

      <Tab.Screen name="Calendar" options={{ tabBarIcon: ({color}) => <Calendar color={color} size={24} /> }}>
        {(props) => <CalendarScreen {...props} onSelectEvent={handleItemPress} />}
      </Tab.Screen>

      <Tab.Screen name="Network" options={{ tabBarIcon: ({color}) => <Users color={color} size={24} /> }}>
        {(props) => <ContactsScreen {...props} onSelectContact={handleItemPress} />}
      </Tab.Screen>

      <Tab.Screen name="Workspace" options={{ tabBarIcon: ({color}) => <FileText color={color} size={24} /> }}>
        {(props) => <DocumentsScreen {...props} onSelectProject={handleItemPress} />}
      </Tab.Screen>

      <Tab.Screen name="Finances" options={{ tabBarIcon: ({color}) => <DollarSign color={color} size={24} /> }}>
        {(props) => <FinanceScreen {...props} onSelectTransaction={handleItemPress} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading, onboardingCompleted, completeOnboarding, signUp, signInWithEmail, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const {
    voiceState,
    isProcessing,
    transcript,
    parsedIntent,
    queryResponse,
    actResult,
    confirmIntent,
    dismissQueryResult,
    dismissActResult,
    cancel: cancelVoice,
  } = useVoice();

  // Unread email count for tab badge
  const [unreadCount, setUnreadCount] = useState(0);

  // Legacy ReviewModal State (For manual/non-voice drafts)
  const [legacyModalVisible, setLegacyModalVisible] = useState(false);
  const [legacyDraft, setLegacyDraft] = useState(null);

  // InfoCardModal State (For Viewing Existing Item Summaries)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalData, setInfoModalData] = useState(null);

  const navigationRef = useRef();
  const [currentRoute, setCurrentRoute] = useState('Inbox');

  // Triggered by clicking any item in the lists (Inbox, Calendar, etc)
  const handleItemPress = (itemData) => {
    setInfoModalData(itemData);
    setInfoModalVisible(true);
  };

  // Handle voice intent confirmation
  const handleVoiceConfirm = async (editedIntent) => {
    const result = await confirmIntent(editedIntent || parsedIntent);
    const intentType = editedIntent?.type || editedIntent?.intentType || parsedIntent?.intentType;
    // Only show success alert for LOG/ACT intents; QUERY shows response in modal
    if (!result.error && intentType !== 'query') {
      Alert.alert("Success", "Voice command executed successfully.");
    }
  };

  const handleVoiceReject = () => {
    cancelVoice();
  };

  // Legacy confirm action (for non-voice drafts)
  const handleLegacyConfirm = async () => {
    setLegacyModalVisible(false);
    if (legacyDraft && user) {
      const { error } = await insertDraft(user.id, { ...legacyDraft, status: 'approved' });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
    }
    Alert.alert("Success", "Action finalized and synced.");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user || !onboardingCompleted) {
    return (
      <OnboardingScreen
        onComplete={completeOnboarding}
        signUp={signUp}
        signInWithEmail={signInWithEmail}
        signInWithGoogle={signInWithGoogle}
        signInWithMicrosoft={signInWithMicrosoft}
      />
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const state = navigationRef.current?.getRootState();
        let route = state?.routes[state.index];
        while (route?.state) {
          route = route.state.routes[route.state.index];
        }
        setCurrentRoute(route?.name);
      }}
    >
      <View style={{ flex: 1 }}>
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            options={{ headerShown: false }}
          >
            {(props) => <HomeTabs {...props} handleItemPress={handleItemPress} unreadCount={unreadCount} onUnreadCountChange={setUnreadCount} />}
          </Stack.Screen>

          <Stack.Screen
            name="Account"
            component={AccountScreen}
            options={{
              title: 'My Account',
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: { fontWeight: 'bold', fontFamily: 'PlayfairDisplay_700Bold' },
            }}
          />

          <Stack.Screen
            name="ProjectDetail"
            component={ProjectDetailScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
              animation: 'slide_from_right'
            }}
          />
        </Stack.Navigator>

        <VoiceButton
          position={(
            currentRoute === 'Calendar' ||
            currentRoute === 'Network' ||
            currentRoute === 'Workspace' ||
            currentRoute === 'Finances' ||
            currentRoute === 'ProjectDetail'
          ) ? 'left' : 'right'}
        />

        {/* Processing shimmer overlay */}
        <ProcessingShimmer visible={isProcessing} />

        {/* Voice-driven ReviewModal */}
        <ReviewModal
          isVisible={voiceState === VoiceState.REVIEW || voiceState === VoiceState.QUERY_RESULT || voiceState === VoiceState.ACT_RESULT}
          draft={parsedIntent ? {
            type: parsedIntent.intentType,
            title: parsedIntent.title || transcript,
            detail: parsedIntent.detail || transcript,
            targetAccount: parsedIntent.targetAccount || 'Saelo',
            ...parsedIntent,
          } : null}
          transcript={transcript}
          queryResponse={queryResponse}
          actResult={actResult}
          onConfirm={handleVoiceConfirm}
          onReject={handleVoiceReject}
          onDismissQuery={dismissQueryResult}
          onDismissAct={dismissActResult}
        />

        {/* Legacy ReviewModal (for non-voice actions) */}
        <ReviewModal
          isVisible={legacyModalVisible}
          draft={legacyDraft}
          onConfirm={handleLegacyConfirm}
          onReject={() => setLegacyModalVisible(false)}
        />

        <InfoCardModal
          isVisible={infoModalVisible}
          data={infoModalData}
          onClose={() => setInfoModalVisible(false)}
        />
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <IntegrationProvider>
        <VoiceProvider>
          <AppContent />
        </VoiceProvider>
      </IntegrationProvider>
    </AuthProvider>
  );
}
