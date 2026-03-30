import { GoogleGenAI, Type } from "@google/genai";
import { RevenueAnalytics } from "../types/revos";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface LeadData {
  name?: string;
  type?: string;
  location?: string;
  intent?: string;
  budget?: string;
  familySize?: string;
}

export interface Property {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  location: string;
  rooms: number;
  propertyType: "Apartment" | "House" | "Commercial";
  squareFootage: number;
  yearBuilt: number;
  features: string[];
  images: string[];
  matchScore: number; // 0-100
  roi: string; // e.g., "8.5%"
  isPopular: boolean;
  availability: "Limited" | "Available" | "Last Unit";
  sourceUrl?: string;
  lat?: number;
  lng?: number;
  description?: string;
  amenities?: string[];
  floorPlans?: string[];
}

export interface ScoringResult {
  score: "HOT" | "WARM" | "COLD";
  reasoning: string;
  suggestedAction: string;
  presentationTheme?: string;
  properties?: Property[];
  feedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: Date;
  };
}

export interface NurturingMessage {
  day: number;
  subject: string;
  body: string;
  type: 'email' | 'whatsapp' | 'sms';
  variants?: { subject: string, body: string }[];
}

export interface NurturingSequence {
  messages: NurturingMessage[];
}

export async function analyzeLead(lead: LeadData): Promise<ScoringResult> {
  const prompt = `Analyze this lead for GNEL AI Revenue Operating System (RevOS).
  Target Market: Armenia (Yerevan, etc.)
  Lead Profile:
  Type: ${lead.type}
  Location: ${lead.location}
  Intent: ${lead.intent}
  Budget: ${lead.budget}
  Family Size: ${lead.familySize || "Not specified"}

  GOAL: Calculate Revenue Potential and categorize as HOT, WARM, or COLD.
  - HOT: High budget, clear intent, immediate conversion potential.
  - WARM: Information gathering, mid-term conversion.
  - COLD: Low budget or browsing.

  IMPORTANT: Use Google Search to find REAL, CURRENT public property listings in Armenia (Yerevan, etc.) that match these criteria. 
  Check sites like list.am, estate.am, myrealty.am, norakaruyc.am, and official developer sites.
  Also look for information from "Tun Expo" (Yerevan Real Estate Expo) for the latest projects and special offers.
  
  ALL TEXT FIELDS (reasoning, suggestedAction, presentationTheme, property names, features) MUST BE IN ARMENIAN.
  
  Also, suggest a "Personalized Presentation" theme based on their needs (e.g., "Ընտանեկան Օազիս", "Բարձր Եկամտաբեր Ներդրում", "Քաղաքային Շքեղություն").
  Provide 5 specific property recommendations that match their profile using TOP SALES BEST PRACTICES:
  - id: unique string
  - name: luxury sounding name in Armenian (e.g., "Զմրուխտե Այգիներ", "Ադամանդե Պենտհաուս")
  - price: numeric value in USD
  - priceDisplay: formatted string (e.g., "$1,250,000")
  - location: matching their preference (in Armenian)
  - rooms: number of rooms (should match family size needs)
  - propertyType: "Apartment", "House", or "Commercial"
  - squareFootage: numeric value in sq meters
  - yearBuilt: numeric value (e.g., 2024)
  - features: 6 key features/amenities in Armenian (e.g., "Խելացի Տուն", "Անհատական Լողավազան", "24/7 Կոնսյերժ")
  - images: 4-5 unique image keywords for search (e.g., "modern-living-room", "luxury-bedroom", "infinity-pool")
  - matchScore: 0-100, calculate based on how well it fits their budget and location
  - roi: estimated annual return on investment (e.g., "12.4%"), should be higher for investment-focused leads
  - isPopular: boolean, set to true for properties that fit the budget well
  - availability: "Limited", "Available", or "Last Unit" (use "Last Unit" for high match scores to create urgency)
  - sourceUrl: The REAL URL of the listing found via Google Search.
  - lat: Approximate latitude in Yerevan (e.g., 40.1772)
  - lng: Approximate longitude in Yerevan (e.g., 44.5035)
  - description: A luxury, persuasive description of the property in Armenian (2-3 paragraphs).
  - amenities: A detailed list of 10+ premium amenities in Armenian (e.g., "Ստորգետնյա ավտոկայանատեղի", "Ֆիթնես կենտրոն", "Տանիքի այգի").
  - floorPlans: 2-3 image keywords for floor plans (e.g., "modern-apartment-floorplan", "luxury-penthouse-layout").

  Return a JSON response.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.STRING, enum: ["HOT", "WARM", "COLD"] },
            reasoning: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            presentationTheme: { type: Type.STRING, description: "Theme for the generated PDF/React presentation" },
            properties: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  priceDisplay: { type: Type.STRING },
                  location: { type: Type.STRING },
                  rooms: { type: Type.NUMBER },
                  propertyType: { type: Type.STRING, enum: ["Apartment", "House", "Commercial"] },
                  squareFootage: { type: Type.NUMBER },
                  yearBuilt: { type: Type.NUMBER },
                  features: { type: Type.ARRAY, items: { type: Type.STRING } },
                  images: { type: Type.ARRAY, items: { type: Type.STRING } },
                  matchScore: { type: Type.NUMBER },
                  roi: { type: Type.STRING },
                  isPopular: { type: Type.BOOLEAN },
                  availability: { type: Type.STRING, enum: ["Limited", "Available", "Last Unit"] },
                  sourceUrl: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  floorPlans: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "name", "price", "priceDisplay", "location", "rooms", "propertyType", "squareFootage", "yearBuilt", "features", "images", "matchScore", "roi", "isPopular", "availability", "sourceUrl", "lat", "lng", "description", "amenities", "floorPlans"]
              }
            }
          },
          required: ["score", "reasoning", "suggestedAction", "presentationTheme", "properties"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const result = JSON.parse(text);
    return result as ScoringResult;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      score: "WARM",
      reasoning: "Հայտի ավտոմատ վերլուծությունը ձախողվեց:",
      suggestedAction: "Պահանջվում է ձեռքով վերանայում:",
      presentationTheme: "Ստանդարտ Գույքի Ցուցադրում",
      properties: []
    };
  }
}

export async function chatWithAI(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are GNEL AI, a high-end Real Estate Sales Engine in Armenia. GOAL: Convert leads to HOT status. STYLE: Extremely concise (max 150 chars), elite, persuasive. LANGUAGE: Mix of English and Armenian (e.g., 'Luxury living Երևանում'). Use Google Search for real listings from list.am, estate.am, norakaruyc.am. Reference top developers like AAB Construction, Bedeck, Filishin, and Yerevanshin. Mention mortgage partnerships with Ameriabank, Ardshinbank, or Evocabank to create trust. Be interactive: ask 1 sharp question to move them to a viewing/meeting.",
        tools: [{ googleSearch: {} }],
      },
      history: history,
    });

    const response = await chat.sendMessage({ message });
    return response.text || "Ներողություն, ես չկարողացա պատասխանել ձեր հարցին:";
  } catch (error) {
    console.error("AI Chat failed:", error);
    return "Ցավոք, կապի խնդիր առաջացավ: Խնդրում եմ փորձեք մի փոքր ուշ:";
  }
}

export async function generateABVariants(message: NurturingMessage, lead: LeadData): Promise<{ subject: string, body: string }[]> {
  const prompt = `Generate two A/B testing variants for the following real estate nurturing message.
  Lead Profile:
  Type: ${lead.type}
  Location: ${lead.location}
  Intent: ${lead.intent}
  Budget: ${lead.budget}

  Original Message:
  Subject: ${message.subject}
  Body: ${message.body}

  The variants should have different hooks, tones, or calls to action to test what resonates best with the lead.
  ALL TEXT MUST BE IN ARMENIAN.
  Return a JSON response with an array of two variants, each having a 'subject' and 'body'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variants: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ["subject", "body"]
              }
            }
          },
          required: ["variants"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const result = JSON.parse(text);
    return result.variants;
  } catch (error) {
    console.error("A/B variants generation failed:", error);
    return [
      { subject: `${message.subject} (Variant A)`, body: `${message.body} (Variant A)` },
      { subject: `${message.subject} (Variant B)`, body: `${message.body} (Variant B)` }
    ];
  }
}
export async function generateRevenueInsights(analytics: RevenueAnalytics): Promise<string> {
  const prompt = `As a Senior Revenue Operator for GNEL AI, analyze these metrics:
  Total Revenue: $${analytics.totalRevenue}
  AI Influenced Revenue: $${analytics.aiInfluencedRevenue} (${analytics.aiInfluencePercentage}%)
  Lead -> Meeting: ${analytics.leadToMeetingConversion}%
  Meeting -> Deal: ${analytics.meetingToDealConversion}%
  Avg Response Time: ${analytics.timeToFirstResponseMins} mins

  Provide a 3-point executive summary in Armenian on how to increase AI-influenced revenue and accelerate deal velocity.
  Focus on the Armenian real estate market dynamics.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Վերլուծությունը հասանելի չէ:";
  } catch (error) {
    console.error("Revenue insights failed:", error);
    return "Չհաջողվեց գեներացնել եկամտի վերլուծությունը:";
  }
}
export async function generateNurturingSequence(lead: LeadData): Promise<NurturingSequence> {
  const prompt = `Create a 5-day AI-powered nurturing sequence for a COLD real estate lead in Armenia.
  Lead Profile:
  Type: ${lead.type}
  Location: ${lead.location}
  Intent: ${lead.intent}
  Budget: ${lead.budget}
  
  The sequence should include 3-5 automated messages (mix of Email and WhatsApp) sent over a week.
  Content MUST include:
  - Industry insights: Real estate market trends in Yerevan 2024/2025, price appreciation data.
  - Case studies: Success stories of similar buyers or investors (e.g., ROI achieved, dream home found).
  - Educational content: Mortgage benefits with Armenian banks (Ameriabank, Ardshinbank), tax advantages.
  - Special offers: Limited-time discounts, private viewing invitations, or exclusive early access to new projects.
  
  Personalize the messages deeply based on the lead's initial interaction data (budget, location, intent).
  ALL TEXT MUST BE IN ARMENIAN. Use a professional, elite, yet approachable tone.
  
  Return a JSON response with an array of messages.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            messages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["email", "whatsapp", "sms"] }
                },
                required: ["day", "subject", "body", "type"]
              }
            }
          },
          required: ["messages"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text) as NurturingSequence;
  } catch (error) {
    console.error("Nurturing sequence generation failed:", error);
    return {
      messages: [
        {
          day: 1,
          subject: "Բարի գալուստ GNEL AI",
          body: "Շնորհակալություն հետաքրքրության համար: Մենք շուտով կկապնվենք ձեզ հետ:",
          type: 'email'
        }
      ]
    };
  }
}
