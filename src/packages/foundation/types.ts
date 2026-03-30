export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  SYSTEM_ADMIN = 'system_admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

export enum OrganizationPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface Organization {
  id: string;
  name: string;
  settings: Record<string, any>;
  plan: OrganizationPlan;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  status: UserStatus;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  resource?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  organizationId: string;
  metadata: Record<string, any>;
}

export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export enum LeadTemperature {
  COLD = 'cold',
  WARM = 'warm',
  HOT = 'hot'
}

export enum LeadSource {
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  REFERRAL = 'referral',
  OTHER = 'other'
}

export interface Lead {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  stage: LeadStage;
  temperature: LeadTemperature;
  score: number;
  assignedTo?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  organizationId: string;
  userId?: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'assignment' | 'ai_analysis' | 'system';
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
