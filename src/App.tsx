/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  Bot, 
  Zap, 
  CheckCircle2, 
  MapPin, 
  Briefcase, 
  Home, 
  DollarSign, 
  LayoutDashboard, 
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Bell,
  Building2,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  TrendingUp,
  Users,
  AlertCircle,
  Star,
  ExternalLink,
  Map as MapIcon,
  X,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Palette,
  RotateCcw,
  Clock,
  ArrowRightLeft,
  Plus,
  Split,
  Mail,
  Phone
} from 'lucide-react';
import { AuthService, OrgService, AuditService, FeatureFlagService } from './packages/foundation/services';
import { User as FoundationUser, Organization, AuditLog, FeatureFlag, UserRole } from './packages/foundation/types';
import { auth, db } from './firebase';
import { AdminDashboard } from './components/AdminDashboard';
import { analyzeLead, chatWithAI, generateNurturingSequence, generateABVariants, generateRevenueInsights, LeadData, ScoringResult, NurturingSequence, Property } from './services/aiService';
import { LeadStatus, InteractionType, RevenueAnalytics, Interaction } from './types/revos';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error?.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[#141414] border border-red-500/20 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
            <h2 className="text-xl font-serif italic text-white mb-4">System Error</h2>
            <p className="text-sm text-white/60 font-serif italic mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-colors"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

// --- Types ---

type MessageType = 'bot' | 'user' | 'system';

interface Message {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  options?: string[];
  cards?: PromoCard[];
  presentation?: {
    title: string;
    theme: string;
    url: string;
    properties?: any[];
  };
}

interface PromoCard {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface AppLead extends LeadData {
  id: string;
  status: 'HOT' | 'WARM' | 'COLD';
  timestamp: Date;
  summary?: string;
  presentationTheme?: string;
  presentation?: Message['presentation'];
  feedback?: {
    rating: number;
    comment?: string;
    timestamp: Date;
  };
  chatHistory?: Message[];
  nurturingSequence?: {
    messages: {
      day: number;
      subject: string;
      body: string;
      type: 'email' | 'whatsapp' | 'sms';
      variants?: { subject: string, body: string }[];
    }[];
  };
}

// --- Constants ---

const PROMO_CARDS: PromoCard[] = [
  {
    title: "Արագ Արձագանք",
    description: "60 վայրկյանում պատասխանելը բարձրացնում է կոնվերսիան 391%-ով",
    icon: <Zap className="w-6 h-6 text-yellow-400" />
  },
  {
    title: "AI Կանխատեսող Սքորինգ",
    description: "Լիդերի որակավորում ըստ վարքագծային ազդանշանների և բյուջեի",
    icon: <BarChart3 className="w-6 h-6 text-blue-400" />
  },
  {
    title: "Պրեզենտացիոն Գործակալ",
    description: "Անհատականացված PDF բուկլետների ստեղծում վայրկյանների ընթացքում",
    icon: <LayoutDashboard className="w-6 h-6 text-purple-400" />
  }
];

// --- Pitch Deck Component ---

const PitchDeck = ({ onClose }: { onClose: () => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const slides = [
    {
      title: "Ինչու են developer-ները կորցնում lead-եր",
      subtitle: "Խնդիրը շուկայում",
      content: [
        "Instagram / Messenger հարցումները հաճախ մնում են առանց արագ պատասխան",
        "Sales team-ը զբաղվում է անորակ կամ չտաք lead-երով",
        "Qualification-ը կատարվում է ձեռքով և անկանոն",
        "Hot buyer-երը հաճախ ուշ են մշակվում",
        "CRM-ը կա, բայց front-end lead capture layer-ը կապակցված չէ"
      ],
      notes: "«Շատ developer-ներ արդեն ունեն CRM կամ advertising, բայց funnel-ը ամբողջական չէ։ Խնդիրը ոչ թե միայն lead acquisition-ն է, այլ արագ qualification-ն ու routing-ը ճիշտ manager-ին։»\n\nԱյս նախագծի current state-ը հենց սա է՝ backend CRM foundation-ը պատրաստ է, իսկ հաջորդ critical phase-ը conversation layer-ն ու qualification-to-CRM handoff-ն է։",
      bg: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070"
    },
    {
      title: "Real Estate Revenue System",
      subtitle: "Մեր լուծումը",
      content: [
        "Flow: Instagram DM / Messenger / WhatsApp → ManyChat Bot → Qualification → HubSpot CRM → Lead Scoring → Manager Alert / Follow-up",
        "Key Components:",
        "• AI qualification bot",
        "• HubSpot CRM integration",
        "• Lead scoring logic",
        "• Manager alerts",
        "• Follow-up engine"
      ],
      notes: "«Սա ոչ թե մեկ գործիք է, այլ միացյալ համակարգ։ Lead-ը մտնում է social channel-ից, bot-ը qualification է անում, CRM-ը գրանցում է lead-ը, և sales-ը ստանում է արդեն prioritized action։»\n\nՃարտարապետության համաձայն traffic layer-ը գալիս է Instagram/FB/Website/WhatsApp-ից, conversation layer-ը ManyChat-ն է, CRM layer-ը HubSpot-ն է, իսկ sales layer-ում Hot leads-ը trigger են անում արագ manager action",
      bg: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069"
    },
    {
      title: "Instagram DM → Bot → HubSpot → Alert",
      subtitle: "Ինչպես է աշխատում funnel-ը",
      content: [
        "Buyer-ը գրում է Instagram DM",
        "Bot-ը տալիս է qualification հարցեր",
        "Հավաքվում են՝ Apartment Type, Budget Range, Preferred Floor, Payment Method, Purchase Timeline, Name / Phone / Email",
        "Contact-ը ստեղծվում է HubSpot-ում",
        "Deal-ը ստեղծվում է pipeline-ում",
        "Lead-ը դասակարգվում է՝ Hot / Warm / Cold",
        "Manager-ը ստանում է alert, եթե lead-ը high-intent է"
      ],
      notes: "«Սա funnel է, որը removes friction-ը first response-ի և qualification-ի փուլերում։ Մենեջերը չի սկսում զրույցը զրոյից, այլ ստանում է արդեն պատրաստ lead context։»\n\nQualification հարցերը, deal creation-ը, scoring logic-ը և manager alerts-ը փաստաթղթերում ֆիքսված են որպես core flow։",
      bg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070"
    },
    {
      title: "Բիզնես արդյունքը",
      subtitle: "Ինչ արժեք է տալիս developer-ին",
      content: [
        "Ավելի արագ first response",
        "Ավելի քիչ lost hot leads",
        "Sales team-ը աշխատում է prioritized lead-երով",
        "CRM-ում կա ամբողջ qualification history",
        "Ավելի հեշտ է չափել conversion-ը՝ ad-ից մինչև deal",
        "Հնարավոր է կառուցել predictable pipeline"
      ],
      notes: "«Developer-ի համար սա operational efficiency չէ միայն։ Սա revenue visibility է։ Երբ hot lead-ը հայտնաբերվում է անմիջապես և route է արվում ճիշտ, conversion rate-ը բարձրանալու ամենամեծ շանսն այստեղ է։»\n\nՀամակարգի core objective-ը predictable lead flow, qualified leads և fast conversion into revenue-ն է։",
      bg: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2015"
    },
    {
      title: "Ինտեգրում և Մեկնարկ",
      subtitle: "Հաջորդ քայլերը",
      content: [
        "Աուդիտ և Funnel-ի նախագծում",
        "ManyChat և HubSpot կոնֆիգուրացիա",
        "AI Qualification սցենարների մշակում",
        "Թեստավորում և Sales team-ի վերապատրաստում",
        "Լիարժեք մեկնարկ և օպտիմալացում"
      ],
      notes: "«Մենք պատրաստ ենք սկսել ինտեգրումը հենց հիմա: Մեր նպատակն է ստեղծել համակարգ, որը կաշխատի ձեր բիզնեսի համար 24/7՝ ապահովելով առավելագույն եկամուտ:»",
      bg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2074"
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="h-full bg-black relative overflow-hidden">
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-8 right-8 z-50 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0">
            <img 
              src={slides[currentSlide].bg} 
              className="w-full h-full object-cover opacity-30" 
              alt="background"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          </div>

          <div className="relative h-full flex flex-col justify-center px-6 md:px-24 max-w-5xl space-y-6 md:space-y-12">
            <div className="space-y-2 md:space-y-4">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-accent font-black tracking-[0.4em] uppercase text-[8px] md:text-xs"
              >
                {slides[currentSlide].subtitle}
              </motion.p>
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-4xl md:text-7xl font-serif italic font-light uppercase tracking-tighter leading-tight md:leading-none"
              >
                {slides[currentSlide].title}
              </motion.h2>
            </div>
 
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 md:space-y-6"
            >
              {slides[currentSlide].content.map((item, i) => (
                <div key={i} className="flex items-start gap-3 md:gap-4 group">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-accent mt-2 flex-shrink-0" />
                  <p className="text-sm sm:text-lg md:text-2xl text-white/70 font-light leading-relaxed font-serif italic group-hover:text-white transition-colors">
                    {item}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Speaker Notes Overlay */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-24 left-12 right-12 md:left-24 md:right-24 bg-white/5 backdrop-blur-2xl border border-white/10 p-8 z-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Speaker Notes</h4>
              <button onClick={() => setShowNotes(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white/60 font-serif italic text-lg leading-relaxed whitespace-pre-wrap">
              {slides[currentSlide].notes}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-8 md:bottom-12 left-6 right-6 md:left-24 md:right-24 flex items-center justify-between z-40">
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={prevSlide}
            className="w-10 h-10 md:w-12 md:h-12 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="w-10 h-10 md:w-12 md:h-12 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`text-[10px] font-black uppercase tracking-widest transition-all ${showNotes ? 'text-accent' : 'text-white/40 hover:text-white'}`}
          >
            {showNotes ? 'Hide Notes' : 'Show Notes'}
          </button>
          <div className="text-white/20 text-[10px] font-black tracking-widest">
            {currentSlide + 1} / {slides.length}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Color Picker Component ---

const ColorPicker = ({ color, accentColor, onChange, onClose }: { color: string, accentColor: string, onChange: (c: string) => void, onClose: () => void }) => {
  const colors = [accentColor, '#C5A059', '#EA580C', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#FFFFFF'];
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute top-full right-0 mt-4 p-4 bg-black/90 backdrop-blur-2xl border border-white/10 z-[100] shadow-2xl min-w-[200px]"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Accent Color</span>
        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-none border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <input 
          type="color" 
          value={color} 
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 bg-transparent border-none cursor-pointer p-0"
        />
        <span className="text-[10px] font-mono text-white/60 uppercase">{color}</span>
      </div>
    </motion.div>
  );
};

// --- Components ---

const PropertyMap = ({ properties, activeId, onSelect }: { properties: any[], activeId?: string, onSelect: (id: string) => void }) => {
  // Simple SVG representation of Yerevan map
  return (
    <div className="relative w-full h-[400px] sm:h-[600px] bg-white/5 rounded-3xl overflow-hidden border border-white/10">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {/* Grid lines to simulate a map */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      
      {/* Map Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {properties.map((prop) => {
            // Map lat/lng to relative x/y (Yerevan range approx: lat 40.1-40.25, lng 44.4-44.6)
            const x = ((prop.lng - 44.4) / 0.2) * 100;
            const y = (1 - (prop.lat - 40.1) / 0.15) * 100;
            
            return (
              <motion.button
                key={prop.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.2 }}
                onClick={() => onSelect(prop.id)}
                onMouseEnter={() => onSelect(prop.id)}
                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-none flex items-center justify-center transition-all shadow-2xl z-10 border-2 ${
                  activeId === prop.id 
                    ? 'bg-accent scale-125 z-20 border-white shadow-[0_0_30px_color-mix(in_srgb,var(--accent),transparent_40%)]' 
                    : 'bg-black text-accent border-accent hover:bg-white hover:text-black'
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <MapPin className={`w-4 h-4 ${activeId === prop.id ? 'text-black' : ''}`} />
                
                {activeId === prop.id && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-accent rounded-none -z-10"
                  />
                )}
                
                {activeId === prop.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-black border border-white/10 p-4 rounded-none shadow-2xl pointer-events-none gold-glow"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent mb-1">{prop.location}</p>
                    <p className="text-sm font-serif italic truncate">{prop.name}</p>
                    <p className="text-base font-serif text-white mt-1">{prop.priceDisplay}</p>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Քարտեզի Լեգենդ</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-600 rounded-full" />
          <span className="text-xs font-medium">Ընտրված օբյեկտ</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 bg-white rounded-full" />
          <span className="text-xs font-medium">Առաջարկվող օբյեկտ</span>
        </div>
      </div>
    </div>
  );
};

const MortgageCalculator = ({ price }: { price: number }) => {
  const [downPayment, setDownPayment] = useState(price * 0.2);
  const [interestRate, setInterestRate] = useState(12); // Average in Armenia
  const [term, setTerm] = useState(20);

  const loanAmount = price - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = term * 12;
  const monthlyPayment = loanAmount > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
    : 0;

  return (
    <div className="bg-white/5 p-8 border border-white/10 rounded-none space-y-8">
      <div className="space-y-2">
        <h3 className="text-xl font-serif italic font-light uppercase tracking-tight">Հիփոթեքային Հաշվիչ</h3>
        <p className="text-[8px] text-white/40 uppercase font-black tracking-widest">Հաշվարկեք ձեր ամսական վճարումները</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
            <span>Կանխավճար</span>
            <span>${downPayment.toLocaleString()}</span>
          </div>
          <input 
            type="range" 
            min={price * 0.1} 
            max={price * 0.5} 
            step={1000}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Տոկոսադրույք (%)</label>
            <input 
              type="number" 
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-none text-sm text-white focus:border-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Ժամկետ (տարի)</label>
            <input 
              type="number" 
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-none text-sm text-white focus:border-accent outline-none"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <p className="text-[8px] text-white/40 uppercase font-black tracking-widest mb-2">Ամսական Վճար</p>
          <p className="text-4xl font-serif italic text-accent">${Math.round(monthlyPayment).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onStart, onSearch, onPitch }: { onStart: () => void, onSearch: (type: string) => void, onPitch: () => void }) => {
  const bestSellersRef = useRef<HTMLDivElement>(null);
  const partnersRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const partners = [
    { name: 'ML Mining', logo: 'ML MINING' },
    { name: 'AAB Construction', logo: 'AAB CONST.' },
    { name: 'Defanse Housing', logo: 'DEFANSE' },
    { name: 'Horizon-95', logo: 'HORIZON-95' },
    { name: 'Ameriabank', logo: 'AMERIABANK' },
    { name: 'Evocabank', logo: 'EVOCABANK' },
    { name: 'Ardshinbank', logo: 'ARDSHINBANK' },
  ];

  const bestSellers = [
    { title: 'ML Mining - Դավթաշեն', price: 'Սկսած $1,200/մ²', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800', status: 'Hot' },
    { title: 'AAB - Կենտրոն', price: 'Սկսած $2,800/մ²', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800', status: 'Premium' },
    { title: 'Defanse - Աջափնյակ', price: 'Սկսած $1,100/մ²', image: 'https://images.unsplash.com/photo-1600607687931-cebf574fd842?auto=format&fit=crop&q=80&w=800', status: 'Investment' },
    { title: 'Horizon - Արաբկիր', price: 'Սկսած $1,900/մ²', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800', status: 'Family' },
  ];

  return (
  <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center pt-24 pb-12 text-center relative overflow-x-hidden">
    {/* Background Marquee - Recipe 5 Brutalist */}
    <div className="absolute top-0 left-0 w-full overflow-hidden opacity-5 pointer-events-none select-none whitespace-nowrap py-2 md:py-4 border-b border-white">
      <div className="flex animate-marquee text-[20vw] sm:text-[15vw] md:text-[10vw] font-black uppercase italic tracking-tighter">
        REAL ESTATE AI • GNEL TECHNOLOGY • SMART SALES • REAL ESTATE AI • GNEL TECHNOLOGY • SMART SALES • 
      </div>
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 md:space-y-8 max-w-6xl relative z-10 w-full px-6"
    >
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-600 text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] uppercase mb-2 md:mb-4 shadow-[0_0_30px_rgba(234,88,12,0.4)]">
        <Zap className="w-3 h-3 fill-current" /> Next-Gen Sales Engine
      </div>
      
      {/* Massive Editorial Typography - Recipe 2 */}
      <h1 className="text-[15vw] sm:text-[12vw] md:text-[10vw] lg:text-[8vw] font-serif font-light tracking-tighter leading-[0.8] sm:leading-[0.85] uppercase italic text-white">
        GNEL <span className="text-accent">AI</span> <br />
        <span className="outline-text">ESTATE</span>
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center text-left mt-8 md:mt-12">
        <div className="space-y-4 md:space-y-6">
          <p className="text-xl sm:text-2xl md:text-3xl text-white/80 font-serif italic leading-tight">
            Ոչ միայն չաթ-բոտ, այլ եկամուտների կառավարման <span className="font-bold text-white underline decoration-accent decoration-2 underline-offset-8">ամբողջական համակարգ</span>:
          </p>
          <div className="flex flex-col gap-3 sm:gap-4">
            <button 
              onClick={onStart}
              className="w-full bg-accent text-black py-4 md:py-6 px-6 md:px-10 rounded-none font-black text-[9px] md:text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 group hover:bg-white shadow-2xl shadow-accent/20"
            >
              Գործարկել AI Funnel <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={() => onSearch('all')}
                className="flex-1 bg-white/5 border border-white/10 text-white py-4 md:py-6 px-6 md:px-10 rounded-none font-black text-[9px] md:text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 group hover:bg-white hover:text-black"
              >
                Որոնել Գույք <Search className="w-5 h-5 group-hover:scale-125 transition-transform" />
              </button>
              <button 
                onClick={onPitch}
                className="flex-1 bg-white/5 border border-white/10 text-white py-4 md:py-6 px-6 md:px-10 rounded-none font-black text-[9px] md:text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 group hover:bg-white hover:text-black"
              >
                Pitch Deck <Presentation className="w-5 h-5 group-hover:scale-125 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/5 p-6 aspect-square flex flex-col justify-end group hover:bg-accent transition-all duration-500 cursor-default gold-glow">
            <span className="text-4xl font-serif italic mb-2 group-hover:text-white text-accent">01</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100">Արագ Արձագանք</p>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 aspect-square flex flex-col justify-end group hover:bg-accent transition-all duration-500 cursor-default gold-glow">
            <span className="text-4xl font-serif italic mb-2 group-hover:text-white text-accent">02</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100">AI Սքորինգ</p>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 aspect-square flex flex-col justify-end group hover:bg-accent transition-all duration-500 cursor-default gold-glow">
            <span className="text-4xl font-serif italic mb-2 group-hover:text-white text-accent">03</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100">Պրեզենտացիա</p>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 aspect-square flex flex-col justify-end group hover:bg-accent transition-all duration-500 cursor-default gold-glow">
            <span className="text-4xl font-serif italic mb-2 group-hover:text-white text-accent">04</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100">CRM Կապ</p>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Horizontal Scrolling Sections */}
    <div className="w-full max-w-7xl mx-auto mt-24 md:mt-32 space-y-20 md:space-y-32 text-left relative z-10 px-6">
      
      {/* Best Sellers */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl md:text-3xl font-serif italic uppercase text-white tracking-tight">Լավագույն Առաջարկներ</h3>
          <div className="flex gap-2">
            <button onClick={() => scroll(bestSellersRef, 'left')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/40" />
            </button>
            <button onClick={() => scroll(bestSellersRef, 'right')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5 text-white/40" />
            </button>
          </div>
        </div>
        <div ref={bestSellersRef} className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar -mx-6 px-6">
          {bestSellers.map((item, i) => (
             <div key={i} className="snap-center shrink-0 w-[280px] md:w-[400px] bg-white/5 border border-white/10 group cursor-pointer hover:border-accent/50 transition-colors">
               <div className="h-[200px] md:h-[250px] overflow-hidden relative">
                 <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                 <div className="absolute top-4 right-4 bg-accent text-black text-[10px] font-black px-3 py-1 uppercase tracking-widest">{item.status}</div>
               </div>
               <div className="p-6">
                 <h4 className="text-lg md:text-xl font-serif italic mb-2 text-white group-hover:text-accent transition-colors">{item.title}</h4>
                 <p className="text-white/60 font-mono text-sm">{item.price}</p>
               </div>
             </div>
          ))}
        </div>
      </div>

      {/* Partners */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl md:text-3xl font-serif italic uppercase text-white tracking-tight">Գործընկերներ</h3>
          <div className="flex gap-2">
            <button onClick={() => scroll(partnersRef, 'left')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/40" />
            </button>
            <button onClick={() => scroll(partnersRef, 'right')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5 text-white/40" />
            </button>
          </div>
        </div>
        <div ref={partnersRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-8 hide-scrollbar -mx-6 px-6">
          {partners.map((partner, i) => (
             <div key={i} className="snap-center shrink-0 w-[160px] md:w-[220px] h-[80px] md:h-[100px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all group cursor-pointer">
               <span className="text-sm md:text-lg font-black tracking-widest uppercase text-white/40 group-hover:text-white transition-colors text-center px-4">{partner.logo}</span>
             </div>
          ))}
        </div>
      </div>
    </div>

    <div className="w-full px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-white/20 text-[10px] font-black tracking-[0.3em] uppercase mt-24 md:mt-32 relative z-10">
      <div>© 2026 GNEL AI TECHNOLOGY</div>
      <div className="flex flex-wrap justify-center gap-6 md:gap-12">
        <button onClick={onPitch} className="hover:text-white transition-colors uppercase">Pitch Deck</button>
        <a href="#" className="hover:text-white transition-colors">Enterprise</a>
        <a href="#" className="hover:text-white transition-colors">API Docs</a>
        <a href="#" className="hover:text-white transition-colors">Insights</a>
      </div>
    </div>
  </div>
  );
};

const MarketIntelligence = () => {
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const priceData = [
    { name: 'Կենտրոն', price: 2800, trend: '+5.2%' },
    { name: 'Արաբկիր', price: 1950, trend: '+3.8%' },
    { name: 'Քանաքեռ-Զ.', price: 1400, trend: '+2.1%' },
    { name: 'Դավթաշեն', price: 1650, trend: '+4.5%' },
    { name: 'Աջափնյակ', price: 1300, trend: '+1.5%' },
  ];

  const developerData = [
    { name: 'ML Mining', quality: 98, delivery: 99, value: 95, status: 'Gen Sponsor' },
    { name: 'AAB Construction', quality: 95, delivery: 98, value: 92, status: 'Elite' },
    { name: 'Defanse Housing', quality: 94, delivery: 90, value: 88, status: 'Major' },
    { name: 'Horizon-95', quality: 92, delivery: 95, value: 90, status: 'Legacy' },
    { name: 'Art Company', quality: 90, delivery: 92, value: 85, status: 'Active' },
    { name: 'Technotun', quality: 93, delivery: 88, value: 91, status: 'Premium' },
  ];

  const bankData = [
    { name: 'Ameriabank', rate: '11.5%', portfolio: 'Largest', focus: 'Digital' },
    { name: 'Evocabank', rate: '11.9%', portfolio: 'High', focus: 'UX/Speed' },
    { name: 'Ardshinbank', rate: '12.0%', portfolio: 'Massive', focus: 'Secondary' },
    { name: 'ACBA Bank', rate: '12.2%', portfolio: 'Stable', focus: 'Eco/Agri' },
    { name: 'Amio Bank', rate: '11.7%', portfolio: 'Growing', focus: 'Expo' },
  ];

  const mortgageTrends = [
    { month: 'Հուն', rate: 12.5 },
    { month: 'Փետ', rate: 12.3 },
    { month: 'Մար', rate: 12.1 },
    { month: 'Ապր', rate: 11.9 },
    { month: 'Մայ', rate: 11.7 },
    { month: 'Հուն', rate: 11.5 },
  ];

  const marketProperties: Property[] = [
    {
      id: 'm1',
      name: 'Արարատյան Տեռասներ',
      price: 450000,
      priceDisplay: '$450,000',
      location: 'Կենտրոն, Երևան',
      rooms: 3,
      propertyType: 'Apartment',
      squareFootage: 120,
      yearBuilt: 2024,
      features: ['Տեսարան դեպի Արարատ', 'Բաց պատշգամբ', 'Ստորգետնյա կայանատեղի'],
      images: ['modern-living-room'],
      matchScore: 95,
      roi: '8.2%',
      isPopular: true,
      availability: 'Available',
      sourceUrl: '#',
      lat: 40.1772,
      lng: 44.5035,
      description: 'Շքեղ բնակարան քաղաքի սրտում:',
      amenities: ['Ֆիթնես', 'Կոնսյերժ', 'Անվտանգություն'],
      floorPlans: []
    },
    {
      id: 'm2',
      name: 'Հյուսիսային Պողոտա Էլիտ',
      price: 850000,
      priceDisplay: '$850,000',
      location: 'Կենտրոն, Երևան',
      rooms: 4,
      propertyType: 'Apartment',
      squareFootage: 180,
      yearBuilt: 2023,
      features: ['Պրեմիում դիրք', 'Խելացի տուն', 'Բարձր առաստաղներ'],
      images: ['luxury-bedroom'],
      matchScore: 90,
      roi: '7.5%',
      isPopular: true,
      availability: 'Limited',
      sourceUrl: '#',
      lat: 40.1811,
      lng: 44.5144,
      description: 'Էլիտար բնակարան Հյուսիսային պողոտայում:',
      amenities: ['Սպա', 'Լողավազան', '24/7 սպասարկում'],
      floorPlans: []
    },
    {
      id: 'm3',
      name: 'Արաբկիր Գարդենս',
      price: 320000,
      priceDisplay: '$320,000',
      location: 'Արաբկիր, Երևան',
      rooms: 3,
      propertyType: 'Apartment',
      squareFootage: 95,
      yearBuilt: 2025,
      features: ['Էկոլոգիապես մաքուր', 'Մանկական խաղահրապարակ', 'Այգի'],
      images: ['modern-kitchen'],
      matchScore: 88,
      roi: '9.1%',
      isPopular: false,
      availability: 'Available',
      sourceUrl: '#',
      lat: 40.2011,
      lng: 44.5044,
      description: 'Հարմարավետ բնակարան Արաբկիրում:',
      amenities: ['Այգի', 'Ավտոկայանատեղի', 'Խաղահրապարակ'],
      floorPlans: []
    }
  ];

  const toggleCompare = (id: string) => {
    setSelectedCompareIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedProperties = marketProperties.filter(p => selectedCompareIds.includes(p.id));

  return (
    <div className="space-y-8 md:space-y-12 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Price Trends */}
        <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-none space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl md:text-2xl font-serif italic font-light uppercase tracking-tight">Գների Դինամիկա</h3>
              <p className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1">Միջին գինը ըստ թաղամասերի ($/մ²)</p>
            </div>
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div className="h-40 sm:h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={7} md:fontSize={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={7} md:fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '0px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                />
                <Bar dataKey="price" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                  {priceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mortgage Trends */}
        <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-none space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl md:text-2xl font-serif italic font-light uppercase tracking-tight">Հիփոթեքային Դրույքներ</h3>
              <p className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1">Տարեկան տոկոսադրույքի միտումները (%)</p>
            </div>
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div className="h-40 sm:h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mortgageTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" stroke="#666" fontSize={7} md:fontSize={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={7} md:fontSize={8} tickLine={false} axisLine={false} domain={[11, 13]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '0px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                />
                <Line type="monotone" dataKey="rate" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Developer Comparison */}
      <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-none space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-serif italic font-light uppercase tracking-tight">Կառուցապատողների Վերլուծություն</h3>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Toon Expo 2026 • GNEL AI Որակի Ինդեքս</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent" />
              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Որակ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/20" />
              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Ժամկետ</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8">
          {developerData.map((dev) => (
            <div key={dev.name} className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm font-black uppercase tracking-widest">{dev.name}</span>
                  <span className="text-[8px] px-2 py-0.5 bg-white/5 text-white/40 border border-white/10 rounded-full uppercase tracking-widest">{dev.status}</span>
                </div>
                <span className="text-[10px] md:text-xs font-serif italic text-accent">{dev.quality}% Score</span>
              </div>
              <div className="h-1 w-full bg-white/5 flex gap-1">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${dev.quality}%` }}
                  className="h-full bg-accent"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${dev.delivery}%` }}
                  className="h-full bg-white/10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Property Comparison Section */}
      <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-none space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-serif italic font-light uppercase tracking-tight">Գույքի Համեմատություն</h3>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Ընտրեք 2 կամ ավելի գույք կողք կողքի համեմատելու համար</p>
          </div>
          {selectedCompareIds.length >= 2 && (
            <button 
              onClick={() => setShowComparison(true)}
              className="bg-accent text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" /> Համեմատել ({selectedCompareIds.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketProperties.map(prop => (
            <div key={prop.id} className={`bg-white/5 border transition-all p-4 space-y-4 ${selectedCompareIds.includes(prop.id) ? 'border-accent' : 'border-white/5'}`}>
              <div className="aspect-video overflow-hidden relative">
                <img 
                  src={`https://picsum.photos/seed/${prop.images[0]}/800/600`} 
                  className="w-full h-full object-cover" 
                  alt={prop.name}
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => toggleCompare(prop.id)}
                  className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center border transition-all ${selectedCompareIds.includes(prop.id) ? 'bg-accent border-accent text-black' : 'bg-black/60 border-white/20 text-white hover:border-accent'}`}
                >
                  {selectedCompareIds.includes(prop.id) ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-accent font-black uppercase tracking-widest">{prop.location}</p>
                <h4 className="text-sm font-serif italic">{prop.name}</h4>
                <p className="text-xs font-black tracking-widest">{prop.priceDisplay}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {showComparison && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
          >
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-7xl max-h-[90vh] overflow-y-auto relative p-8 md:p-12">
              <button 
                onClick={() => setShowComparison(false)}
                className="absolute top-8 right-8 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center border border-white/10 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="space-y-12">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl md:text-5xl font-serif italic font-light uppercase tracking-tight">Գույքերի Համեմատություն</h2>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Մանրամասն վերլուծություն և ROI համեմատություն</p>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <div className="min-w-[800px] grid grid-cols-[200px_repeat(auto-fit,minmax(250px,1fr))] gap-px bg-white/10 border border-white/10">
                    {/* Headers */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Ցուցանիշ</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6 space-y-4">
                        <div className="aspect-video overflow-hidden">
                          <img src={`https://picsum.photos/seed/${prop.images[0]}/400/300`} className="w-full h-full object-cover" alt={prop.name} referrerPolicy="no-referrer" />
                        </div>
                        <h4 className="text-sm font-serif italic text-accent">{prop.name}</h4>
                      </div>
                    ))}

                    {/* Price */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Գին</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6">
                        <span className="text-lg font-black tracking-widest">{prop.priceDisplay}</span>
                      </div>
                    ))}

                    {/* ROI */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">ROI (Եկամտաբերություն)</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6">
                        <span className="text-lg font-serif italic text-accent">{prop.roi}</span>
                      </div>
                    ))}

                    {/* SqFt */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Մակերես</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6">
                        <span className="text-sm font-black tracking-widest">{prop.squareFootage} մ²</span>
                      </div>
                    ))}

                    {/* Amenities */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Հարմարություններ</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6 space-y-2">
                        {prop.amenities?.slice(0, 5).map(a => (
                          <div key={a} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-accent" />
                            <span className="text-[10px] text-white/60 uppercase tracking-widest">{a}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Location Advantages */}
                    <div className="bg-[#0a0a0a] p-6 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Տեղակայման Առավելություններ</span>
                    </div>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="bg-[#0a0a0a] p-6 space-y-2">
                        {prop.features.slice(0, 3).map(f => (
                          <div key={f} className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-accent" />
                            <span className="text-[10px] text-white/60 uppercase tracking-widest italic">{f}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Intelligence */}
      <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-none space-y-8">
        <div>
          <h3 className="text-2xl md:text-3xl font-serif italic font-light uppercase tracking-tight">Բանկային Ինտելեկտ</h3>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Լավագույն իպոթեքային գործընկերներ (2026)</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {bankData.map((bank) => (
            <div key={bank.name} className="bg-white/5 border border-white/5 p-6 space-y-4 hover:border-accent/30 transition-all group">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-widest group-hover:text-accent transition-colors">{bank.name}</span>
                <span className="text-[10px] font-mono text-accent">{bank.rate}</span>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">Պորտֆել</p>
                <p className="text-xs font-serif italic">{bank.portfolio}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">Ֆոկուս</p>
                <p className="text-xs font-serif italic text-white/60">{bank.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DealDetails = ({ 
  lead, 
  onBack, 
  onFeedbackSubmit, 
  feedbackDraft, 
  onFeedbackDraftChange,
  onGenerateNurturing,
  isGeneratingNurturing
}: { 
  lead: AppLead; 
  onBack: () => void;
  onFeedbackSubmit: (leadId: string, rating: number, comment?: string) => void;
  feedbackDraft?: { rating: number, comment: string };
  onFeedbackDraftChange: (draft: { rating: number, comment: string }) => void;
  onGenerateNurturing: (leadId: string) => void;
  isGeneratingNurturing: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> ՎԵՐԱԴԱՌՆԱԼ ՀԱՅՏԵՐԻՆ
        </button>
        <div className={`px-4 py-1.5 rounded-none text-[8px] font-black tracking-[0.3em] uppercase ${
          lead.status === 'HOT' ? 'bg-red-500 text-white' : 
          lead.status === 'WARM' ? 'bg-accent text-black' : 
          'bg-white/10 text-white/40'
        }`}>
          {lead.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141414] border border-white/5 p-8 rounded-none">
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                lead.status === 'HOT' ? 'bg-red-500/20 text-red-500' : 
                lead.status === 'WARM' ? 'bg-yellow-500/20 text-yellow-500' : 
                'bg-blue-500/20 text-blue-500'
              }`}>
                {lead.type === 'Инвестиции' || lead.type === 'Ներդրումներ' ? <Briefcase className="w-6 h-6" /> : <Home className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-2xl font-serif italic uppercase">{lead.type === 'Инвестиции' || lead.type === 'Ներդրումներ' ? 'Ներդրումային' : 'Բնակելի'} Հայտ</h2>
                <p className="text-sm text-white/40 flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4" /> {lead.location} • Ստեղծվել է {lead.timestamp.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 p-6 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase mb-2 font-black tracking-widest">Ընտանիքի Կազմ</p>
                <p className="text-lg font-serif italic">{lead.familySize}</p>
              </div>
              <div className="bg-white/5 p-6 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase mb-2 font-black tracking-widest">Բյուջե</p>
                <p className="text-lg font-serif italic">{lead.budget}</p>
              </div>
              <div className="bg-white/5 p-6 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase mb-2 font-black tracking-widest">Պրեզենտացիայի Թեմա</p>
                <p className="text-lg font-serif italic text-accent">{lead.presentationTheme}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">AI Ամփոփում</h3>
                <p className="text-base text-white/80 leading-relaxed font-serif italic bg-white/5 p-6 border border-white/5">
                  {lead.summary}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">Փոխազդեցությունների Պատմություն</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {lead.chatHistory && lead.chatHistory.length > 0 ? (
                    lead.chatHistory.map((msg, idx) => (
                      <div key={idx} className={`bg-white/5 p-4 border border-white/5 flex gap-4 ${msg.type === 'system' ? 'opacity-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          msg.type === 'user' ? 'bg-accent/20 text-accent' : 
                          msg.type === 'bot' ? 'bg-blue-500/20 text-blue-500' : 
                          'bg-white/10 text-white/40'
                        }`}>
                          {msg.type === 'user' ? <User className="w-4 h-4" /> : 
                           msg.type === 'bot' ? <Bot className="w-4 h-4" /> : 
                           <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                              {msg.type === 'user' ? 'Customer' : msg.type === 'bot' ? 'GNEL AI' : 'System'}
                            </p>
                            <p className="text-[10px] text-white/20">{msg.timestamp.toLocaleTimeString()}</p>
                          </div>
                          <p className="text-sm text-white/80 font-serif italic">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/5 p-4 border border-white/5 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">{lead.timestamp.toLocaleString()}</p>
                        <p className="text-sm">Հայտը ստեղծվել է AI ասիստենտի կողմից զրույցի հիման վրա:</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {lead.presentation?.properties && lead.presentation.properties.length > 0 && (
            <div className="bg-[#141414] border border-white/5 p-8 rounded-none">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-6 border-b border-white/10 pb-2">Համապատասխան Գույք</h3>
              <div className="space-y-4">
                <div className="aspect-video overflow-hidden border border-white/10">
                  <img 
                    src={`https://picsum.photos/seed/${lead.presentation.properties[0].images[0]}/800/600`} 
                    className="w-full h-full object-cover" 
                    alt={lead.presentation.properties[0].name}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-serif italic text-accent">{lead.presentation.properties[0].name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 uppercase font-black tracking-widest">
                    <MapPin className="w-3 h-3 text-accent" /> {lead.presentation.properties[0].location}
                  </div>
                  <div className="flex items-center gap-2 text-lg font-black tracking-widest">
                    <DollarSign className="w-4 h-4 text-accent" /> {lead.presentation.properties[0].priceDisplay}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#141414] border border-white/5 p-8 rounded-none">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-6 border-b border-white/10 pb-2">Manager Feedback</h3>
            
            {lead.feedback ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-5 h-5 ${star <= lead.feedback!.rating ? 'text-accent fill-accent' : 'text-white/10'}`} 
                    />
                  ))}
                  <span className="text-[10px] text-white/40 uppercase font-black ml-2 tracking-widest">Accuracy Rated</span>
                </div>
                {lead.feedback.comment && (
                  <div className="bg-white/5 p-4 border border-accent/20">
                    <p className="text-xs text-white/60 font-serif italic leading-relaxed">
                      "{lead.feedback.comment}"
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">
                  Submitted: {lead.feedback.timestamp.toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => onFeedbackDraftChange({ rating: star, comment: feedbackDraft?.comment || '' })}
                      className="transition-all"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          (feedbackDraft?.rating || 0) >= star 
                            ? 'text-accent fill-accent' 
                            : 'text-white/20 hover:text-accent'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-[10px] text-white/40 uppercase font-black ml-2 tracking-widest">Rate AI Accuracy</span>
                </div>
                
                {feedbackDraft && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 overflow-hidden"
                  >
                    <textarea 
                      value={feedbackDraft.comment}
                      onChange={(e) => onFeedbackDraftChange({ ...feedbackDraft, comment: e.target.value })}
                      placeholder="Add a comment on AI accuracy..."
                      className="w-full bg-white/5 border border-white/10 p-4 text-xs text-white/80 focus:outline-none focus:border-accent/30 font-serif italic min-h-[100px] resize-none"
                    />
                    <button 
                      onClick={() => onFeedbackSubmit(lead.id, feedbackDraft.rating, feedbackDraft.comment)}
                      className="w-full bg-accent text-black py-4 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                    >
                      Submit Feedback
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-white/5 p-8 rounded-none">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-6 border-b border-white/10 pb-2">Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => lead.presentation && window.open(lead.presentation.url, '_blank')}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 text-[10px] font-black bg-white/5 text-white hover:bg-white/10 transition-all uppercase tracking-widest border border-white/10"
              >
                <Presentation className="w-4 h-4" /> Open Presentation
              </button>
              <button className="w-full flex items-center justify-center gap-3 py-4 px-6 text-[10px] font-black bg-white/5 text-white hover:bg-white/10 transition-all uppercase tracking-widest border border-white/10">
                <ExternalLink className="w-4 h-4" /> Export to PDF
              </button>
              <button className="w-full flex items-center justify-center gap-3 py-4 px-6 text-[10px] font-black bg-accent text-black hover:bg-white transition-all uppercase tracking-widest">
                <Send className="w-4 h-4" /> Contact Client
              </button>

              {lead.status === 'COLD' && !lead.nurturingSequence && (
                <button 
                  onClick={() => onGenerateNurturing(lead.id)}
                  disabled={isGeneratingNurturing}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 text-[10px] font-black bg-white/5 text-accent hover:bg-accent hover:text-black transition-all uppercase tracking-widest border border-accent/20 disabled:opacity-50"
                >
                  {isGeneratingNurturing ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Generate Nurturing Sequence
                </button>
              )}

              {lead.nurturingSequence && (
                <div className="p-4 bg-accent/5 border border-accent/20 space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-accent">Nurturing Active</p>
                  <p className="text-[10px] text-white/60 font-serif italic">Automated 5-day sequence is currently warming up this lead.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ExpertArchitecture = () => {
  const agents = [
    { 
      title: "Extraction Agent", 
      tech: "Playwright / Selenium", 
      desc: "Headless Browser Pipeline with proxy rotation and human behavior simulation to bypass anti-bot measures on List.am.",
      icon: <Search className="w-5 h-5" />
    },
    { 
      title: "Parsing Agent", 
      tech: "LLM / ScrapeGraphAI", 
      desc: "Dynamic structure understanding. Extracts listing_id, price_amd, district, and developer_name into structured JSON.",
      icon: <Zap className="w-5 h-5" />
    },
    { 
      title: "Analysis Agent", 
      tech: "RAG / Normalization", 
      desc: "Price normalization via CBA rates. District-tier analysis (Kentron vs Ajapnyak) to flag underpriced deals.",
      icon: <TrendingUp className="w-5 h-5" />
    },
    { 
      title: "Compliance Agent", 
      tech: "Legal Guardrails", 
      desc: "Ensures adherence to 2026 Real Estate Broker Licensing laws and transaction transparency mandates.",
      icon: <ShieldCheck className="w-5 h-5" />
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      <div className="bg-accent/5 border border-accent/20 p-8 rounded-none">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="text-3xl font-serif italic font-light uppercase tracking-tight">Multi-Agent Orchestration</h3>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">GNEL Expert Architecture v2.0 (2026)</p>
          </div>
        </div>
        <p className="text-sm text-white/60 font-serif italic leading-relaxed max-w-3xl">
          Մեր համակարգը հիմնված է մասնագիտացված AI գործակալների վրա, որոնք աշխատում են զուգահեռ՝ ապահովելով տվյալների առավելագույն ճշգրտություն և արդիականություն:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <div key={agent.title} className="bg-[#141414] border border-white/5 p-6 md:p-8 space-y-4 hover:border-accent/30 transition-all">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10">
                {agent.icon}
              </div>
              <span className="text-[8px] px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full uppercase font-black tracking-widest">
                {agent.tech}
              </span>
            </div>
            <h4 className="text-xl font-serif italic">{agent.title}</h4>
            <p className="text-xs text-white/50 leading-relaxed font-serif">{agent.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-white/5 p-8 rounded-none">
        <h4 className="text-xl font-serif italic mb-6 uppercase tracking-tight">Target Networks & Mechanics</h4>
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/40">Network</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/40">Parsing Mechanic</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/40">Expert Tip</th>
              </tr>
            </thead>
            <tbody className="text-xs font-serif italic">
              <tr className="border-b border-white/5">
                <td className="py-4 text-white">List.am</td>
                <td className="py-4 text-white/60">Proxy Rotation + Captcha Solving</td>
                <td className="py-4 text-accent">Use residential proxies. Filter by Real Estate category ID.</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 text-white">Bnakaran.am</td>
                <td className="py-4 text-white/60">API Hooking</td>
                <td className="py-4 text-accent">Inspect network traffic for hidden JSON API in map view.</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 text-white">Karucapatoxic.am</td>
                <td className="py-4 text-white/60">Project Aggregation</td>
                <td className="py-4 text-accent">Map "New Builds" and Bank Partners directly.</td>
              </tr>
              <tr>
                <td className="py-4 text-white">Building Co's</td>
                <td className="py-4 text-white/60">OCR for Brochures</td>
                <td className="py-4 text-accent">Use GPT-4o to read PDF floor plans and brochures.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RevOSDashboard = ({ analytics, insights }: { analytics: RevenueAnalytics | null, insights: string }) => {
  if (!analytics) return (
    <div className="h-96 flex items-center justify-center">
      <RotateCcw className="w-8 h-8 text-accent animate-spin" />
    </div>
  );

  const data = [
    { name: 'Lead -> Meeting', value: analytics.leadToMeetingConversion },
    { name: 'Meeting -> Deal', value: analytics.meetingToDealConversion },
  ];

  return (
    <div className="space-y-8">
      {/* Revenue Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] border border-white/5 p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Revenue (RevOS)</p>
          <h3 className="text-4xl font-serif italic text-white">${analytics.totalRevenue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" /> +12.4% vs Last Month
          </div>
        </div>

        <div className="bg-[#141414] border border-accent/20 p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-16 h-16 text-accent" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">AI Influenced Revenue</p>
          <h3 className="text-4xl font-serif italic text-white">${analytics.aiInfluencedRevenue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest">
            {analytics.aiInfluencePercentage}% of Total Revenue
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Avg Response Time</p>
          <h3 className="text-4xl font-serif italic text-white">{analytics.timeToFirstResponseMins}m</h3>
          <div className="mt-4 flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 className="w-3 h-3" /> Optimal Performance
          </div>
        </div>
      </div>

      {/* AI Insights & Conversion Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#141414] border border-white/5 p-8">
          <div className="flex items-center gap-3 mb-8">
            <Bot className="w-5 h-5 text-accent" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">AI Revenue Insights</h4>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-white/70 leading-relaxed font-serif italic whitespace-pre-wrap">
              {insights || "Գեներացվում են եկամտի վերլուծությունները..."}
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Lead Score Accuracy</p>
                <p className="text-lg font-serif italic text-white">94.2%</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Nurturing ROI</p>
                <p className="text-lg font-serif italic text-white">12.8x</p>
              </div>
            </div>
            <button className="px-6 py-2 bg-accent text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
              Export Report
            </button>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-8">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Conversion Funnel</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#ffffff40', fontWeight: '900', letterSpacing: '0.1em' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0px' }}
                  itemStyle={{ color: '#00FF00', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Bar dataKey="value" fill="#00FF00" radius={[0, 0, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#00FF00' : '#00AA00'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00FF00]" /> Lead &rarr; Meeting
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00AA00]" /> Meeting &rarr; Deal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NurturingView = ({ lead, onUpdateLead, onBack }: { lead: AppLead, onUpdateLead: (lead: AppLead) => void, onBack: () => void }) => {
  if (!lead.nurturingSequence) return null;

  const [generatingVariants, setGeneratingVariants] = useState<number | null>(null);

  const handleGenerateVariants = async (index: number) => {
    setGeneratingVariants(index);
    try {
      const variants = await generateABVariants(lead.nurturingSequence!.messages[index], lead);
      const updatedMessages = [...lead.nurturingSequence!.messages];
      updatedMessages[index] = { ...updatedMessages[index], variants };
      
      const updatedLead = {
        ...lead,
        nurturingSequence: {
          ...lead.nurturingSequence!,
          messages: updatedMessages
        }
      };
      onUpdateLead(updatedLead);
    } catch (error) {
      console.error("Failed to generate A/B variants:", error);
    } finally {
      setGeneratingVariants(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-2xl font-serif italic uppercase text-white tracking-tight">Nurturing Sequence</h3>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Personalized for {lead.location} Lead</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest">
          <Clock className="w-4 h-4" /> 7-Day Sequence
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {lead.nurturingSequence.messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-[#141414] border border-white/5 p-8 rounded-none relative group"
          >
            <div className="absolute top-0 right-0 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1">
                Day {msg.day}
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-white/5 flex items-center justify-center">
                {msg.type === 'email' ? <Send className="w-5 h-5 text-blue-400" /> : <MessageSquare className="w-5 h-5 text-green-400" />}
              </div>
              <div>
                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest">Channel: {msg.type}</p>
                <h4 className="text-lg font-serif italic text-white">{msg.subject}</h4>
              </div>
            </div>

            <div className="bg-white/5 p-6 border border-white/5">
              <p className="text-sm text-white/70 leading-relaxed font-serif italic whitespace-pre-wrap">{msg.body}</p>
            </div>

            {/* A/B Variants Section */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-accent" />
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">A/B Testing Variants</h5>
                </div>
                {!msg.variants && (
                  <button 
                    onClick={() => handleGenerateVariants(i)}
                    disabled={generatingVariants === i}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors disabled:opacity-50"
                  >
                    {generatingVariants === i ? (
                      <>Generating... <RotateCcw className="w-3 h-3 animate-spin" /></>
                    ) : (
                      <>Generate A/B Variants <Plus className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>

              {msg.variants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {msg.variants.map((variant, vIdx) => (
                    <div key={vIdx} className="bg-white/[0.02] border border-white/5 p-4 relative">
                      <div className="absolute -top-2 -left-2 bg-accent text-black text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                        Variant {vIdx === 0 ? 'A' : 'B'}
                      </div>
                      <h6 className="text-xs font-serif italic text-white/90 mb-2">{variant.subject}</h6>
                      <p className="text-[11px] text-white/50 leading-relaxed font-serif italic line-clamp-3">{variant.body}</p>
                      <button className="mt-3 text-[8px] font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-colors">
                        Use this variant
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => handleGenerateVariants(i)}
                    disabled={generatingVariants === i}
                    className="border border-dashed border-white/10 flex items-center justify-center p-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="text-center">
                      <RotateCcw className={`w-4 h-4 text-white/20 group-hover:text-accent mx-auto mb-2 ${generatingVariants === i ? 'animate-spin' : ''}`} />
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">Regenerate</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Edit Content <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const HotLeadsView = ({ leads, onSelectLead, onContact }: { leads: AppLead[], onSelectLead: (lead: AppLead) => void, onContact: (lead: AppLead) => void }) => {
  const hotLeads = leads.filter(l => l.status === 'HOT').sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getRelativeTime = (date: Date) => {
    const diff = new Date().getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Հենց հիմա";
    if (mins < 60) return `${mins} րոպե առաջ`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ժամ առաջ`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-3">
          <Zap className="w-5 h-5 fill-red-500" /> Թեժ Հայտեր (HOT LEADS)
        </h3>
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest bg-white/5 px-4 py-1.5 border border-white/5">
          Անհապաղ ուշադրության կարիք ունեցողներ
        </p>
      </div>

      {hotLeads.length === 0 ? (
        <div className="h-64 border border-dashed border-red-500/20 rounded-none flex flex-col items-center justify-center text-white/20 bg-red-500/5">
          <AlertCircle className="w-12 h-12 mb-4 text-red-500/40" />
          <p className="font-serif italic text-lg">Այս պահին թեժ հայտեր չկան:</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {hotLeads.map((lead) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={lead.id} 
              className="bg-[#1a1a1a] border-l-4 border-l-red-600 border border-white/5 p-8 rounded-none hover:border-red-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl -z-10 group-hover:bg-red-600/10 transition-all" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-red-600/20 text-red-500 flex items-center justify-center border border-red-600/30 relative">
                    <User className="w-8 h-8" />
                    <div className="absolute -top-2 -right-2 bg-red-600 text-[8px] font-black px-2 py-1 uppercase tracking-widest animate-pulse">
                      Թեժ
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-2xl font-serif italic text-white group-hover:text-red-500 transition-colors uppercase">
                        {lead.name || "Անհայտ Հայտատու"}
                      </h4>
                      <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest">
                        Բարձր Առաջնահերթություն
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[10px] text-white/40 flex items-center gap-1.5 uppercase font-black tracking-widest">
                        <MapPin className="w-3.5 h-3.5" /> {lead.location}
                      </p>
                      <p className="text-[10px] text-red-500/60 flex items-center gap-1.5 uppercase font-black tracking-widest">
                        <Clock className="w-3.5 h-3.5" /> {getRelativeTime(lead.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Բյուջե</p>
                  <p className="text-2xl font-serif italic text-accent">{lead.budget}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white/5 p-6 border border-white/5">
                  <p className="text-[9px] text-white/30 uppercase mb-3 font-black tracking-widest">AI Վերլուծություն</p>
                  <p className="text-sm text-white/70 leading-relaxed font-serif italic">{lead.summary}</p>
                  
                  {lead.chatHistory && lead.chatHistory.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-[9px] text-white/30 uppercase mb-3 font-black tracking-widest">Վերջին Հաղորդագրությունը</p>
                      <div className="bg-black/20 p-4 border-l-2 border-accent/30 italic font-serif text-sm text-white/50">
                        "{lead.chatHistory[lead.chatHistory.length - 1].text.length > 150 
                          ? lead.chatHistory[lead.chatHistory.length - 1].text.substring(0, 150) + "..." 
                          : lead.chatHistory[lead.chatHistory.length - 1].text}"
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white/5 p-6 border border-white/5 flex flex-col justify-center">
                  <p className="text-[9px] text-white/30 uppercase mb-3 font-black tracking-widest">Տեսակ</p>
                  <p className="text-lg font-serif italic text-white">{lead.type}</p>
                  <div className="mt-4 h-1 w-full bg-white/10">
                    <div className="h-full bg-red-600 w-full animate-pulse" />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                      <span>Հետաքրքրվածություն</span>
                      <span className="text-red-500">100%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5">
                      <div className="h-full bg-red-600 w-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => onSelectLead(lead)}
                  className="flex-1 bg-red-600 text-white py-4 px-8 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
                >
                  ԴԻՏԵԼ ՄԱՆՐԱՄԱՍՆԵՐԸ <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onContact(lead)}
                  className="bg-white/5 text-white/60 py-4 px-8 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all border border-white/10"
                >
                  ԱՆՀԱՊԱՂ ԿԱՊ
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FoundationUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'landing' | 'chat' | 'dashboard' | 'admin'>('landing');
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  const [presentationView, setPresentationView] = useState<'list' | 'map'>('list');
  const [activePropId, setActivePropId] = useState<string | null>(null);
  const [activePresentation, setActivePresentation] = useState<Message['presentation'] | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [accentColor, setAccentColor] = useState('#C5A059');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u && view === 'landing') {
        setView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  // Presentation Filters
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [roomsFilter, setRoomsFilter] = useState<number | null>(null);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string | null>(null);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string | null>(null);
  const [minSqFt, setMinSqFt] = useState<number>(0);
  const [maxSqFt, setMaxSqFt] = useState<number>(5000);
  const [minYear, setMinYear] = useState<number>(1900);
  const [maxYear, setMaxYear] = useState<number>(new Date().getFullYear() + 5);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'rooms'>('price-desc');
  const [activeImageIndices, setActiveImageIndices] = useState<Record<string, number>>({});

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [leads, setLeads] = useState<AppLead[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'leads' | 'hot' | 'market' | 'architecture' | 'deal' | 'nurturing' | 'revos' | 'messaging'>('revos');
  const [messageQueue, setMessageQueue] = useState<any[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await fetch('/api/v1/messages/queue');
        const data = await response.json();
        setMessageQueue(data);
      } catch (error) {
        console.error("Failed to fetch message queue:", error);
      }
    };
    if (dashboardTab === 'messaging') {
      fetchQueue();
    }
  }, [dashboardTab]);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [aiInsights, setAiInsights] = useState<string>("");

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await fetch('/api/v1/analytics/revenue');
        const data = await response.json();
        setRevenueAnalytics(data);
        
        const insights = await generateRevenueInsights(data);
        setAiInsights(insights);
      } catch (error) {
        console.error("Failed to fetch revenue analytics:", error);
      }
    };

    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/v1/leads');
        const data = await response.json();
        const formattedLeads = data.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp)
        }));
        setLeads(formattedLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      }
    };

    fetchRevenue();
    fetchLeads();
  }, []);
  const [selectedLead, setSelectedLead] = useState<AppLead | null>(null);
  const [isGeneratingNurturing, setIsGeneratingNurturing] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, { rating: number, comment: string }>>({});
  const [activeNotification, setActiveNotification] = useState<AppLead | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const triggerNotification = (lead: AppLead) => {
    if (lead.status === 'HOT') {
      setActiveNotification(lead);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      }
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setActiveNotification(prev => prev?.id === lead.id ? null : prev);
      }, 10000);
    }
  };

  const handleGenerateNurturing = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.nurturingSequence) return;

    setIsGeneratingNurturing(true);
    try {
      const sequence = await generateNurturingSequence(lead);
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, nurturingSequence: sequence } : l
      ));
    } catch (error) {
      console.error("Failed to generate nurturing sequence:", error);
    } finally {
      setIsGeneratingNurturing(false);
    }
  };

  const handleSubmitFeedback = (leadId: string, rating: number, comment?: string) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { 
        ...l, 
        feedback: { 
          rating, 
          comment, 
          timestamp: new Date() 
        } 
      } : l
    ));
  };
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (activePropId && presentationView === 'list' && propertyRefs.current[activePropId]) {
      propertyRefs.current[activePropId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activePropId, presentationView]);

  useEffect(() => {
    if (view === 'chat' && messages.length === 0) {
      startFunnel();
    }
  }, [view]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    addMessage({ type: 'user', text: userMsg });

    if (currentStep > 0 && currentStep < 6) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      processStep(nextStep, userMsg);
      return;
    }

    setIsTyping(true);

    try {
      // Convert messages to history format
      const history = messages
        .filter(m => m.type !== 'system')
        .map(m => ({
          role: m.type === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.text }]
        }));

      const response = await chatWithAI(userMsg, history);
      setIsTyping(false);
      addMessage({ text: response });
    } catch (error) {
      console.error("Chat failed:", error);
      setIsTyping(false);
      addMessage({ text: "Ներողություն, կապի խնդիր առաջացավ: Փորձեք նորից:", type: 'system' });
    }
  };

  const addMessage = (msg: Partial<Message>) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'bot',
      text: '',
      timestamp: new Date(),
      ...msg
    }]);
  };

  const simulateTyping = async (text: string, delay = 1000) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    setIsTyping(false);
    return text;
  };

  const startFunnel = async () => {
    addMessage({ 
      text: "Welcome to GNEL Elite. 🏛️\nLet's find your next masterpiece in 60 seconds." 
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addMessage({
      text: "Ready to explore?",
      options: ["Start Analysis"]
    });
  };

  const handleOptionClick = async (option: string) => {
    // Add user message
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      text: option,
      timestamp: new Date()
    }]);

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    processStep(nextStep, option);
  };

  const processStep = async (step: number, lastValue: string) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsTyping(false);

    switch (step) {
      case 1: // Name
        addMessage({
          text: "Ինչպե՞ս կարող եմ դիմել Ձեզ (Ձեր անունը)?",
        });
        break;
      case 2: // Type Detection
        setLeadData(prev => ({ ...prev, name: lastValue }));
        addMessage({
          text: "Դուք փնտրում եք անշարժ գույք բնակության, թե՞ ներդրման համար?",
          options: ["Բնակության համար", "Ներդրումներ"]
        });
        break;
      case 3: // Location
        setLeadData(prev => ({ ...prev, type: lastValue }));
        addMessage({
          text: "Ո՞ր թաղամասը կամ քաղաքն է ձեզ հետաքրքրում?",
          options: ["Կենտրոն", "Արվարձան", "Առողջարանային գոտի", "Այլ"]
        });
        break;
      case 4: // Family Size / Details
        setLeadData(prev => ({ ...prev, location: lastValue }));
        addMessage({
          text: "Քանի՞ հոգի է բնակվելու?",
          options: ["1-2 հոգի", "Ընտանիք երեխաների հետ", "Մեծ ընտանիք"]
        });
        break;
      case 5: // Budget
        setLeadData(prev => ({ ...prev, familySize: lastValue }));
        addMessage({
          text: "Ձեր նախատեսված բյուջեն?",
          options: ["մինչև $100հզ", "$100հզ–300հզ", "$300հզ–1մլն", "$1մլն+"]
        });
        break;
      case 6: // Final Analysis & Presentation Generation
        const finalLeadData = { ...leadData, budget: lastValue };
        setLeadData(finalLeadData);
        addMessage({ text: "Վերլուծում եմ ձեր նախասիրությունները և ստեղծում անհատական պրեզենտացիա... 🧠📄" });
        
        setIsTyping(true);
        const analysis = await analyzeLead(finalLeadData);
        setIsTyping(false);
        
        const newLead: AppLead = {
          ...finalLeadData,
          id: Math.random().toString(36).substr(2, 9),
          status: analysis.score,
          timestamp: new Date(),
          summary: analysis.reasoning,
          presentationTheme: analysis.presentationTheme,
          chatHistory: [...messages],
          presentation: {
            title: `Անհատական առաջարկ: ${analysis.presentationTheme}`,
            theme: analysis.presentationTheme || "Modern Luxury",
            url: "#",
            properties: analysis.properties
          }
        };
        
        // Sync with RevOS Backend
        try {
          await fetch('/api/v1/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLead)
          });
          
          // Refresh analytics after new lead
          const revResponse = await fetch('/api/v1/analytics/revenue');
          const revData = await revResponse.json();
          setRevenueAnalytics(revData);
        } catch (error) {
          console.error("Failed to sync lead with backend:", error);
        }
        
        setLeads(prev => [newLead, ...prev]);
        triggerNotification(newLead);

        await simulateTyping("");
        
        addMessage({
          text: `Պատրաստ է: Ես ընտրել եմ օբյեկտներ, որոնք կատարյալ համապատասխանում են ձեզ:\n\n${analysis.reasoning}`,
          presentation: {
            title: `Անհատական առաջարկ: ${analysis.presentationTheme}`,
            theme: analysis.presentationTheme || "Modern Luxury",
            url: "#",
            properties: analysis.properties
          }
        });

        if (analysis.score === 'HOT') {
          addMessage({
            text: "🔥 Ձեր հայտը առաջնահերթ է: Մենեջերը կկապվի ձեզ հետ 5 րոպեի ընթացքում ցուցադրություն կազմակերպելու համար:",
            type: 'system'
          });
        }
        break;
    }
  };

  const handlePublicSearch = async () => {
    setView('chat');
    setIsTyping(true);
    addMessage({ text: "Որոնում եմ Հայաստանի բոլոր հանրային հայտարարությունները... 🔍🇦🇲", type: 'system' });
    
    const analysis = await analyzeLead({ type: "Ներդրումներ", location: "Հայաստան", budget: "Ցանկացած" });
    setIsTyping(false);
    
    addMessage({
      text: `Ես գտա լավագույն հանրային առաջարկները Հայաստանում:\n\n${analysis.reasoning}`,
      presentation: {
        title: "Հանրային հայտարարությունների վերլուծություն",
        theme: "Market Overview",
        url: "#",
        properties: analysis.properties
      }
    });
  };

  const filteredProperties = activePresentation?.properties
    ?.filter(prop => {
      const matchesPrice = prop.price >= priceRange[0] && prop.price <= priceRange[1];
      const matchesRooms = roomsFilter ? prop.rooms >= roomsFilter : true;
      const matchesType = propertyTypeFilter ? prop.propertyType === propertyTypeFilter : true;
      const matchesNeighborhood = neighborhoodFilter ? prop.location.toLowerCase().includes(neighborhoodFilter.toLowerCase()) : true;
      const matchesSqFt = prop.squareFootage >= minSqFt && prop.squareFootage <= maxSqFt;
      const matchesYear = prop.yearBuilt >= minYear && prop.yearBuilt <= maxYear;
      const matchesAmenities = amenityFilter.length > 0 
        ? amenityFilter.every(a => prop.features.some((f: string) => f.includes(a))) 
        : true;
      const matchesSearch = searchTerm 
        ? prop.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          prop.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prop.description?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesPrice && matchesRooms && matchesAmenities && matchesType && matchesNeighborhood && matchesSqFt && matchesYear && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rooms') return b.rooms - a.rooms;
      return 0;
    }) || [];

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-accent mx-auto flex items-center justify-center mb-8">
              <Zap className="w-12 h-12 text-black fill-current" />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">RevOS <span className="text-accent">Elite</span></h1>
            <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Revenue Operating System • Foundation Layer</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-12 space-y-8">
            <p className="text-sm text-white/60 font-serif italic">Please sign in to access the elite revenue engine and management tools.</p>
            <button 
              onClick={() => AuthService.login()}
              className="w-full h-14 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:bg-accent transition-all group"
            >
              <User className="w-5 h-5" /> Sign In with Google
            </button>
          </div>

          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">GNEL AI • 2026</p>
        </div>
      </div>
    );
  }

  if (view === 'admin' && (user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN)) {
    return (
      <ErrorBoundary>
        <AdminDashboard 
          currentUser={user} 
          onLogout={() => AuthService.logout()} 
          onSwitchView={setView}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <AnimatePresence mode="wait">
      {view === 'landing' ? (
        <motion.div 
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <LandingPage onStart={() => setView('chat')} onSearch={handlePublicSearch} onPitch={() => setShowPitchDeck(true)} />
        </motion.div>
      ) : (
        <motion.div 
          key="app"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 flex flex-col"
        >
          {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 hidden md:flex items-center justify-between px-12">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('landing')}>
          <div className="w-10 h-10 bg-accent text-black rounded-none flex items-center justify-center group-hover:bg-white transition-colors">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="font-serif text-2xl tracking-tighter uppercase italic">GNEL <span className="text-accent">AI</span></span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-10 h-10 flex items-center justify-center transition-all border ${showColorPicker ? 'bg-accent text-black border-accent' : 'text-white/40 border-transparent hover:border-white/20 hover:text-white'}`}
              title="Customize Accent Color"
            >
              <Palette className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showColorPicker && (
                <ColorPicker 
                  color={accentColor} 
                  accentColor={accentColor}
                  onChange={setAccentColor} 
                  onClose={() => setShowColorPicker(false)} 
                />
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setView('chat')}
            className={`flex items-center gap-3 px-8 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${view === 'chat' ? 'bg-accent text-black border-accent' : 'text-white/40 border-transparent hover:border-white/20 hover:text-white'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Մեսենջեր
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-3 px-8 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${view === 'dashboard' ? 'bg-accent text-black border-accent' : 'text-white/40 border-transparent hover:border-white/20 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            CRM
            {leads.some(l => l.status === 'HOT') && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          {(user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN) && (
            <button 
              onClick={() => setView('admin')}
              className={`flex items-center gap-3 px-8 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${view === 'admin' ? 'bg-accent text-black border-accent' : 'text-white/40 border-transparent hover:border-white/20 hover:text-white'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
          )}
          <button 
            onClick={() => setShowPitchDeck(true)}
            className={`flex items-center gap-3 px-8 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${showPitchDeck ? 'bg-accent text-black border-accent' : 'text-white/40 border-transparent hover:border-white/20 hover:text-white'}`}
          >
            <Presentation className="w-4 h-4" />
            Pitch Deck
          </button>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 flex md:hidden items-center justify-between px-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-8 h-8 bg-accent text-black flex items-center justify-center">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="font-serif text-lg tracking-tighter uppercase italic">GNEL <span className="text-accent">AI</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-8 h-8 flex items-center justify-center transition-all ${showColorPicker ? 'text-accent' : 'text-white/40'}`}
            >
              <Palette className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showColorPicker && (
                <ColorPicker 
                  color={accentColor} 
                  accentColor={accentColor}
                  onChange={setAccentColor} 
                  onClose={() => setShowColorPicker(false)} 
                />
              )}
            </AnimatePresence>
          </div>
          {leads.some(l => l.status === 'HOT') && (
            <div className="relative">
              <Bell className="w-5 h-5 text-accent" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <User className="w-4 h-4 text-white/60" />
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/90 backdrop-blur-2xl border-t border-white/5 z-50 flex md:hidden items-center justify-around px-4 pb-safe">
        <button 
          onClick={() => setView('chat')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'chat' ? 'text-accent' : 'text-white/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${view === 'chat' ? 'bg-accent/10' : ''}`}>
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Chat</span>
        </button>
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'dashboard' ? 'text-accent' : 'text-white/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${view === 'dashboard' ? 'bg-accent/10' : ''}`}>
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">CRM</span>
        </button>
        {(user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN) && (
          <button 
            onClick={() => setView('admin')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'admin' ? 'text-accent' : 'text-white/40'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'admin' ? 'bg-accent/10' : ''}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">Admin</span>
          </button>
        )}
        <button 
          onClick={() => setShowPitchDeck(true)}
          className={`flex flex-col items-center gap-1 transition-all ${showPitchDeck ? 'text-accent' : 'text-white/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${showPitchDeck ? 'bg-accent/10' : ''}`}>
            <Presentation className="w-6 h-6" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Pitch</span>
        </button>
      </nav>

          <main className="flex-1 pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-6 max-w-7xl mx-auto w-full h-full flex flex-col">
            <AnimatePresence mode="wait">
              {view === 'chat' ? (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col flex-1 bg-[#141414] md:rounded-3xl border border-white/5 overflow-hidden shadow-2xl"
                >
                  {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('landing')}
                  className="md:hidden w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30">
                    <Bot className="w-6 h-6 text-accent" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#141414] rounded-full" />
                </div>
                <div>
                  <h3 className="font-serif italic text-sm">Gnel AI Գործակալ</h3>
                  <p className="text-[10px] text-white/40 tracking-widest uppercase">Elite Sales Engine • Online</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {leads.some(l => l.status === 'HOT') && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Hot Lead Detected</span>
                  </div>
                )}
                <button 
                  onClick={() => setView('landing')}
                  className="hidden sm:flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
                >
                  Փակել <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.type === 'system' ? 'w-full text-center' : ''}`}>
                      {msg.type === 'system' ? (
                        <div className="bg-red-500/10 text-red-400 text-xs py-2 px-4 rounded-full border border-red-500/20 inline-block">
                          {msg.text}
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {msg.type === 'bot' && (
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex-shrink-0 flex items-center justify-center border border-orange-500/20">
                              <Zap className="w-4 h-4 text-orange-500" />
                            </div>
                          )}
                          <div className="space-y-3">
                            {msg.text && (
                              <div className={`p-5 rounded-none text-sm leading-relaxed font-light ${
                                msg.type === 'user' 
                                  ? 'bg-accent text-black' 
                                  : 'bg-white/5 text-white/90 border border-white/5'
                              }`}>
                                {msg.text.split('\n').map((line, i) => (
                                  <p key={i} className={msg.type === 'bot' ? 'font-serif italic text-lg' : ''}>{line}</p>
                                ))}
                              </div>
                            )}

                            {/* Presentation Card */}
                            {msg.presentation && (
                              <div className="bg-white/5 border border-white/5 p-8 rounded-none space-y-6 gold-glow">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 bg-accent/10 flex items-center justify-center border border-accent/20">
                                    <LayoutDashboard className="w-7 h-7 text-accent" />
                                  </div>
                                  <div>
                                    <h4 className="font-serif text-xl italic">{msg.presentation.title}</h4>
                                    <p className="text-[9px] text-white/30 tracking-[0.3em] uppercase">Curated by GNEL Elite AI</p>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="h-px bg-white/5 w-full" />
                                  <p className="text-xs text-white/50 italic font-serif">Theme: {msg.presentation.theme}</p>
                                  <button 
                                    onClick={() => setActivePresentation(msg.presentation)}
                                    className="w-full bg-white text-black py-4 rounded-none text-[10px] font-black tracking-[0.2em] uppercase hover:bg-accent hover:text-white transition-all"
                                  >
                                    View Collection
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Options */}
                            {msg.options && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {msg.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleOptionClick(opt)}
                                    className="px-6 py-3 bg-transparent border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/10">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-black/40 border-t border-white/5 sticky bottom-0 md:relative">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask GNEL Elite anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-none py-5 md:py-4 px-8 text-base md:text-sm focus:outline-none focus:border-accent/50 transition-all font-serif italic"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-12 h-12 md:w-10 md:h-10 bg-accent hover:bg-white text-black disabled:bg-white/10 rounded-none flex items-center justify-center transition-all"
                >
                  <Send className={`w-6 h-6 md:w-5 md:h-5 ${inputValue.trim() && !isTyping ? 'text-black' : 'text-black/40'}`} />
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-y-auto space-y-6 pb-20 md:pb-10"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <h2 className="text-2xl md:text-3xl font-serif italic tracking-tight">Անշարժ Գույքի CRM</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex gap-4 border-b border-white/10 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  <button 
                    onClick={() => setDashboardTab('revos')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'revos' ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    RevOS Analytics
                    {dashboardTab === 'revos' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('messaging')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'messaging' ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Հաղորդագրություններ
                    {dashboardTab === 'messaging' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('leads')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'leads' ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Հայտեր
                    {dashboardTab === 'leads' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('hot')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'hot' ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                  >
                    Թեժ Հայտեր
                    {dashboardTab === 'hot' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('market')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'market' ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Շուկայի Վերլուծություն
                    {dashboardTab === 'market' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('architecture')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${dashboardTab === 'architecture' ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Ճարտարապետություն
                    {dashboardTab === 'architecture' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDashboardTab('hot')}
                    className="bg-red-500/5 border border-red-500/10 px-4 py-1.5 rounded-none flex items-center gap-2 whitespace-nowrap hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{leads.filter(l => l.status === 'HOT').length} HOT</span>
                  </button>
                  <div className="bg-accent/5 border border-accent/10 px-4 py-1.5 rounded-none flex items-center gap-2 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">{leads.filter(l => l.status === 'WARM').length} WARM</span>
                  </div>
                </div>
              </div>
            </div>

            {dashboardTab === 'leads' && leads.filter(l => l.status === 'HOT').length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-600/10 border border-red-600/20 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-red-500 fill-red-500" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Անհապաղ Ուշադրություն</p>
                    <p className="text-sm font-serif italic text-white/80">Դուք ունեք {leads.filter(l => l.status === 'HOT').length} թեժ հայտ, որոնք սպասում են ձեր արձագանքին:</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDashboardTab('hot')}
                  className="px-6 py-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  Դիտել Թեժ Հայտերը
                </button>
              </motion.div>
            )}

            {dashboardTab === 'leads' ? (
              leads.length === 0 ? (
                <div className="h-64 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20">
                  <BarChart3 className="w-12 h-12 mb-4" />
                  <p>Դեռևս չկան հայտեր: Սկսեք չատը տվյալները տեսնելու համար:</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {leads.map((lead) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={lead.id} 
                      className="bg-[#141414] border border-white/5 p-8 rounded-none hover:border-accent/30 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${
                            lead.status === 'HOT' ? 'bg-red-500/20 text-red-500' : 
                            lead.status === 'WARM' ? 'bg-yellow-500/20 text-yellow-500' : 
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {lead.type === 'Инвестиции' || lead.type === 'Ներդրումներ' ? <Briefcase className="w-5 h-5 md:w-6 md:h-6" /> : <Home className="w-5 h-5 md:w-6 md:h-6" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-base md:text-lg uppercase italic">{lead.type === 'Инвестиции' || lead.type === 'Ներդրումներ' ? 'Ներդրումային' : 'Բնակելի'} Հայտ</h4>
                            <p className="text-[10px] md:text-xs text-white/40 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {lead.location} • {lead.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                          <div className={`px-4 py-1.5 md:px-5 md:py-2 rounded-none text-[8px] md:text-[9px] font-black tracking-[0.3em] uppercase ${
                            lead.status === 'HOT' ? 'bg-red-500 text-white' : 
                            lead.status === 'WARM' ? 'bg-accent text-black' : 
                            'bg-white/10 text-white/40'
                          }`}>
                            {lead.status}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                        <div className="bg-white/5 p-3 md:p-4 rounded-none border border-white/5">
                          <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-1 md:mb-2 font-black tracking-widest">Ընտանիք</p>
                          <p className="text-[11px] md:text-sm font-serif italic text-white/80">{lead.familySize}</p>
                        </div>
                        <div className="bg-white/5 p-3 md:p-4 rounded-none border border-white/5">
                          <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-1 md:mb-2 font-black tracking-widest">Բյուջե</p>
                          <p className="text-[11px] md:text-sm font-serif italic text-white/80">{lead.budget}</p>
                        </div>
                        <div className="bg-white/5 p-3 md:p-4 rounded-none border border-white/5 col-span-2">
                          <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-1 md:mb-2 font-black tracking-widest">Պրեզենտացիայի Թեմա</p>
                          <p className="text-[11px] md:text-sm font-serif italic text-accent">{lead.presentationTheme}</p>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 md:p-6 rounded-none border border-white/5 mb-6">
                        <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-2 md:mb-3 font-black tracking-widest">AI Կանխատեսող Վերլուծություն</p>
                        <p className="text-[11px] md:text-xs text-white/60 leading-relaxed font-serif italic">{lead.summary}</p>
                      </div>

                      {/* Feedback & Nurturing Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white/5 p-6 border border-white/5">
                          <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-4 font-black tracking-widest">Manager Feedback</p>
                          {lead.feedback ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className={`w-4 h-4 ${star <= lead.feedback!.rating ? 'text-accent fill-accent' : 'text-white/10'}`} 
                                  />
                                ))}
                                <span className="text-[10px] text-white/40 uppercase font-black ml-2 tracking-widest">Accuracy Rated</span>
                              </div>
                              {lead.feedback.comment && (
                                <p className="text-[10px] text-white/60 font-serif italic border-l border-accent/30 pl-3 py-1">
                                  "{lead.feedback.comment}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button 
                                    key={star} 
                                    onClick={() => setFeedbackDrafts(prev => ({
                                      ...prev,
                                      [lead.id]: { rating: star, comment: prev[lead.id]?.comment || '' }
                                    }))}
                                    className="transition-all"
                                  >
                                    <Star 
                                      className={`w-5 h-5 ${
                                        (feedbackDrafts[lead.id]?.rating || 0) >= star 
                                          ? 'text-accent fill-accent' 
                                          : 'text-white/20 hover:text-accent'
                                      }`} 
                                    />
                                  </button>
                                ))}
                                <span className="text-[10px] text-white/40 uppercase font-black ml-2 tracking-widest">Rate AI Accuracy</span>
                              </div>
                              
                              {feedbackDrafts[lead.id] && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="space-y-3 overflow-hidden"
                                >
                                  <textarea 
                                    value={feedbackDrafts[lead.id].comment}
                                    onChange={(e) => setFeedbackDrafts(prev => ({
                                      ...prev,
                                      [lead.id]: { ...prev[lead.id], comment: e.target.value }
                                    }))}
                                    placeholder="Add a comment on AI accuracy..."
                                    className="w-full bg-white/5 border border-white/10 p-3 text-[10px] text-white/80 focus:outline-none focus:border-accent/30 font-serif italic min-h-[60px] resize-none"
                                  />
                                  <button 
                                    onClick={() => {
                                      handleSubmitFeedback(lead.id, feedbackDrafts[lead.id].rating, feedbackDrafts[lead.id].comment);
                                      setFeedbackDrafts(prev => {
                                        const next = { ...prev };
                                        delete next[lead.id];
                                        return next;
                                      });
                                    }}
                                    className="w-full bg-accent/10 border border-accent/20 text-accent py-2 text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-black transition-all"
                                  >
                                    Submit Feedback
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          )}
                        </div>

                        {lead.status === 'COLD' && (
                          <div className="bg-white/5 p-6 border border-white/5 flex flex-col justify-center">
                            <p className="text-[7px] md:text-[8px] text-white/20 uppercase mb-4 font-black tracking-widest">Nurturing Automation</p>
                            {lead.nurturingSequence ? (
                              <button 
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setDashboardTab('nurturing');
                                }}
                                className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest hover:text-white transition-colors"
                              >
                                <Clock className="w-4 h-4" /> View Nurturing Sequence <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleGenerateNurturing(lead.id)}
                                disabled={isGeneratingNurturing}
                                className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest hover:text-accent transition-colors disabled:opacity-50"
                              >
                                {isGeneratingNurturing ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                Generate Nurturing Sequence
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between pt-6 border-t border-white/5 gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                          <button 
                            onClick={() => lead.presentation && setActivePresentation(lead.presentation)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-[9px] md:text-[10px] font-black text-accent hover:text-white transition-colors uppercase tracking-[0.2em] disabled:opacity-30 border border-accent/30"
                            disabled={!lead.presentation}
                          >
                            ԴԻՏԵԼ ՊՐԵԶԵՆՏԱՑԻԱՆ <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
                          <button className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-[9px] md:text-[10px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em] border border-white/10">
                            ԴԻՏԵԼ ԱՄԲՈՂՋԱԿԱՆ ՏՐԱՆՍԿՐԻՊՏԸ <ArrowRight className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLead(lead);
                              setDashboardTab('deal');
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-[9px] md:text-[10px] font-black bg-white text-black hover:bg-white/90 transition-colors uppercase tracking-[0.2em] border border-white"
                          >
                            ԴԻՏԵԼ ԳՈՐԾԱՐՔԸ <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : dashboardTab === 'hot' ? (
              <HotLeadsView 
                leads={leads} 
                onSelectLead={(lead) => {
                  setSelectedLead(lead);
                  setDashboardTab('deal');
                }} 
                onContact={(lead) => {
                  showToast(`Կապ հաստատելու հարցումն ուղարկված է ${lead.name}-ի համար:`, 'success');
                }}
              />
            ) : dashboardTab === 'market' ? (
              <MarketIntelligence />
            ) : dashboardTab === 'architecture' ? (
              <ExpertArchitecture />
            ) : dashboardTab === 'deal' && selectedLead ? (
              <DealDetails 
                lead={selectedLead} 
                onBack={() => setDashboardTab('leads')} 
                onFeedbackSubmit={handleSubmitFeedback}
                feedbackDraft={feedbackDrafts[selectedLead.id]}
                onFeedbackDraftChange={(draft) => setFeedbackDrafts(prev => ({ ...prev, [selectedLead.id]: draft }))}
                onGenerateNurturing={handleGenerateNurturing}
                isGeneratingNurturing={isGeneratingNurturing}
              />
            ) : dashboardTab === 'revos' ? (
              <RevOSDashboard analytics={revenueAnalytics} insights={aiInsights} />
            ) : dashboardTab === 'messaging' ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-serif italic text-white uppercase tracking-tighter">AI Messaging Queue</h2>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-2">Ավտոմատացված հաղորդակցության կառավարում</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 text-center min-w-[120px]">
                      <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Սպասող</p>
                      <p className="text-2xl font-serif italic text-accent">{messageQueue.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 text-center min-w-[120px]">
                      <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Ուղարկված</p>
                      <p className="text-2xl font-serif italic text-white">1,248</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {messageQueue.length === 0 ? (
                    <div className="h-64 border border-dashed border-white/10 flex flex-col items-center justify-center text-white/20">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <p className="uppercase font-black tracking-widest text-[10px]">Հերթը դատարկ է</p>
                    </div>
                  ) : (
                    messageQueue.map((msg, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        className="bg-[#141414] border border-white/5 p-6 flex items-center justify-between group hover:border-accent/30 transition-all"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                            {msg.channel === 'WhatsApp' ? <MessageSquare className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-serif italic text-white uppercase">{msg.leadName}</h4>
                              <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent text-[8px] font-black uppercase tracking-widest">
                                {msg.channel}
                              </span>
                            </div>
                            <p className="text-xs text-white/40 mt-1 line-clamp-1 italic font-serif">"{msg.content}"</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Պլանավորված</p>
                            <p className="text-xs text-white/60 font-black tracking-widest uppercase">Day {msg.day}</p>
                          </div>
                          <button className="bg-white text-black px-6 py-3 text-[9px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                            Ուղարկել Հիմա
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: -50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-6 p-6 border ${toast.type === 'success' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-red-500/10 border-red-500/30 text-red-500'} z-[1100] min-w-[300px] flex items-center gap-4`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-accent' : 'bg-red-500'} animate-pulse`} />
            <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 bg-[#1a1a1a] text-white p-1 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-stretch gap-0 z-[1000] border border-red-500/30 overflow-hidden min-w-[320px]"
          >
            <div className="bg-red-600 w-16 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              <Bell className="w-6 h-6 text-white animate-ring relative z-10" />
            </div>
            
            <div className="flex-1 p-5 pr-12 relative">
              <button 
                onClick={() => setActiveNotification(null)}
                className="absolute top-2 right-2 p-1 text-white/20 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-500/10 px-2 py-0.5">Urgent Alert</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Just Now</span>
                </div>
                <h4 className="text-lg font-serif italic text-white leading-tight">🔥 Թեժ Հայտի Ահազանգ!</h4>
                <p className="text-[11px] text-white/60 font-serif italic leading-relaxed">
                  {activeNotification.type === 'Инвестиции' || activeNotification.type === 'Ներդրումներ' ? 'Ներդրումային' : 'Բնակելի'} հայտ {activeNotification.location}-ից
                </p>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedLead(activeNotification);
                    setDashboardTab('deal');
                    setView('dashboard');
                    setActiveNotification(null);
                  }}
                  className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-accent transition-all"
                >
                  ԴԻՏԵԼ ԳՈՐԾԱՐՔԸ
                </button>
                <button 
                  onClick={() => {
                    setView('dashboard');
                    setDashboardTab('leads');
                    setActiveNotification(null);
                  }}
                  className="bg-white/5 border border-white/10 text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  CRM
                </button>
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-red-600/50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio for notifications */}
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto"
      />

      {/* Pitch Deck Modal */}
      <AnimatePresence>
        {showPitchDeck && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[500] bg-black"
          >
            <PitchDeck onClose={() => setShowPitchDeck(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presentation Modal */}
      <AnimatePresence>
        {activePresentation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black overflow-y-auto"
          >
            <div className="min-h-screen flex flex-col">
              {/* Close Button */}
              <button 
                onClick={() => {
                  setActivePresentation(null);
                  setSelectedProperty(null);
                }}
                className="fixed top-8 right-8 z-[210] w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
              >
                <Zap className="w-6 h-6 text-white rotate-45" />
              </button>

              {/* Property Details Modal */}
              <AnimatePresence>
                {selectedProperty && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-12"
                  >
                    <div className="max-w-7xl mx-auto relative">
                      {/* Close Button */}
                      <button 
                        onClick={() => setSelectedProperty(null)}
                        className="fixed top-4 right-4 md:absolute md:top-0 md:right-0 z-[310] w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center border border-white/10 transition-all backdrop-blur-md"
                      >
                        <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </button>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-16">
                        {/* Left Column: Images & Floor Plans */}
                        <div className="space-y-6 md:space-y-12">
                          <div className="space-y-3 md:space-y-4">
                            <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-accent">Պատկերասրահ</h2>
                            <div className="grid grid-cols-2 gap-1.5 md:gap-4">
                              {selectedProperty.images.map((img: string, i: number) => (
                                <div key={i} className={`overflow-hidden rounded-none aspect-square relative group ${i === 0 ? 'col-span-2 aspect-video' : ''}`}>
                                  <img 
                                    src={`https://picsum.photos/seed/${img}/1200/900`} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    alt={`${selectedProperty.name} ${i}`}
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                </div>
                              ))}
                            </div>
                          </div>

                          {selectedProperty.floorPlans && selectedProperty.floorPlans.length > 0 && (
                            <div className="space-y-4 md:space-y-6">
                              <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-accent">Հատակագծեր</h2>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                {selectedProperty.floorPlans.map((plan: string, i: number) => (
                                  <div key={i} className="bg-white/5 p-4 md:p-8 border border-white/10 rounded-none group cursor-zoom-in">
                                    <div className="aspect-square relative overflow-hidden bg-white/5 flex items-center justify-center">
                                      <img 
                                        src={`https://picsum.photos/seed/${plan}/800/800`} 
                                        className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" 
                                        alt={`Floor Plan ${i + 1}`}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-none text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10">
                                          Մեծացնել
                                        </div>
                                      </div>
                                    </div>
                                    <p className="mt-3 md:mt-4 text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Մակարդակ {i + 1}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column: Info & Form */}
                        <div className="space-y-8 md:space-y-16">
                          <div className="space-y-6 md:space-y-8">
                            <div>
                              <p className="text-accent font-black text-[9px] md:text-[12px] uppercase tracking-[0.4em] mb-1 md:mb-4">{selectedProperty.location}</p>
                              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-serif italic font-light uppercase tracking-tighter leading-tight md:leading-none">{selectedProperty.name}</h1>
                              <p className="text-xl sm:text-2xl md:text-3xl font-serif text-white mt-3 md:mt-6">{selectedProperty.priceDisplay}</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-8 border-y border-white/10 py-4 md:py-8">
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">Տեսակ</p>
                                <p className="text-xs md:text-xl font-serif italic">{selectedProperty.propertyType === 'Apartment' ? 'Բնակարան' : selectedProperty.propertyType === 'House' ? 'Տուն' : 'Կոմերցիոն'}</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">Սենյակներ</p>
                                <p className="text-xs md:text-xl font-serif italic">{selectedProperty.rooms}</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">Մակերես</p>
                                <p className="text-xs md:text-xl font-serif italic">{selectedProperty.squareFootage} մ²</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">Տարեթիվ</p>
                                <p className="text-xs md:text-xl font-serif italic">{selectedProperty.yearBuilt}</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">ROI</p>
                                <p className="text-xs md:text-xl font-serif italic text-accent">{selectedProperty.roi}</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-widest">Կարգավիճակ</p>
                                <p className="text-xs md:text-xl font-serif italic">{selectedProperty.availability}</p>
                              </div>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                              <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-accent">Նկարագրություն</h2>
                              <div className="text-base md:text-lg text-white/70 font-light leading-relaxed space-y-3 md:space-y-4 font-serif italic">
                                {selectedProperty.description?.split('\n').map((p: string, i: number) => (
                                  <p key={i}>{p}</p>
                                ))}
                              </div>
                            </div>

                            {selectedProperty.amenities && (
                              <div className="space-y-4 md:space-y-6">
                                <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-accent">Հարմարություններ</h2>
                                <div className="grid grid-cols-2 gap-y-3 md:gap-y-4 gap-x-4 md:gap-x-8">
                                  {selectedProperty.amenities.map((amenity: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 md:gap-3 group">
                                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-accent rounded-none group-hover:scale-150 transition-transform" />
                                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">{amenity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                              <MortgageCalculator price={selectedProperty.price} />
                              
                              <div className="bg-white/5 p-6 md:p-8 border border-white/10 rounded-none space-y-4 md:space-y-6">
                                <div className="space-y-1 md:space-y-2">
                                  <h3 className="text-lg md:text-xl font-serif italic font-light uppercase tracking-tight">Ֆինանսավորում</h3>
                                  <p className="text-[7px] md:text-[8px] text-white/40 uppercase font-black tracking-widest">Գործընկեր բանկեր</p>
                                </div>
                                <div className="space-y-2 md:space-y-4">
                                  {[
                                    { name: 'Ameriabank', rate: '11.5%' },
                                    { name: 'Ardshinbank', rate: '12.0%' },
                                    { name: 'Evocabank', rate: '11.9%' },
                                    { name: 'Acba Bank', rate: '12.2%' }
                                  ].map(bank => (
                                    <div key={bank.name} className="flex justify-between items-center p-2.5 md:p-3 border border-white/5 hover:border-accent/30 transition-colors group">
                                      <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white">{bank.name}</span>
                                      <span className="text-[8px] md:text-[10px] font-mono text-accent">{bank.rate}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[7px] md:text-[8px] text-white/30 italic">* Տոկոսադրույքները մոտավոր են:</p>
                              </div>
                            </div>

                            <div className="bg-white/5 p-6 md:p-8 border border-white/10 rounded-none space-y-4 md:space-y-6">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-accent/10 flex items-center justify-center border border-accent/20">
                                  <Building2 className="w-5 h-5 md:w-8 md:h-8 text-accent" />
                                </div>
                                <div>
                                  <h3 className="text-lg md:text-2xl font-serif italic font-light uppercase tracking-tight">Կառուցապատող</h3>
                                  <p className="text-[7px] md:text-[10px] text-white/40 uppercase font-black tracking-widest">AAB Construction • Էլիտար Գործընկեր</p>
                                </div>
                              </div>
                              <p className="text-[11px] md:text-sm text-white/60 font-serif italic leading-relaxed">
                                AAB Construction-ը Հայաստանի առաջատար կառուցապատողներից է, որը հայտնի է իր որակով և ժամանակակից ճարտարապետական լուծումներով: GNEL Elite-ի հետ համագործակցության շրջանակներում գործում են հատուկ պայմաններ:
                              </p>
                              <div className="flex gap-3 md:gap-4">
                                <div className="flex-1 bg-white/5 p-3 md:p-4 border border-white/5 text-center">
                                  <p className="text-[7px] md:text-[8px] text-white/20 uppercase font-black tracking-widest mb-1">Փորձ</p>
                                  <p className="text-sm md:text-lg font-serif italic">15+ Տարի</p>
                                </div>
                                <div className="flex-1 bg-white/5 p-3 md:p-4 border border-white/5 text-center">
                                  <p className="text-[7px] md:text-[8px] text-white/20 uppercase font-black tracking-widest mb-1">Օբյեկտներ</p>
                                  <p className="text-sm md:text-lg font-serif italic">25+ Ավարտված</p>
                                </div>
                              </div>
                            </div>
                          </div>

                            {selectedProperty.availability === 'Last Unit' && (
                              <div className="bg-red-600/10 border border-red-600/20 p-6 md:p-12 rounded-none space-y-6 relative overflow-hidden mb-8">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                  <div className="space-y-2 text-center md:text-left">
                                    <h3 className="text-2xl md:text-4xl font-serif italic font-black uppercase tracking-tight text-red-500">Վերջին միավորը</h3>
                                    <p className="text-[10px] md:text-xs text-white/60 uppercase font-black tracking-widest">Այս գույքը շատ արագ է վաճառվում: Բաց մի թողեք ձեր հնարավորությունը:</p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      showToast("Գնման հարցումը ուղարկված է: Մեր մասնագետը կկապնվի ձեզ հետ 5 րոպեի ընթացքում:", "success");
                                      setSelectedProperty(null);
                                    }}
                                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-12 py-6 rounded-none font-black text-xs md:text-sm tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 group animate-pulse shadow-2xl shadow-red-600/20"
                                  >
                                    Գնել հիմա <Zap className="w-5 h-5 fill-current" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Contact Form */}
                            <div className="bg-white/5 p-6 md:p-12 border border-white/10 rounded-none space-y-6 md:space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            <div className="relative z-10 space-y-1 md:space-y-2">
                              <h3 className="text-2xl md:text-3xl font-serif italic font-light uppercase tracking-tight">Հետաքրքրվա՞ծ եք</h3>
                              <p className="text-[8px] md:text-[10px] text-white/40 uppercase font-black tracking-widest">Մեր մասնագետը կկապվի ձեզ հետ 5 րոպեի ընթացքում</p>
                            </div>

                            <form className="space-y-4 md:space-y-6 relative z-10" onSubmit={(e) => { e.preventDefault(); showToast('Հայտը հաջողությամբ ուղարկվեց:', 'success'); setSelectedProperty(null); }}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-1.5 md:space-y-2">
                                  <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-4">Անուն</label>
                                  <input 
                                    type="text" 
                                    required
                                    placeholder="Ձեր անունը" 
                                    className="w-full bg-white/5 border border-white/10 px-4 md:px-6 py-3 md:py-4 rounded-none focus:outline-none focus:border-accent transition-all text-xs md:text-sm font-light"
                                  />
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                  <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-4">Հեռախոս</label>
                                  <input 
                                    type="tel" 
                                    required
                                    placeholder="+374 __ ___ ___" 
                                    className="w-full bg-white/5 border border-white/10 px-4 md:px-6 py-3 md:py-4 rounded-none focus:outline-none focus:border-accent transition-all text-xs md:text-sm font-light"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-4">Հաղորդագրություն</label>
                                <textarea 
                                  placeholder="Ինչո՞վ կարող ենք օգնել ձեզ..." 
                                  rows={3}
                                  className="w-full bg-white/5 border border-white/10 px-4 md:px-6 py-3 md:py-4 rounded-none focus:outline-none focus:border-accent transition-all text-xs md:text-sm font-light resize-none"
                                />
                              </div>
                              <button className="w-full bg-accent hover:bg-accent/80 text-black py-4 md:py-6 rounded-none font-black text-[10px] md:text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-accent/20">
                                Ուղարկել հարցում <Send className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hero Section - Editorial Style */}
              <section className="relative h-[100dvh] flex flex-col justify-end p-6 md:p-16 overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={`https://picsum.photos/seed/${activePresentation.theme}/1920/1080`} 
                    alt="Property" 
                    className="w-full h-full object-cover opacity-40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>

                <div className="relative z-10 space-y-6 max-w-6xl">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-accent font-black tracking-[0.4em] uppercase text-[10px] mb-6 block">Անհատական Առաջարկ</span>
                    <h1 className="text-5xl sm:text-6xl md:text-[8vw] font-serif font-light leading-[1] md:leading-[0.85] uppercase italic tracking-tighter">
                      {activePresentation.theme.split(' ').map((word, i) => (
                        <span key={i} className={i % 2 === 1 ? 'text-accent' : ''}>{word} </span>
                      ))}
                    </h1>
                  </motion.div>
                  
                  <motion.p 
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl md:text-2xl text-white/60 max-w-2xl font-light leading-relaxed"
                  >
                    Էքսկլյուզիվ առաջարկ՝ ստեղծված GNEL AI-ի կողմից՝ հիմնված ձեր նախասիրությունների և ներդրումային պրոֆիլի վրա:
                  </motion.p>
                </div>
              </section>

              {/* Filters & View Toggle Section */}
              <section className="bg-[#0a0a0a] border-y border-white/10 sticky top-0 z-[205] backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
                  <div className="flex flex-col gap-8">
                    {/* Top Row: Search & View Toggle */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
                      <div className="xl:col-span-8 flex flex-col sm:flex-row gap-4 w-full">
                        <div className="flex-1 relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-xs pl-12 pr-4 py-4 text-white outline-none focus:border-accent transition-all"
                            placeholder="Փնտրել ըստ անվան կամ նկարագրության..."
                          />
                        </div>
                        <div className="w-full sm:w-64 relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <select 
                            value={neighborhoodFilter || ''} 
                            onChange={(e) => setNeighborhoodFilter(e.target.value || null)}
                            className="w-full bg-white/5 border border-white/10 text-xs pl-12 pr-10 py-4 text-white outline-none focus:border-accent appearance-none uppercase font-black tracking-widest transition-all"
                          >
                            <option value="" className="bg-black">Բոլոր Թաղամասերը</option>
                            <option value="Կենտրոն" className="bg-black">Կենտրոն</option>
                            <option value="Արաբկիր" className="bg-black">Արաբկիր</option>
                            <option value="Քանաքեռ-Զեյթուն" className="bg-black">Քանաքեռ-Զեյթուն</option>
                            <option value="Նոր Նորք" className="bg-black">Նոր Նորք</option>
                            <option value="Ավան" className="bg-black">Ավան</option>
                            <option value="Էրեբունի" className="bg-black">Էրեբունի</option>
                            <option value="Շենգավիթ" className="bg-black">Շենգավիթ</option>
                            <option value="Դավթաշեն" className="bg-black">Դավթաշեն</option>
                            <option value="Աջափնյակ" className="bg-black">Աջափնյակ</option>
                            <option value="Մալաթիա-Սեբաստիա" className="bg-black">Մալաթիա-Սեբաստիա</option>
                            <option value="Նորք-Մարաշ" className="bg-black">Նորք-Մարաշ</option>
                            <option value="Նուբարաշեն" className="bg-black">Նուբարաշեն</option>
                          </select>
                        </div>
                      </div>

                      <div className="xl:col-span-4 flex items-center gap-4 w-full justify-between sm:justify-end overflow-x-auto no-scrollbar">
                        <div className="bg-white/5 p-1 rounded-none border border-white/5 flex shrink-0">
                          <button 
                            onClick={() => setPresentationView('list')}
                            className={`px-4 md:px-6 py-2.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${presentationView === 'list' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> Ցուցակ
                          </button>
                          <button 
                            onClick={() => setPresentationView('map')}
                            className={`px-4 md:px-6 py-2.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${presentationView === 'map' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                          >
                            <MapIcon className="w-3.5 h-3.5" /> Քարտեզ
                          </button>
                        </div>
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-white/5 border border-white/10 text-white/60 text-[10px] font-black tracking-widest uppercase px-4 py-3 rounded-none outline-none focus:border-white/30 shrink-0"
                        >
                          <option value="price-desc" className="bg-black">Գինը՝ բարձրից ցածր</option>
                          <option value="price-asc" className="bg-black">Գինը՝ ցածրից բարձր</option>
                          <option value="rooms" className="bg-black">Սենյակների քանակ</option>
                        </select>
                      </div>
                    </div>

                    {/* Bottom Row: Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 items-end">
                      {/* Rooms Filter */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <Home className="w-3 h-3" /> Սենյակներ
                        </p>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(num => (
                            <button
                              key={num}
                              onClick={() => setRoomsFilter(roomsFilter === num ? null : num)}
                              className={`flex-1 h-12 rounded-none text-[10px] font-black tracking-widest uppercase transition-all border ${
                                roomsFilter === num ? 'bg-accent text-black border-accent' : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20'
                              }`}
                            >
                              {num}+
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Price Range */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <DollarSign className="w-3 h-3" /> Գին ($)
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={priceRange[0]} 
                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Min"
                          />
                          <input 
                            type="number" 
                            value={priceRange[1]} 
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Max"
                          />
                        </div>
                      </div>

                      {/* Property Type */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> Տեսակ
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: 'Բոլորը', value: null },
                            { label: 'Բնակարան', value: 'Apartment' },
                            { label: 'Տուն', value: 'House' },
                            { label: 'Կոմերցիոն', value: 'Commercial' }
                          ].map(type => (
                            <button
                              key={type.label || 'all'}
                              onClick={() => setPropertyTypeFilter(type.value)}
                              className={`h-12 px-2 rounded-none text-[9px] font-black tracking-widest uppercase transition-all border ${
                                propertyTypeFilter === type.value ? 'bg-accent text-black border-accent' : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SqFt */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <SlidersHorizontal className="w-3 h-3" /> Մակերես (մ²)
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={minSqFt} 
                            onChange={(e) => setMinSqFt(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Min"
                          />
                          <input 
                            type="number" 
                            value={maxSqFt} 
                            onChange={(e) => setMaxSqFt(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Max"
                          />
                        </div>
                      </div>

                      {/* Amenities Filter */}
                      <div className="space-y-3 xl:col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <Star className="w-3 h-3" /> Հարմարություններ
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Խելացի Տուն', 'Լողավազան', 'Կոնսյերժ', 'Ավտոկայանատեղի', 'Ֆիթնես', 'Այգի'].map(amenity => (
                            <button
                              key={amenity}
                              onClick={() => {
                                if (amenityFilter.includes(amenity)) {
                                  setAmenityFilter(amenityFilter.filter(a => a !== amenity));
                                } else {
                                  setAmenityFilter([...amenityFilter, amenity]);
                                }
                              }}
                              className={`px-3 h-10 rounded-none text-[8px] font-black tracking-widest uppercase transition-all border ${
                                amenityFilter.includes(amenity) ? 'bg-accent text-black border-accent' : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20'
                              }`}
                            >
                              {amenity}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Additional Filters & Reset */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-end border-t border-white/5 pt-8">
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <Bell className="w-3 h-3" /> Կառուցման Տարեթիվ
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={minYear} 
                            onChange={(e) => setMinYear(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Min"
                          />
                          <input 
                            type="number" 
                            value={maxYear} 
                            onChange={(e) => setMaxYear(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-[10px] h-12 px-3 text-white outline-none focus:border-accent transition-all"
                            placeholder="Max"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-2" />

                      <button 
                        onClick={() => {
                          setPriceRange([0, 10000000]);
                          setRoomsFilter(null);
                          setPropertyTypeFilter(null);
                          setNeighborhoodFilter(null);
                          setMinSqFt(0);
                          setMaxSqFt(5000);
                          setMinYear(1900);
                          setMaxYear(new Date().getFullYear() + 5);
                          setAmenityFilter([]);
                          setSearchTerm('');
                        }}
                        className="w-full h-12 px-6 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                      >
                        <RotateCcw className="w-4 h-4" /> Մաքրել բոլորը
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Content Section */}
              <section className="bg-black py-24 px-8 md:px-16">
                <div className="max-w-7xl mx-auto">
                  <AnimatePresence mode="wait">
                    {presentationView === 'list' ? (
                      <motion.div 
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-32"
                      >
                        <div className="text-center space-y-4">
                          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase italic tracking-tighter">Լավագույն առաջարկները</h2>
                          <p className="text-white/40 text-sm sm:text-lg uppercase tracking-widest font-bold">Ընտրված է հատուկ ձեզ համար</p>
                        </div>

                        <div className="grid grid-cols-1 gap-32">
                          {filteredProperties.map((prop: any, idx: number) => (
                            <motion.div 
                              key={prop.id} 
                              ref={el => propertyRefs.current[prop.id] = el}
                              onMouseEnter={() => setActivePropId(prop.id)}
                              initial={{ opacity: 0, y: 50 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "-100px" }}
                              animate={{
                                scale: activePropId === prop.id ? 1.02 : 1,
                                borderColor: activePropId === prop.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                backgroundColor: activePropId === prop.id ? 'rgba(255,255,255,0.02)' : 'transparent'
                              }}
                              className={`flex flex-col ${idx % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center p-6 md:p-12 border rounded-[40px] transition-all relative overflow-hidden`}
                            >
                              {activePropId === prop.id && (
                                <motion.div 
                                  layoutId="active-glow"
                                  className="absolute inset-0 bg-accent/5 blur-3xl pointer-events-none"
                                />
                              )}
                              {/* Image Carousel */}
                              <div className="w-full lg:w-1/2 relative group">
                                <div className="overflow-hidden rounded-[40px] aspect-[4/5] sm:aspect-video lg:aspect-[4/3] relative">
                                  <AnimatePresence mode="wait">
                                    <motion.div 
                                      key={activeImageIndices[prop.id] || 0}
                                      initial={{ opacity: 0, scale: 1.1 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.4 }}
                                      className="absolute inset-0"
                                    >
                                      <img 
                                        src={`https://picsum.photos/seed/${prop.images[activeImageIndices[prop.id] || 0]}/1200/900`} 
                                        className="w-full h-full object-cover"
                                        alt={prop.name}
                                        referrerPolicy="no-referrer"
                                      />
                                    </motion.div>
                                  </AnimatePresence>
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                                  
                                  {/* Sales Badges */}
                                  <div className="absolute top-4 left-4 md:top-8 md:left-8 flex flex-col gap-2">
                                    {activePropId === prop.id && (
                                      <motion.div 
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="bg-accent text-black px-4 py-1.5 rounded-none text-[8px] md:text-[10px] font-black tracking-widest uppercase flex items-center gap-2 shadow-2xl z-20"
                                      >
                                        <Star className="w-3 h-3 fill-current" /> Ընտրված է
                                      </motion.div>
                                    )}
                                    <div className="bg-blue-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-none text-[8px] md:text-[10px] font-black tracking-widest uppercase flex items-center gap-2 shadow-2xl">
                                      <Search className="w-3 h-3" /> Ստուգված
                                    </div>
                                    {prop.isPopular && (
                                      <div className="bg-accent text-black px-4 py-1.5 rounded-none text-[8px] md:text-[10px] font-black tracking-widest uppercase flex items-center gap-2 shadow-2xl">
                                        <Users className="w-3 h-3" /> Հանրաճանաչ
                                      </div>
                                    )}
                                  </div>

                                  <div className="absolute top-4 right-4 md:top-8 md:right-8">
                                    <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 md:p-5 rounded-none text-center">
                                      <p className="text-[7px] md:text-[9px] text-white/40 uppercase font-black tracking-widest mb-1">AI Match</p>
                                      <p className="text-lg md:text-2xl font-serif italic text-accent">{prop.matchScore}%</p>
                                    </div>
                                  </div>

                                  <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                                    <div className="cursor-pointer group/title" onClick={() => setSelectedProperty(prop)}>
                                      <p className="text-accent font-black text-[8px] md:text-[10px] uppercase tracking-[0.3em] mb-2 md:mb-3">
                                        {prop.location} • {prop.rooms} Սենյակ • {prop.squareFootage}մ²
                                      </p>
                                      <h3 className="text-2xl md:text-4xl lg:text-5xl font-serif italic font-light uppercase tracking-tighter group-hover/title:text-accent transition-colors leading-none">{prop.name}</h3>
                                    </div>
                                    <div className="bg-white text-black px-6 py-3 rounded-none font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl">
                                      {prop.priceDisplay}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Mini Gallery */}
                                <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                                  {prop.images.map((img: string, i: number) => (
                                    <div 
                                      key={i} 
                                      onClick={() => setActiveImageIndices(prev => ({ ...prev, [prop.id]: i }))}
                                      className={`flex-1 min-w-[80px] h-16 md:h-24 rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                                        (activeImageIndices[prop.id] || 0) === i ? 'border-accent scale-95' : 'border-white/10 hover:border-white/30'
                                      }`}
                                    >
                                      <img src={`https://picsum.photos/seed/${img}/400/300`} className={`w-full h-full object-cover transition-opacity ${
                                        (activeImageIndices[prop.id] || 0) === i ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                                      }`} referrerPolicy="no-referrer" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Features List */}
                              <div className="w-full lg:w-1/2 space-y-8 md:space-y-12">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <span className="text-white/5 text-6xl md:text-9xl font-serif italic leading-none">0{idx + 1}</span>
                                    <h3 className="text-2xl md:text-4xl font-serif italic font-light uppercase tracking-tight">Առանձնահատկություններ</h3>
                                  </div>
                                  <div className="bg-accent/5 border border-accent/10 p-4 md:p-8 rounded-none text-right">
                                    <p className="text-[8px] md:text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-end gap-2">
                                      <TrendingUp className="w-3 h-3" /> ROI
                                    </p>
                                    <p className="text-2xl md:text-4xl font-serif italic font-light text-white">{prop.roi}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                  {prop.features.map((feature: string, i: number) => (
                                    <motion.div 
                                      key={i}
                                      initial={{ opacity: 0, x: 20 }}
                                      whileInView={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.1 }}
                                      className="flex items-center gap-4 bg-white/5 p-4 md:p-6 rounded-none border border-white/5 hover:border-accent/20 transition-all"
                                    >
                                      <div className="w-8 h-8 rounded-none bg-accent/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-accent" />
                                      </div>
                                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/60">{feature}</span>
                                    </motion.div>
                                  ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                  {prop.availability === 'Last Unit' && (
                                    <button 
                                      onClick={() => {
                                        setSelectedProperty(prop);
                                        showToast("Գնման հարցումը ուղարկված է: Մեր մասնագետը կկապնվի ձեզ հետ 5 րոպեի ընթացքում:", "success");
                                      }}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-8 py-5 md:py-6 rounded-none font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 group text-xs animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                    >
                                      Գնել հիմա <Zap className="w-5 h-5 fill-current" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setSelectedProperty(prop)}
                                    className="flex-1 bg-accent hover:bg-accent/80 text-black px-8 py-5 md:py-6 rounded-none font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 group text-xs"
                                  >
                                    Մանրամասներ <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                  </button>
                                  {prop.sourceUrl && (
                                    <a 
                                      href={prop.sourceUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-5 md:py-6 rounded-none font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 group text-xs"
                                    >
                                      Հայտարարություն <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="map"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-12"
                      >
                        <div className="text-center space-y-4">
                          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase italic tracking-tighter">Ինտերակտիվ Քարտեզ</h2>
                          <p className="text-white/40 text-sm sm:text-lg uppercase tracking-widest font-bold">Բոլոր առաջարկները Երևանի քարտեզի վրա</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2">
                            <PropertyMap 
                              properties={filteredProperties} 
                              activeId={activePropId || undefined}
                              onSelect={(id) => setActivePropId(id)}
                            />
                          </div>
                          
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">Ընտրված Օբյեկտ</h3>
                            {activePropId && filteredProperties.find(p => p.id === activePropId) ? (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden"
                              >
                                {filteredProperties.find(p => p.id === activePropId) && (
                                  <>
                                    <img 
                                      src={`https://picsum.photos/seed/${filteredProperties.find(p => p.id === activePropId)?.images[0]}/600/400`} 
                                      className="w-full h-48 object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="p-8 space-y-6">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="text-2xl font-black uppercase italic tracking-tighter">{filteredProperties.find(p => p.id === activePropId)?.name}</h4>
                                          <p className="text-white/60 font-medium flex items-center gap-2 mt-1">
                                            <MapPin className="w-4 h-4" /> {filteredProperties.find(p => p.id === activePropId)?.location}
                                          </p>
                                        </div>
                                        <div className="bg-orange-600/20 border border-orange-600/30 px-3 py-1 rounded-full">
                                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{filteredProperties.find(p => p.id === activePropId)?.availability}</p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-none border border-white/5">
                                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Գին</p>
                                          <p className="text-xl font-serif italic text-white tracking-tighter">{filteredProperties.find(p => p.id === activePropId)?.priceDisplay}</p>
                                        </div>
                                        <div className="bg-accent/5 p-4 rounded-none border border-accent/10">
                                          <p className="text-[8px] font-black text-accent uppercase tracking-widest mb-2">Եկամտաբերություն</p>
                                          <p className="text-xl font-serif italic text-accent tracking-tighter">{filteredProperties.find(p => p.id === activePropId)?.roi} ROI</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-none border border-white/5">
                                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Մակերես</p>
                                          <p className="text-xl font-serif italic text-white tracking-tighter">{filteredProperties.find(p => p.id === activePropId)?.squareFootage} մ²</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-none border border-white/5">
                                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Տարեթիվ</p>
                                          <p className="text-xl font-serif italic text-white tracking-tighter">{filteredProperties.find(p => p.id === activePropId)?.yearBuilt}</p>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="text-white/20 uppercase font-black tracking-widest">AI Համապատասխանություն</span>
                                          <span className="text-accent font-serif italic text-lg">{filteredProperties.find(p => p.id === activePropId)?.matchScore}%</span>
                                        </div>
                                        <div className="w-full h-px bg-white/5 overflow-hidden">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${filteredProperties.find(p => p.id === activePropId)?.matchScore}%` }}
                                            className="h-full bg-accent"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Հիմնական առավելությունները</p>
                                        <div className="flex flex-wrap gap-2">
                                          {filteredProperties.find(p => p.id === activePropId)?.features.slice(0, 4).map((feature: string, i: number) => (
                                            <span key={i} className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-none font-black uppercase tracking-widest text-white/40">
                                              {feature}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex flex-col gap-3">
                                        {filteredProperties.find(p => p.id === activePropId)?.availability === 'Last Unit' && (
                                          <button 
                                            onClick={() => {
                                              const prop = filteredProperties.find(p => p.id === activePropId);
                                              if (prop) {
                                                setSelectedProperty(prop);
                                                showToast("Գնման հարցումը ուղարկված է: Մեր մասնագետը կկապնվի ձեզ հետ 5 րոպեի ընթացքում:", "success");
                                              }
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-none font-black tracking-widest uppercase transition-all flex items-center justify-center gap-3 text-[10px] animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                          >
                                            Գնել հիմա <Zap className="w-4 h-4 fill-current" />
                                          </button>
                                        )}
                                        <div className="flex gap-3">
                                          <button 
                                            onClick={() => setSelectedProperty(filteredProperties.find(p => p.id === activePropId))}
                                            className="flex-1 bg-accent hover:bg-accent/80 text-black py-5 rounded-none font-black tracking-widest uppercase transition-all flex items-center justify-center gap-3 text-[10px]"
                                          >
                                            Մանրամասներ <ArrowRight className="w-4 h-4" />
                                          </button>
                                          {filteredProperties.find(p => p.id === activePropId)?.sourceUrl && (
                                            <a 
                                              href={filteredProperties.find(p => p.id === activePropId)?.sourceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="w-14 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none flex items-center justify-center transition-all"
                                            >
                                              <ExternalLink className="w-5 h-5 text-white/40" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            ) : (
                              <div className="bg-white/5 border border-dashed border-white/10 rounded-[32px] h-[400px] flex flex-col items-center justify-center text-center p-8">
                                <MapIcon className="w-12 h-12 text-white/10 mb-4" />
                                <p className="text-white/30 font-medium">Ընտրեք կետ քարտեզի վրա՝ մանրամասները տեսնելու համար</p>
                              </div>
                            )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>

              {/* Sales Best Practices Section - Market Insights */}
              <section className="bg-[#0a0a0a] py-32 px-8 md:px-16 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
                  <div className="space-y-6">
                    <Star className="w-10 h-10 text-accent" />
                    <h4 className="text-3xl font-serif italic font-light uppercase tracking-tight">Բացառիկություն</h4>
                    <p className="text-white/40 leading-relaxed font-serif italic">Այս օբյեկտները ընտրված են մեր AI-ի կողմից՝ հիմնվելով փակ տվյալների բազաների վրա և դեռ դուրս չեն եկել բաց շուկա:</p>
                  </div>
                  <div className="space-y-6">
                    <TrendingUp className="w-10 h-10 text-accent" />
                    <h4 className="text-3xl font-serif italic font-light uppercase tracking-tight">Ներդրումային պոտենցիալ</h4>
                    <p className="text-white/40 leading-relaxed font-serif italic">Անշարժ գույքի արժեքի միջին աճը տվյալ վայրերում կազմում է տարեկան 15-20% վերջին 3 տարվա ընթացքում:</p>
                  </div>
                  <div className="space-y-6">
                    <ShieldCheck className="w-10 h-10 text-accent" />
                    <h4 className="text-3xl font-serif italic font-light uppercase tracking-tight">Գործարքի երաշխիք</h4>
                    <p className="text-white/40 leading-relaxed font-serif italic">Բոլոր օբյեկտները անցել են GNEL Legal Engine-ի իրավաբանական ստուգումը և պատրաստ են ակնթարթային վերաձևակերպման:</p>
                  </div>
                </div>
              </section>

              {/* Call to Action */}
              <section className="bg-accent py-32 px-8 text-center">
                <div className="max-w-4xl mx-auto space-y-12">
                  <h2 className="text-5xl sm:text-6xl md:text-[8vw] font-serif italic font-light uppercase tracking-tighter leading-tight md:leading-[0.85] text-black">Պատրա՞ստ եք տեսնել <br /> սա իրականում:</h2>
                  <p className="text-xl text-black/60 font-serif italic">Ձեր անհատական մենեջերը արդեն ուսումնասիրել է ձեր հարցումը և պատրաստ է կազմակերպել մասնավոր ցուցադրություն:</p>
                  <button className="bg-black text-white px-16 py-8 rounded-none font-black text-xs tracking-[0.4em] uppercase hover:bg-white hover:text-black transition-all shadow-2xl">
                    Կապվել գործակալի հետ
                  </button>
                </div>
              </section>

              {/* Footer */}
              <footer className="bg-black py-12 px-8 border-t border-white/10 text-center text-white/20 text-[10px] font-bold tracking-[0.3em] uppercase">
                GNEL AI REVENUE OPERATING SYSTEM • 2026
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
