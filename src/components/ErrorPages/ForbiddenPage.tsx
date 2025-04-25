import React from 'react';
import { Link } from 'react-router-dom';

const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Acesso Proibido</h2>
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar esta página. Por favor, faça login com uma conta
          autorizada.
        </p>
        <div className="space-y-3">
          <Link
            to="/login"
            className="inline-block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Fazer login
          </Link>
          <Link
            to="/"
            className="inline-block w-full bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
