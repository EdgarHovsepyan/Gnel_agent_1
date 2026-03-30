import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  getDocFromServer,
  serverTimestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from '../../firebase';
import { 
  User, 
  Organization, 
  AuditLog, 
  FeatureFlag, 
  UserRole, 
  UserStatus, 
  OrganizationPlan,
  Lead,
  LeadActivity,
  LeadStage,
  LeadTemperature,
  LeadSource
} from './types';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Services ---

export class AuthService {
  private static currentUser: User | null = null;
  private static authReady: boolean = false;

  public static async login(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return await this.syncUserProfile(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  public static async logout(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
  }

  public static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.syncUserProfile(firebaseUser);
        this.currentUser = user;
        this.authReady = true;
        callback(user);
      } else {
        this.currentUser = null;
        this.authReady = true;
        callback(null);
      }
    });
  }

  private static async syncUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    const userDoc = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDoc);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate()
        } as User;
      } else {
        // Create default user profile
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          role: UserRole.USER,
          organizationId: 'default', // In a real app, this would be linked to an invite or org creation
          permissions: [],
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          lastLoginAt: new Date()
        };
        await setDoc(userDoc, {
          ...newUser,
          createdAt: Timestamp.fromDate(newUser.createdAt),
          lastLoginAt: Timestamp.fromDate(newUser.lastLoginAt!)
        });
        return newUser;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      throw error;
    }
  }

  public static getCurrentUser(): User | null {
    return this.currentUser;
  }

  public static isReady(): boolean {
    return this.authReady;
  }
}

export class OrgService {
  public static async getOrganization(orgId: string): Promise<Organization | null> {
    const orgDoc = doc(db, 'organizations', orgId);
    try {
      const snap = await getDoc(orgDoc);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Organization;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${orgId}`);
      return null;
    }
  }

  public static async createOrganization(name: string, plan: OrganizationPlan): Promise<string> {
    const orgsCol = collection(db, 'organizations');
    try {
      const newOrg = {
        name,
        plan,
        settings: {},
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(orgsCol, newOrg);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'organizations');
      throw error;
    }
  }
}

export class AuditService {
  public static async log(action: string, metadata: Record<string, any> = {}): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    const logsCol = collection(db, 'audit_logs');
    try {
      await addDoc(logsCol, {
        userId: user.id,
        organizationId: user.organizationId,
        action,
        metadata,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
    }
  }

  public static async getLogs(organizationId: string): Promise<AuditLog[]> {
    const q = query(
      collection(db, 'audit_logs'),
      where('organizationId', '==', organizationId)
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date()
        } as AuditLog;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      return [];
    }
  }
}

export class FeatureFlagService {
  public static async isEnabled(name: string): Promise<boolean> {
    const user = AuthService.getCurrentUser();
    if (!user) return false;

    const q = query(
      collection(db, 'feature_flags'),
      where('name', '==', name),
      where('organizationId', '==', user.organizationId)
    );

    try {
      const snap = await getDocs(q);
      if (snap.empty) return false;
      return snap.docs[0].data().enabled;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'feature_flags');
      return false;
    }
  }

  public static async getAllFlags(organizationId: string): Promise<FeatureFlag[]> {
    const q = query(
      collection(db, 'feature_flags'),
      where('organizationId', '==', organizationId)
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          enabled: data.enabled,
          organizationId: data.organizationId,
          metadata: data.metadata || {}
        } as FeatureFlag;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'feature_flags');
      return [];
    }
  }
}

export class LeadService {
  public static async createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'>): Promise<Lead> {
    // Deduplication logic: check for existing lead with same email or phone in the same organization
    if (data.email || data.phone) {
      let q;
      if (data.email) {
        q = query(
          collection(db, 'leads'),
          where('organizationId', '==', data.organizationId),
          where('email', '==', data.email),
          limit(1)
        );
      } else {
        q = query(
          collection(db, 'leads'),
          where('organizationId', '==', data.organizationId),
          where('phone', '==', data.phone),
          limit(1)
        );
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data() as any;
        // Log deduplication attempt
        await this.logActivity({
          leadId: snap.docs[0].id,
          organizationId: data.organizationId,
          type: 'system',
          description: 'Duplicate lead attempt detected and merged.',
          metadata: { duplicateData: data }
        });
        
        return {
          ...existing,
          id: snap.docs[0].id,
          createdAt: existing.createdAt?.toDate() || new Date(),
          updatedAt: existing.updatedAt?.toDate() || new Date(),
          lastActivityAt: existing.lastActivityAt?.toDate() || new Date()
        } as Lead;
      }
    }

    const docRef = doc(collection(db, 'leads'));
    const now = new Date();
    const lead: Lead = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now
    };

    try {
      await setDoc(docRef, {
        ...lead,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp()
      });
      
      await this.logActivity({
        leadId: lead.id,
        organizationId: lead.organizationId,
        type: 'system',
        description: `Lead created from ${lead.source}`,
        metadata: { source: lead.source }
      });

      return lead;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leads');
      throw error;
    }
  }

  public static async updateLead(leadId: string, organizationId: string, updates: Partial<Lead>): Promise<void> {
    const docRef = doc(db, 'leads', leadId);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Log stage change if applicable
      if (updates.stage) {
        await this.logActivity({
          leadId,
          organizationId,
          type: 'stage_change',
          description: `Stage changed to ${updates.stage}`,
          metadata: { newStage: updates.stage }
        });
      }

      // Log assignment if applicable
      if (updates.assignedTo) {
        await this.logActivity({
          leadId,
          organizationId,
          type: 'assignment',
          description: `Lead assigned to user ${updates.assignedTo}`,
          metadata: { assignedTo: updates.assignedTo }
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leads');
      throw error;
    }
  }

  public static async logActivity(data: Omit<LeadActivity, 'id' | 'timestamp' | 'userId'>): Promise<void> {
    const user = AuthService.getCurrentUser();
    const docRef = doc(collection(db, 'lead_activities'));
    
    try {
      await setDoc(docRef, {
        ...data,
        id: docRef.id,
        userId: user?.id || 'system',
        timestamp: serverTimestamp()
      });

      // Update lastActivityAt on lead
      await updateDoc(doc(db, 'leads', data.leadId), {
        lastActivityAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lead_activities');
    }
  }

  public static async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const q = query(
      collection(db, 'lead_activities'),
      where('leadId', '==', leadId),
      orderBy('timestamp', 'desc')
    );

    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date()
        } as LeadActivity;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'lead_activities');
      return [];
    }
  }

  public static async getLeads(organizationId: string, filters?: {
    stage?: LeadStage;
    temperature?: LeadTemperature;
    source?: LeadSource;
    assignedTo?: string;
  }): Promise<Lead[]> {
    let q = query(
      collection(db, 'leads'),
      where('organizationId', '==', organizationId)
    );

    if (filters?.stage) q = query(q, where('stage', '==', filters.stage));
    if (filters?.temperature) q = query(q, where('temperature', '==', filters.temperature));
    if (filters?.source) q = query(q, where('source', '==', filters.source));
    if (filters?.assignedTo) q = query(q, where('assignedTo', '==', filters.assignedTo));

    q = query(q, orderBy('lastActivityAt', 'desc'));

    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastActivityAt: data.lastActivityAt?.toDate() || new Date()
        } as Lead;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leads');
      return [];
    }
  }
}

export const authService = AuthService; // Export the class as authService for backward compatibility if needed, though App.tsx uses the class name.
