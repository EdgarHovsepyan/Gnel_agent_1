/**
 * CRM Sync Schema for RevOS
 * Defines how lead data is mapped to external CRMs (HubSpot, Bitrix24, etc.)
 */

export interface CRMSyncPayload {
  // --- Contact Identity ---
  email: string;
  phone: string;
  firstname: string;
  lastname?: string;

  // --- Lead Context (Gathered Information) ---
  lead_source: string;              // e.g., 'facebook_ads', 'instagram_dm'
  property_type_preference: string; // 'Apartment', 'House', 'Commercial'
  preferred_location: string;       // e.g., 'Yerevan, Kentron'
  budget_range: string;             // e.g., '$150k - $200k'
  buying_intent: string;            // e.g., 'Investment', 'Relocation'
  family_size?: string;

  // --- AI Scoring & Insights ---
  revos_ai_score: number;           // 0-100 numerical score
  revos_lead_status: 'HOT' | 'WARM' | 'COLD';
  revos_ai_reasoning: string;       // AI's justification for the score
  revos_suggested_next_action: string;
  revos_ai_influence_score: number; // Impact of AI interactions on this lead
  revos_presentation_theme?: string; // Suggested theme for personalized decks

  // --- Lifecycle & Engagement ---
  lifecyclestage: 'subscriber' | 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity' | 'customer';
  last_interaction_type: string;    // 'EMAIL', 'WHATSAPP', 'CHAT'
  last_interaction_date: string;    // ISO Timestamp
  total_interactions_count: number;
  is_ai_nurturing_active: boolean;
}

/**
 * Logic for updating CRM records
 */
export enum CRMSyncTrigger {
  LEAD_CAPTURED = 'LEAD_CAPTURED',     // First time lead is identified
  AI_ANALYSIS_COMPLETE = 'AI_ANALYSIS_COMPLETE', // After Gemini scores the lead
  INTERACTION_RECORDED = 'INTERACTION_RECORDED', // New message sent/received
  STATUS_CHANGED = 'STATUS_CHANGED',   // Manual or AI-driven status update (e.g. WARM -> HOT)
  NURTURING_STARTED = 'NURTURING_STARTED' // When automated sequence begins
}
