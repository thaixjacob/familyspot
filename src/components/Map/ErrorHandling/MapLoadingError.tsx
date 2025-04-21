import React from 'react';

interface MapLoadingErrorProps {
  error: string;
  onRetry?: () => void;
}

/**
 * MapLoadingError - Componente para exibir erros de carregamento do mapa
 *
 * Este componente fornece uma interface amigável para informar aos usuários
 * sobre problemas específicos de carregamento do mapa, oferecendo opções
 * para tentar novamente ou entender o problema.
 */
const MapLoadingError: React.FC<MapLoadingErrorProps> = ({ error, onRetry }) => {
  // Determinar mensagem amigável com base no erro
  const getUserFriendlyMessage = (errorString: string) => {
    if (errorString.includes('MissingKeyMapError')) {
      return 'Não foi possível carregar o mapa devido a um problema com a chave de API.';
    }
    if (errorString.includes('RefererNotAllowedMapError')) {
      return 'Este site não está autorizado a usar o Google Maps.';
    }
    if (errorString.includes('InvalidKeyMapError')) {
      return 'A chave do Google Maps utilizada é inválida.';
    }
    if (errorString.includes('ExpiredKeyMapError')) {
      return 'A chave do Google Maps expirou.';
    }
    if (errorString.includes('NetworkError')) {
      return 'Erro de rede ao carregar o mapa. Verifique sua conexão.';
    }
    // Fallback para outras mensagens de erro
    return 'Ocorreu um erro ao carregar o mapa do Google.';
  };

  const message = getUserFriendlyMessage(error);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 rounded-lg shadow-inner">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-red-500 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Erro ao carregar o mapa</h2>

        <p className="text-gray-600 mb-6">{message}</p>

        <div className="flex flex-col space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Recarregar página
          </button>

          <a href="/" className="text-blue-600 hover:underline mt-4">
            Voltar para a página inicial
          </a>
        </div>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md w-full overflow-auto max-h-48">
            <pre className="text-xs text-red-600 font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLoadingError;
