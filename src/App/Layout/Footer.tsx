/**
 * Componente Footer
 *
 * Este componente é responsável pelo rodapé da aplicação, incluindo:
 * - Informações sobre a aplicação
 * - Copyright e direitos autorais
 * - Links úteis (quando necessário)
 *
 * O componente é responsivo e se adapta a diferentes tamanhos de tela:
 * - Em telas menores, os elementos são empilhados verticalmente
 * - Em telas maiores, os elementos são dispostos horizontalmente
 *
 * Estilização:
 * - Utiliza classes do Tailwind CSS para layout e responsividade
 * - Cores e espaçamentos consistentes com o design system da aplicação
 */

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-gray-500 p-4">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex flex-row items-center gap-4">
            <h3 className="text-lg font-semibold">FamilySpot</h3>
            <p className="text-sm text-gray-400">Encontre os melhores lugares para sua família</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>© {new Date().getFullYear()} FamilySpot. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
