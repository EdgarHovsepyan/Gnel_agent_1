import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for production-grade simulation
  let leads: any[] = [];
  let deals: any[] = [];
  let interactions: any[] = [];

  // RevOS API Layer (v1)
  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0", environment: process.env.NODE_ENV || "development" });
  });

  // Lead Management
  apiRouter.get("/leads", (req, res) => {
    res.json(leads);
  });

  apiRouter.post("/leads", (req, res) => {
    const lead = {
      ...req.body,
      id: req.body.id || `lead_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    leads.push(lead);
    
    // If lead is HOT, simulate a potential deal for analytics
    if (lead.status === 'HOT') {
      // 20% chance of immediate deal simulation for demo revenue
      if (Math.random() > 0.8) {
        deals.push({
          id: `deal_${Date.now()}`,
          leadId: lead.id,
          revenueAmount: parseInt(lead.budget?.replace(/[^0-9]/g, '') || '100000') * 0.03, // 3% commission
          aiInfluenced: true,
          closedAt: new Date().toISOString()
        });
      }
    }
    
    res.status(201).json(lead);
  });

  // Messaging & Interactions
  apiRouter.get("/interactions", (req, res) => {
    res.json(interactions);
  });

  apiRouter.post("/interactions", (req, res) => {
    const interaction = {
      ...req.body,
      id: `int_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    interactions.push(interaction);
    res.status(201).json(interaction);
  });

  apiRouter.get("/messages/queue", (req, res) => {
    // Simulate a queue based on active nurturing sequences
    const queue = leads
      .filter(l => l.nurturingSequence)
      .flatMap(l => l.nurturingSequence.messages.map((m: any) => ({
        ...m,
        leadId: l.id,
        leadName: l.name,
        status: 'pending'
      })));
    res.json(queue);
  });

  // Revenue Attribution & Analytics
  apiRouter.get("/analytics/revenue", (req, res) => {
    const totalRevenue = deals.reduce((sum, d) => sum + d.revenueAmount, 0) || 1250000;
    const aiInfluencedRevenue = deals.filter(d => d.aiInfluenced).reduce((sum, d) => sum + d.revenueAmount, 0) || 850000;
    
    const hotLeads = leads.filter(l => l.status === 'HOT').length;
    const totalLeads = leads.length || 100;

    // Attribution by source
    const attribution = leads.reduce((acc: any, lead) => {
      const source = lead.attributionSource || 'Organic';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalRevenue,
      aiInfluencedRevenue,
      aiInfluencePercentage: totalRevenue > 0 ? Math.round((aiInfluencedRevenue / totalRevenue) * 100) : 68,
      leadToMeetingConversion: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 24.5,
      meetingToDealConversion: hotLeads > 0 ? Math.round((deals.length / hotLeads) * 100) : 12.8,
      timeToFirstResponseMins: 4.2,
      attribution: Object.entries(attribution).map(([name, value]) => ({ name, value }))
    });
  });

  apiRouter.get("/market/intelligence", (req, res) => {
    res.json({
      averagePricePerSqm: 1850,
      priceTrend: '+12.4%',
      demandHeatmap: [
        { area: 'Kentron', demand: 95, supply: 40 },
        { area: 'Arabkir', demand: 82, supply: 65 },
        { area: 'Davtashen', demand: 70, supply: 85 },
        { area: 'Nor Nork', demand: 45, supply: 90 }
      ],
      competitorActivity: [
        { name: 'Red Group', share: 15, growth: '+2%' },
        { name: 'Elite Realty', share: 12, growth: '-1%' },
        { name: 'GNEL Elite', share: 8, growth: '+24%' }
      ]
    });
  });

  app.use("/api/v1", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RevOS Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start RevOS Server:", err);
  process.exit(1);
});
