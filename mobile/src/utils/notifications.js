import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground (native only)
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[Notifications] Handler init error:', err?.message || err);
  }
}

/**
 * Request notification permissions from the OS
 */
export const registerForPushNotificationsAsync = async () => {
  try {
    if (Platform.OS === 'web') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // On Android, setup notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('parkeasy-alerts', {
        name: 'ParkEasy Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E4FD8',
      });
    }

    return true;
  } catch (error) {
    console.warn('[Notifications] Setup error:', error.message);
    return null;
  }
};

/**
 * 1. Booking Confirmed Notification
 */
export const notifyBookingConfirmed = async ({ siteName, slotNumber, vehicleNumber }) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking Confirmed!',
        body: `Slot ${slotNumber} reserved at ${siteName} for ${vehicleNumber}. Your QR ticket is ready.`,
        data: { screen: 'TicketQR' },
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.warn('[Notifications] Error triggering booking notification:', err.message);
  }
};

/**
 * 2. Vehicle Entry Recorded Notification
 */
export const notifyEntryRecorded = async ({ vehicleNumber, siteName, slotNumber }) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vehicle Admitted',
        body: `${vehicleNumber} entered ${siteName} (Slot ${slotNumber}). Parking timer is active.`,
        data: { screen: 'History' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Error triggering entry notification:', err.message);
  }
};

/**
 * 3. Vehicle Exit & Receipt Notification
 */
export const notifyExitRecorded = async ({ vehicleNumber, amount, paymentMode }) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Exit Completed & Bill Settled',
        body: `${vehicleNumber} exit settled. Fee of ₹${amount} paid via ${paymentMode.toUpperCase()}.`,
        data: { screen: 'Wallet' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Error triggering exit notification:', err.message);
  }
};

/**
 * 4. Low Wallet Balance Notification
 */
export const notifyLowBalance = async ({ balance, threshold = 50 }) => {
  try {
    if (balance >= threshold) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Low Wallet Balance',
        body: `Your wallet balance is ₹${balance}. Top up now to avoid cash shortfall at station exits.`,
        data: { screen: 'Wallet' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Error triggering low balance notification:', err.message);
  }
};

/**
 * 5. Nearby Parking Spot Notification
 */
export const notifyNearbySpot = async ({ siteName, distanceKm, freeSlotsCount }) => {
  try {
    if (Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Parking Space Nearby!',
        body: `${siteName} is now available within 10 km (${distanceKm} km away). Free slots: ${freeSlotsCount}.`,
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Error triggering nearby spot notification:', err.message);
  }
};

