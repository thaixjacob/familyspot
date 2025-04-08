/**
 * UserContext
 *
 * Este contexto gerencia o estado de autenticação e informações do usuário.
 * Ele fornece funcionalidades para:
 * - Gerenciar o estado de autenticação do usuário
 * - Armazenar informações básicas do usuário (email, nome)
 * - Controlar o estado de carregamento durante operações de autenticação
 * - Fornecer métodos para login e logout
 *
 * O contexto é usado em toda a aplicação para controlar o acesso a funcionalidades
 * restritas e personalizar a experiência do usuário baseada em seu estado de autenticação.
 */

import React, { createContext, useContext, useReducer } from 'react';

// Definir os tipos
type UserState = {
  displayName: string | null;
  email: string | null;
  isAuthenticated: boolean;
};

type UserAction =
  | { type: 'LOGIN'; payload: { displayName: string; email: string } }
  | { type: 'LOGOUT' };

type UserContextType = {
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
};

// Criar o contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Estado inicial
const initialState: UserState = {
  displayName: null,
  email: null,
  isAuthenticated: false,
};

// Reducer
const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        displayName: action.payload.displayName,
        email: action.payload.email,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

// Provider Component
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  return <UserContext.Provider value={{ state, dispatch }}>{children}</UserContext.Provider>;
};

// Hook personalizado para usar o contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
