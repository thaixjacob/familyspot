const isDevelopment = process.env.NODE_ENV === 'development';

class NotificationService {
  private static notifyCallback:
    | ((type: string, message: string, details?: string | Record<string, unknown>) => void)
    | null = null;

  static initialize(
    callback: (type: string, message: string, details?: string | Record<string, unknown>) => void
  ): void {
    this.notifyCallback = callback;
  }

  static debug(message: string, details?: string | Record<string, unknown>): void {
    if (isDevelopment && this.notifyCallback) {
      this.notifyCallback('info', message, details);
    }
  }

  static info(message: string, details?: string | Record<string, unknown>): void {
    if (this.notifyCallback) {
      this.notifyCallback('info', message, details);
    }
  }

  static success(message: string, details?: string | Record<string, unknown>): void {
    if (this.notifyCallback) {
      this.notifyCallback('success', message, details);
    }
  }

  static warning(message: string, details?: string | Record<string, unknown>): void {
    if (this.notifyCallback) {
      this.notifyCallback('warning', message, details);
    }
  }

  static error(message: string, error?: string | Record<string, unknown>): void {
    if (this.notifyCallback) {
      this.notifyCallback('error', message, error);
    }
  }
}

export default NotificationService;
