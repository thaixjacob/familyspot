import React from 'react';
import { Link } from 'react-router-dom';

const ServiceUnavailablePage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">503</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Serviço Temporariamente Indisponível
        </h2>
        <p className="text-gray-600 mb-6">
          Estamos realizando manutenção no sistema. Por favor, tente novamente em alguns minutos.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-block w-full bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Voltar para a página inicial
          </Link>
        </div>
        <div className="mt-6 text-sm text-gray-500">
          <p>Se o problema persistir, entre em contato com nosso suporte:</p>
          <a href="mailto:suporte@familyspot.com" className="text-blue-600 hover:text-blue-800">
            suporte@familyspot.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default ServiceUnavailablePage;
