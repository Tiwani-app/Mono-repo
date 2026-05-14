import {TiwaniNotification} from '../types/notification';
import {mockNotifications} from './mockData';

export const subscribeToNotifications = (callback: (items: TiwaniNotification[]) => void) => {
  callback([...mockNotifications].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()));
  return () => {};
};
