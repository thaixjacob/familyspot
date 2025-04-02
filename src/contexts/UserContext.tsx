import React, { createContext, useContext, useReducer } from "react";

// Definir os tipos
type UserState = {
  displayName: string | null;
  email: string | null;
  isAuthenticated: boolean;
};

type UserAction =
  | { type: "LOGIN"; payload: { displayName: string; email: string } }
  | { type: "LOGOUT" };

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
    case "LOGIN":
      return {
        ...state,
        displayName: action.payload.displayName,
        email: action.payload.email,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return initialState;
    default:
      return state;
  }
};

// Provider Component
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
