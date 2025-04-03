/**
 * Serviço de Notificações
 *
 * Este serviço implementa um sistema centralizado de notificações para a aplicação,
 * permitindo exibir mensagens de diferentes tipos (info, sucesso, erro, etc).
 *
 * Funcionalidades:
 * - Notificações de debug (apenas em ambiente de desenvolvimento)
 * - Notificações informativas
 * - Notificações de sucesso
 * - Notificações de aviso
 * - Notificações de erro
 *
 * @example
 * NotificationService.initialize((type, message) => {
 *   // Implementação do callback de notificação
 * });
 * NotificationService.success('Operação concluída com sucesso!');
 */

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
