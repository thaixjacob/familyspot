/**
 * Componente de classe que implementa um limite de erro (Error Boundary) para React.
 *
 * Este componente captura erros JavaScript em qualquer lugar da árvore de componentes
 * filhos, registra esses erros e exibe uma UI de fallback em vez da árvore de componentes
 * que falhou. É uma implementação do conceito de Error Boundaries do React.
 *
 * Funcionalidades:
 * - Captura de erros em componentes filhos
 * - Registro de erros no Firebase Analytics para monitoramento
 * - Logs detalhados no console em ambientes de desenvolvimento (localhost e familyspot-dev.web.app)
 * - Exibição de UI de fallback personalizável
 *
 * O componente diferencia entre ambientes:
 * - Em desenvolvimento (localhost, 127.0.0.1, familyspot-dev.web.app): exibe logs no console
 *   Para ver os logs:
 *     1. Abra as Ferramentas do Desenvolvedor (F12 ou Ctrl+Shift+I)
 *     2. Vá para a aba "Console"
 *     3. Os erros aparecerão com a mensagem "Erro capturado pelo ErrorBoundary"
 *     4. Clique no log para expandir e ver todos os detalhes do erro
 *
 * - Em produção: apenas registra no Firebase Analytics:
 *    Você pode ver os erros no console do Firebase Analytics em:
 *      Acesse o Console do Firebase
 *      Vá para Analytics
 *      Procure por eventos personalizados com o nome "error_occurred"
 *
 * @param {ReactNode} children - Componentes filhos que serão envolvidos pelo Error Boundary
 * @param {ReactNode} [fallback] - Componente opcional para exibir em caso de erro
 * @returns {JSX.Element} Os componentes filhos se não houver erro, ou a UI de fallback
 * em caso de erro.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getAnalytics, logEvent } from 'firebase/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Registra o erro no Firebase Analytics
    const analytics = getAnalytics();
    logEvent(analytics, 'error_occurred', {
      error_name: error.name,
      error_message: error.message,
      component_stack: errorInfo.componentStack,
    });

    // Log em desenvolvimento local e ambiente dev
    const isDevEnvironment =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'familyspot-dev.web.app';

    if (isDevEnvironment) {
      // eslint-disable-next-line no-console
      console.error('Erro capturado pelo ErrorBoundary:', errorLog);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Ops! Algo deu errado.</h2>
              <p className="text-gray-600 mb-4">
                Desculpe pelo inconveniente. Por favor, tente novamente.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Recarregar página
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
