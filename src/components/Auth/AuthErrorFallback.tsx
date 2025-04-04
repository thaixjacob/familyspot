/**
 * Componente de fallback para erros de autenticação.
 *
 * Este componente é exibido quando ocorre um erro durante o processo de autenticação.
 * Ele fornece uma interface amigável para o usuário, listando possíveis causas do erro
 * e oferecendo a opção de tentar novamente.
 *
 * @returns {JSX.Element} Um componente React que renderiza uma mensagem de erro estilizada
 * com opções para recarregar a página.
 */
import React from 'react';

const AuthErrorFallback = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Ops! Algo deu errado na autenticação
        </h2>
        <p className="text-gray-600 mb-4">
          Não foi possível processar sua solicitação. Isso pode ter acontecido por:
        </p>
        <ul className="text-gray-600 text-left mb-6 list-disc list-inside">
          <li>Problemas de conexão com a internet</li>
          <li>Servidor temporariamente indisponível</li>
          <li>Dados inválidos ou incompletos</li>
        </ul>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
};

export default AuthErrorFallback;
