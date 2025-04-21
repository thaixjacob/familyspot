import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { logError } from '../../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * MapErrorBoundary - Componente especializado para capturar erros em componentes do mapa
 *
 * Este componente captura erros específicos que ocorrem durante a renderização e
 * interação com os componentes de mapa, fornecendo um fallback apropriado e
 * registrando detalhes para diagnóstico.
 */
class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
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
      component: 'MapComponent',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Registro detalhado para diagnósticos
    logError(errorLog, 'map_component_error');

    // Registro no Firebase Analytics
    const analytics = getAnalytics();
    logEvent(analytics, 'map_error_occurred', {
      error_name: error.name,
      error_message: error.message,
      component_stack: errorInfo.componentStack?.split('\n')[1]?.trim() || 'unknown_component',
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center bg-white bg-opacity-90 rounded-lg shadow-md p-6 m-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-red-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Problema ao exibir o mapa</h2>
            <p className="text-gray-600 mb-6 text-center">
              Ocorreu um erro ao carregar o mapa. Isso pode ser devido a problemas de conectividade
              ou com a API do Google Maps.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={this.handleReset}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Recarregar página
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 p-4 bg-gray-100 rounded-md w-full overflow-auto max-h-48">
                <p className="font-mono text-xs text-red-600">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="font-mono text-xs text-gray-700 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
