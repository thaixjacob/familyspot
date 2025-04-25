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
import { logEvent, logError } from '../../utils/logger';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpData {
  name: string;
  lastName: string;
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
    try {
      logEvent('auth_login_started');

      // Primeiro, fazer logout para garantir um estado limpo
      await this.logout();
      logEvent('auth_logout_success');

      // Fazer login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      logEvent('auth_login_success', { uid: userCredential.user.uid });

      // Aguardar a autenticação ser completada
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Buscar dados do usuário
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

        const userData = userDoc.data();

        // Verificar e criar userPreferences se necessário
        const userPrefDoc = await getDoc(doc(db, 'userPreferences', userCredential.user.uid));

        if (!userPrefDoc.exists()) {
          await setDoc(doc(db, 'userPreferences', userCredential.user.uid), {
            locationPermission: false,
            updatedAt: new Date(),
          });
        }

        return {
          user: {
            ...userCredential.user,
            displayName: userData?.displayName || '',
          },
        };
      } catch (firestoreError) {
        logError(firestoreError, 'firestore_access_error');
        // Mesmo com erro no Firestore, retornamos o usuário autenticado
        return {
          user: userCredential.user,
        };
      }
    } catch (error) {
      logError(error, 'auth_login_error');
      throw error;
    }
  }

  public async signUp(userData: SignUpData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Criar documento do usuário
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: userData.name,
        lastName: userData.lastName,
        displayName: userData.name,
        email: userData.email,
        createdAt: new Date(),
        role: 'user',
        locationPermission: false,
      });

      // Criar documento de preferências
      await setDoc(doc(db, 'userPreferences', userCredential.user.uid), {
        locationPermission: false,
        updatedAt: new Date(),
      });

      return {
        user: {
          ...userCredential.user,
          displayName: userData.name,
        },
      };
    } catch (error) {
      logError(error, 'auth_signup_error');
      throw error;
    }
  }

  public async logout() {
    try {
      await signOut(auth);
      // Aguardar o logout ser completado
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logError(error, 'auth_logout_error');
      throw error;
    }
  }

  public isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  public hasRequiredPermissions(): boolean {
    // Por enquanto, retornamos true se o usuário estiver autenticado
    // Você pode adicionar lógica mais complexa aqui baseada em roles ou outras permissões
    return this.isAuthenticated();
  }

  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  public onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}

export default AuthService;
