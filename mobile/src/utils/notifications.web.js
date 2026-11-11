// Web fallback for notifications (expo-notifications is not supported on web)
import { playParkingFoundAlert } from './alertSound.js';

export const registerForPushNotificationsAsync = async () => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }
  return null;
};

export const notifyBookingConfirmed = async () => {};
export const notifyEntryRecorded = async () => {};
export const notifyExitRecorded = async () => {};
export const notifyLowBalance = async () => {};

export const notifyNearbySpot = async ({ siteName, distanceKm, freeSlotsCount }) => {
  // Play in-app audio alert on web
  playParkingFoundAlert();
  // Also try a browser notification if permission granted
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Parking Found!', {
      body: `${siteName} is ${distanceKm} km away — ${freeSlotsCount} free slots.`,
      icon: '/favicon.ico',
    });
  }
};

