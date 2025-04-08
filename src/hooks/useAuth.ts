import { useState } from 'react';

interface User {
  id: string;
  // Adicione outros campos do usuário conforme necessário
}

export const useAuth = () => {
  const [user] = useState<User | null>(null);

  return { user };
};
