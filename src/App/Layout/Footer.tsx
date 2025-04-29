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
    <footer className="fixed bottom-0 right-0 p-2 text-gray-500 text-sm">
      <p>© {new Date().getFullYear()} FamilySpot. Todos os direitos reservados.</p>
    </footer>
  );
};

export default Footer;
