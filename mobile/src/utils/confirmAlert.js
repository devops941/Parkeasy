import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog that works on Android, iOS, and Web.
 * (React Native Web's Alert.alert does not support custom button callbacks).
 */
export const confirmAlert = ({
  title = 'Confirmation',
  message = 'Are you sure?',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
}) => {
  if (Platform.OS === 'web') {
    const isConfirmed =
      typeof window !== 'undefined'
        ? window.confirm(`${title}\n\n${message}`)
        : true;
    if (isConfirmed && onConfirm) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
};

