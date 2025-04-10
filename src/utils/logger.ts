import { analytics } from '../firebase/config';
import { logEvent as firebaseLogEvent } from 'firebase/analytics';

export const logEvent = (eventName: string, params?: Record<string, any>) => {
  firebaseLogEvent(analytics, eventName, params);
};

export const logError = (error: unknown, context: string) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  firebaseLogEvent(analytics, 'error', {
    error_message: errorObj.message,
    error_code: errorObj.name,
    context: context,
  });
};
