import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';

export async function requestMicPermission() {
  if (Platform.OS === 'web') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }
  const { status } = await Audio.requestPermissionsAsync();
  return status; // 'granted' | 'denied' | 'undetermined'
}

export async function requestContactsPermission() {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }
  const { status } = await Contacts.requestPermissionsAsync();
  return status;
}

export function isNativePlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
