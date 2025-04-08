/**
 * Serviço de Autenticação
 *
 * Este serviço é responsável por gerenciar todas as operações relacionadas à autenticação do usuário,
 * incluindo login, registro, logout e verificação de estado de autenticação.
 *
 * Implementa o padrão Singleton para garantir uma única instância do serviço em toda a aplicação.
 *
 * Funcionalidades:
 * - Login de usuário
 * - Registro de novos usuários
 * - Logout
 * - Verificação de autenticação
 * - Gerenciamento de token JWT
 *
 * @example
 * const authService = AuthService.getInstance();
 * await authService.login({ email: 'user@example.com', password: '123456' });
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials) {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // Buscar dados adicionais do usuário no Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    const userData = userDoc.data();

    return {
      user: {
        ...userCredential.user,
        displayName: userData?.displayName || '',
      },
    };
  }

  public async signUp(userData: SignUpData) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    // Criar documento do usuário no Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      displayName: userData.name,
      email: userData.email,
      createdAt: new Date(),
      role: 'user',
    });

    return {
      user: {
        ...userCredential.user,
        displayName: userData.name,
      },
    };
  }

  public async logout() {
    await signOut(auth);
  }

  public isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  public onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}

export default AuthService;
