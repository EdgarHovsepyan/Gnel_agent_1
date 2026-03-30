import { Lead, LeadStatus, InteractionType } from "../types/revos";
import { ScoringResult } from "./aiService";
import { CRMSyncPayload, CRMSyncTrigger } from "../types/crm";

/**
 * CRM Service for RevOS
 * Handles the mapping and synchronization logic between RevOS and external CRMs.
 */
export class CRMService {
  private static instance: CRMService;
  
  private constructor() {}

  public static getInstance(): CRMService {
    if (!CRMService.instance) {
      CRMService.instance = new CRMService();
    }
    return CRMService.instance;
  }

  /**
   * Maps a RevOS Lead and its latest AI analysis to the CRM Schema
   */
  public mapLeadToCRMPayload(lead: Lead, analysis?: ScoringResult): CRMSyncPayload {
    // Determine Lifecycle Stage based on Lead Status
    let lifecycleStage: CRMSyncPayload['lifecyclestage'] = 'lead';
    if (lead.status === LeadStatus.HOT) lifecycleStage = 'salesqualifiedlead';
    else if (lead.status === LeadStatus.WARM) lifecycleStage = 'marketingqualifiedlead';
    else if (lead.status === LeadStatus.DEAL) lifecycleStage = 'opportunity';

    const lastInteraction = lead.interactions.length > 0 
      ? lead.interactions[lead.interactions.length - 1] 
      : null;

    return {
      email: lead.email,
      phone: lead.phone,
      firstname: lead.name.split(' ')[0] || lead.name,
      lastname: lead.name.split(' ').slice(1).join(' ') || undefined,
      
      lead_source: lead.attributionSource,
      property_type_preference: lead.type,
      preferred_location: lead.location,
      budget_range: lead.budget,
      buying_intent: lead.intent,
      
      revos_ai_score: lead.score,
      revos_lead_status: lead.status as 'HOT' | 'WARM' | 'COLD',
      revos_ai_reasoning: analysis?.reasoning || '',
      revos_suggested_next_action: analysis?.suggestedAction || '',
      revos_ai_influence_score: lead.aiInfluenceScore,
      revos_presentation_theme: analysis?.presentationTheme,

      lifecyclestage: lifecycleStage,
      last_interaction_type: lastInteraction?.type || 'NONE',
      last_interaction_date: lastInteraction?.timestamp.toISOString() || lead.timestamp.toISOString(),
      total_interactions_count: lead.interactions.length,
      is_ai_nurturing_active: lead.nurturingSequence?.status === 'active'
    };
  }

  /**
   * Simulates syncing to an external CRM (HubSpot/Bitrix24)
   */
  public async syncToCRM(lead: Lead, trigger: CRMSyncTrigger, analysis?: ScoringResult): Promise<{ success: boolean; externalId?: string }> {
    const payload = this.mapLeadToCRMPayload(lead, analysis);
    
    console.log(`[CRM Sync] Trigger: ${trigger}`);
    console.log(`[CRM Sync] Payload:`, payload);

    // In a real implementation, this would be an API call to HubSpot or Bitrix24
    // Example HubSpot call:
    // await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ properties: payload })
    // });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, externalId: `CRM_${Math.random().toString(36).substr(2, 9)}` });
      }, 800);
    });
  }

  /**
   * Logic for updating records based on interactions
   */
  public async handleInteractionUpdate(lead: Lead, newInteraction: any): Promise<void> {
    // 1. Update internal lead state (this would usually happen in a state manager or DB)
    lead.interactions.push(newInteraction);
    
    // 2. Recalculate AI Influence (simplified logic)
    if (newInteraction.aiGenerated) {
      lead.aiInfluenceScore = Math.min(100, lead.aiInfluenceScore + 5);
    }

    // 3. Trigger CRM Sync
    await this.syncToCRM(lead, CRMSyncTrigger.INTERACTION_RECORDED);
  }

  /**
   * Logic for updating records based on AI Scoring
   */
  public async handleAIScoringUpdate(lead: Lead, analysis: ScoringResult): Promise<void> {
    // 1. Update lead status and score
    lead.status = analysis.score as any;
    lead.score = analysis.score === 'HOT' ? 90 : analysis.score === 'WARM' ? 60 : 30;
    
    // 2. Trigger CRM Sync
    await this.syncToCRM(lead, CRMSyncTrigger.AI_ANALYSIS_COMPLETE, analysis);
  }
}

export const crmService = CRMService.getInstance();
