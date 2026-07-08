import {format, formatDistanceToNow} from 'date-fns';

export const formatEventDate = (date: Date): string => format(date, 'EEE, dd MMM yyyy');
export const formatEventTime = (date: Date): string => format(date, 'hh:mm aa');
export const formatRelativeTime = (date: Date): string =>
  formatDistanceToNow(date, {addSuffix: true});
export const formatDisplayDate = (date: Date): string => format(date, 'MMM dd, yyyy');
