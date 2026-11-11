import { AppUser, AuthSession, UserRole } from '../types';
import { localDB } from './storage';
import { firebaseAuth, googleAuthProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const SESSION_STORAGE_KEY = 'gramanidhi_auth_session';

class AuthService {
  private session: AuthSession | null = null;
  private subscribers: Set<(session: AuthSession | null) => void> = new Set();

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse auth session from localStorage', e);
      this.session = null;
    }
  }

  public subscribe(cb: (session: AuthSession | null) => void) {
    this.subscribers.add(cb);
    cb(this.session);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.session);
      } catch (err) {
        console.error('Auth subscriber error:', err);
      }
    });
  }

  public getSession(): AuthSession | null {
    return this.session;
  }

  public isAuthenticated(): boolean {
    return this.session !== null;
  }

  /**
   * Returns all allowed Gmail addresses currently authorized in the system.
   */
  public async getAllowedEmails(): Promise<{ email: string; name: string; role: UserRole; username: string }[]> {
    const users = await localDB.getUsers();
    const result: { email: string; name: string; role: UserRole; username: string }[] = [];

    // Ensure smdfaizel@gmail.com is listed
    if (!users.some((u) => u.email?.toLowerCase() === 'smdfaizel@gmail.com')) {
      result.push({
        email: 'smdfaizel@gmail.com',
        name: 'SMD Faizel (Super Admin)',
        role: 'admin',
        username: 'admin'
      });
    }

    for (const u of users) {
      if (u.email && u.email.trim()) {
        result.push({
          email: u.email.trim().toLowerCase(),
          name: u.fullName,
          role: u.role,
          username: u.username
        });
      }
    }

    return result;
  }

  /**
   * Triggers real Google Sign-In with Firebase Auth, then verifies against allowed members.
   */
  public async signInWithGoogle(): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
      const email = result.user.email;
      if (!email) {
        return { success: false, error: 'No email associated with Google account.' };
      }
      return await this.verifyAndLogin(
        email,
        result.user.displayName || undefined,
        result.user.photoURL || undefined
      );
    } catch (err: any) {
      console.warn('Firebase Google Sign-In notice:', err?.code, err?.message);
      // If popup was closed by user or blocked in preview iframe, return clean informative error
      if (err?.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in popup was closed before completing.' };
      }
      if (err?.code === 'auth/popup-blocked') {
        return { success: false, error: 'Sign-in popup was blocked by browser. Please enter your Gmail below to verify.' };
      }
      return { success: false, error: err?.message || 'Google authentication error.' };
    }
  }

  /**
   * Verifies the provided Gmail address against allowed members and users.
   * If authorized, creates an active session and records an audit log.
   */
  public async verifyAndLogin(
    email: string,
    displayName?: string,
    photoURL?: string
  ): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    // Initialize local DB
    await localDB.init();
    const users = await localDB.getUsers();

    // 1. Check if email matches existing AppUser
    let user = users.find((u) => u.email?.toLowerCase().trim() === cleanEmail);

    // 2. Special provision for Super Admin smdfaizel@gmail.com
    if (!user && cleanEmail === 'smdfaizel@gmail.com') {
      const adminUser: AppUser = {
        id: 'usr_admin',
        username: 'admin',
        fullName: displayName || 'SMD Faizel',
        fullNameTa: 'எஸ்.எம்.டி. பைசல்',
        phone: '+971 50 889 0123',
        email: 'smdfaizel@gmail.com',
        role: 'admin',
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: '2025-01-01T00:00:00Z',
        notes: 'Primary Super Administrator (Google Verified)'
      };
      await localDB.saveUser(adminUser, 'Google Auth');
      user = adminUser;
    }

    // 3. If not found in users, check if a registered Member has this email
    if (!user) {
      const members = await localDB.getMembers();
      const matchingMember = members.find((m) => m.email?.toLowerCase().trim() === cleanEmail);
      if (matchingMember) {
        user = await localDB.mapMemberToRole({
          memberId: matchingMember.id,
          role: matchingMember.role || 'member',
          email: cleanEmail,
          phone: matchingMember.phone,
          notes: 'Auto-mapped on verified Gmail login'
        }, 'Google Auth');
      }
    }

    // 4. If still not authorized, reject access
    if (!user) {
      await localDB.addAuditLog(
        cleanEmail,
        'GMAIL_AUTH_REJECTED',
        'அங்கீகரிக்கப்படாத ஜிமெயில் உள்நுழைவு முயற்சி',
        `Access denied for Gmail address ${cleanEmail}: Not registered in allowed member roster`,
        `${cleanEmail} மின்னஞ்சலுக்கு அனுமதி மறுக்கப்பட்டது: அங்கீகரிக்கப்பட்ட உறுப்பினர் பட்டியலில் இல்லை`
      );

      return {
        success: false,
        error: `Access Denied: ${cleanEmail} is not registered in the allowed members directory. Please request the Trust Super Admin (smdfaizel@gmail.com) to add your Gmail ID to the system.`
      };
    }

    // 5. Check if account is suspended
    if (user.status === 'suspended') {
      return {
        success: false,
        error: `Account Suspended: The account for ${cleanEmail} is currently deactivated. Please contact the trust administration.`
      };
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    await localDB.saveUser(user, 'Google Auth');

    // Create session
    const session: AuthSession = {
      email: cleanEmail,
      name: displayName || user.fullName,
      picture: photoURL,
      user,
      loginTime: new Date().toISOString()
    };

    this.session = session;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('gramanidhi_role', user.role);

    await localDB.addAuditLog(
      `${user.fullName} (${cleanEmail})`,
      'GMAIL_AUTH_SUCCESS',
      'ஜிமெயில் சரிபார்ப்பு மூலம் உள்நுழைவு',
      `Authenticated via Gmail as ${user.fullName} [Role: ${user.role}]`,
      `${user.fullNameTa || user.fullName} (${cleanEmail}) ஜிமெயில் மூலம் உள்நுழைந்தார் [பொறுப்பு: ${user.role}]`
    );

    this.notify();
    return { success: true, session };
  }

  public logout() {
    const prevEmail = this.session?.email || 'User';
    this.session = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    signOut(firebaseAuth).catch(() => {});

    localDB.addAuditLog(
      prevEmail,
      'AUTH_LOGOUT',
      'பயனர் வெளியேறினார்',
      `User ${prevEmail} logged out of session`,
      `பயனர் ${prevEmail} கணக்கிலிருந்து வெளியேறினார்`
    );

    this.notify();
  }
}

export const authService = new AuthService();
