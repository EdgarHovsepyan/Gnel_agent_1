/**
 * RevOS Domain Models
 * Unified platform for Revenue Operating System
 */

export enum LeadStatus {
  COLD = 'COLD',
  WARM = 'WARM',
  HOT = 'HOT',
  DEAL = 'DEAL',
  LOST = 'LOST'
}

export enum InteractionType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  CALL = 'CALL',
  MEETING = 'MEETING'
}

export interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  settings: {
    whatsappEnabled: boolean;
    telegramEnabled: boolean;
    emailEnabled: boolean;
    aiTone: 'professional' | 'aggressive' | 'elite';
  };
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  type: 'apartment' | 'house' | 'commercial';
  location: string;
  intent: string;
  budget: string;
  status: LeadStatus;
  score: number;
  aiInfluenceScore: number; // 0-100, tracking AI impact
  attributionSource: string; // e.g., 'facebook_ads', 'organic', 'referral'
  crmId?: string; // External ID in CRM (HubSpot, Bitrix24, etc.)
  timestamp: Date;
  nurturingSequence?: NurturingSequence;
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  leadId: string;
  type: InteractionType;
  direction: 'inbound' | 'outbound';
  content: string;
  aiGenerated: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NurturingMessage {
  day: number;
  subject: string;
  body: string;
  type: 'email' | 'whatsapp' | 'sms';
  variants?: { subject: string, body: string }[];
}

export interface NurturingSequence {
  id: string;
  leadId: string;
  messages: NurturingMessage[];
  status: 'active' | 'paused' | 'completed';
  startedAt: Date;
}

export interface Deal {
  id: string;
  leadId: string;
  tenantId: string;
  revenueAmount: number;
  status: 'pending' | 'closed_won' | 'closed_lost';
  closedAt?: Date;
  aiInfluenced: boolean;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  aiInfluencedRevenue: number;
  aiInfluencePercentage: number;
  leadToMeetingConversion: number;
  meetingToDealConversion: number;
  timeToFirstResponseMins: number;
}
