import { db } from "../db";
import { kpiCategories, kpiFormulas, customFields } from "@shared/schema/kpi-configuration";

async function createInitialData() {
  console.log("Starting KPI data seeding...");
  
  // Define categories
  const categories = [
    {
      id: "sales",
      name: "Sales Metrics",
      description: "Key metrics for tracking sales performance and outcomes",
    },
    {
      id: "marketing",
      name: "Marketing Metrics",
      description: "Metrics for tracking marketing effectiveness and lead generation",
    },
    {
      id: "setter",
      name: "Setter Metrics",
      description: "Metrics for tracking appointment setter performance",
    },
    {
      id: "admin",
      name: "Admin Metrics",
      description: "Administrative and operational metrics",
    },
    {
      id: "compliance",
      name: "Compliance Metrics",
      description: "Metrics for tracking regulatory compliance and risk management",
    },
    {
      id: "attribution",
      name: "Attribution Metrics",
      description: "Metrics for tracking touchpoint attribution and funnel analysis",
    },
  ];
  
  // Insert categories
  for (const category of categories) {
    try {
      // Check if category exists
      const existingCategory = await db.query.kpiCategories.findFirst({
        where: (c, { eq }) => eq(c.id, category.id),
      });
      
      if (!existingCategory) {
        await db.insert(kpiCategories).values(category);
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    } catch (error) {
      console.error(`Error creating category ${category.name}:`, error);
    }
  }
  
  // Define formulas for each category
  const formulas = [
    // Sales metrics
    {
      id: "closed_deals",
      name: "Closed Deals",
      description: "Total number of deals that were closed-won",
      formula: "COUNT(deals.status = 'won')",
      enabled: true,
      customizable: true,
      category: "sales",
      source: "close",
      requiredFields: ["deal_status"],
      categoryId: "sales",
    },
    {
      id: "closing_rate",
      name: "Closing Rate",
      description: "Percentage of deals that were closed-won out of all closed deals",
      formula: "(COUNT(deals.status = 'won') / COUNT(deals.status IN ('won', 'lost'))) * 100",
      enabled: true,
      customizable: true,
      category: "sales",
      source: "close",
      requiredFields: ["deal_status"],
      categoryId: "sales",
    },
    {
      id: "avg_deal_value",
      name: "Average Deal Value",
      description: "Average value of closed-won deals",
      formula: "SUM(deals.value WHERE deals.status = 'won') / COUNT(deals.status = 'won')",
      enabled: true,
      customizable: true,
      category: "sales",
      source: "close",
      requiredFields: ["deal_status", "deal_value"],
      categoryId: "sales",
    },
    
    // Marketing metrics
    {
      id: "lead_conversion_rate",
      name: "Lead Conversion Rate",
      description: "Percentage of leads that converted to opportunities",
      formula: "(COUNT(contacts.status = 'opportunity') / COUNT(contacts)) * 100",
      enabled: true,
      customizable: true,
      category: "marketing",
      source: "calculated",
      requiredFields: ["contact_status"],
      categoryId: "marketing",
    },
    {
      id: "cost_per_lead",
      name: "Cost Per Lead",
      description: "Average cost to acquire a new lead",
      formula: "SUM(marketing_spend) / COUNT(new_contacts)",
      enabled: true,
      customizable: true,
      category: "marketing",
      source: "calculated",
      requiredFields: ["marketing_spend", "contact_created_date"],
      categoryId: "marketing",
    },
    
    // Setter metrics
    {
      id: "meeting_show_rate",
      name: "Meeting Show Rate",
      description: "Percentage of scheduled meetings that were attended",
      formula: "(COUNT(meetings.status = 'completed') / COUNT(meetings)) * 100",
      enabled: true,
      customizable: true,
      category: "setter",
      source: "calendly",
      requiredFields: ["meeting_status"],
      categoryId: "setter",
    },
    {
      id: "meetings_per_day",
      name: "Meetings Per Day",
      description: "Average number of meetings scheduled per working day",
      formula: "COUNT(meetings) / COUNT(working_days)",
      enabled: true,
      customizable: true,
      category: "setter",
      source: "calendly",
      requiredFields: ["meeting_date", "working_days"],
      categoryId: "setter",
    },
    
    // Attribution metrics
    {
      id: "first_touch_attribution",
      name: "First Touch Attribution",
      description: "Attribution based on the first touchpoint with a contact",
      formula: "ATTRIBUTION_MODEL('first_touch')",
      enabled: true,
      customizable: true,
      category: "attribution",
      source: "calculated",
      requiredFields: ["contact_touchpoints"],
      categoryId: "attribution",
    },
    {
      id: "multi_touch_attribution",
      name: "Multi-Touch Attribution",
      description: "Attribution distributed across all touchpoints with a contact",
      formula: "ATTRIBUTION_MODEL('multi_touch')",
      enabled: true,
      customizable: true,
      category: "attribution",
      source: "calculated",
      requiredFields: ["contact_touchpoints"],
      categoryId: "attribution",
    },
  ];
  
  // Insert formulas
  for (const formula of formulas) {
    try {
      // Check if formula exists
      const existingFormula = await db.query.kpiFormulas.findFirst({
        where: (f, { eq }) => eq(f.id, formula.id),
      });
      
      if (!existingFormula) {
        await db.insert(kpiFormulas).values(formula);
        console.log(`Created formula: ${formula.name}`);
      } else {
        console.log(`Formula already exists: ${formula.name}`);
      }
    } catch (error) {
      console.error(`Error creating formula ${formula.name}:`, error);
    }
  }
  
  // Define some standard custom fields
  const fields = [
    {
      name: "Deal Source",
      fieldType: "select",
      source: "close",
      path: "custom.deal_source",
      description: "The source of the deal (how the lead was acquired)",
      options: ["Website", "Referral", "Outbound", "Event", "Social Media", "Partner"],
    },
    {
      name: "Meeting Type",
      fieldType: "select",
      source: "calendly",
      path: "event_type.name",
      description: "The type of meeting scheduled with the contact",
      options: ["Initial Consultation", "Demo", "Follow-up", "Strategy Session", "Onboarding"],
    },
    {
      name: "Last Activity Date",
      fieldType: "date",
      source: "calculated",
      description: "Date of the last activity or meeting with the contact",
    },
    {
      name: "Touchpoint Count",
      fieldType: "number",
      source: "calculated",
      description: "Total number of touchpoints with the contact across all channels",
    },
  ];
  
  // Insert custom fields
  for (const field of fields) {
    try {
      // Check if field exists by name and source
      const existingField = await db.query.customFields.findFirst({
        where: (f, { eq, and }) => and(
          eq(f.name, field.name),
          eq(f.source, field.source)
        ),
      });
      
      if (!existingField) {
        await db.insert(customFields).values(field);
        console.log(`Created custom field: ${field.name}`);
      } else {
        console.log(`Custom field already exists: ${field.name}`);
      }
    } catch (error) {
      console.error(`Error creating custom field ${field.name}:`, error);
    }
  }
  
  console.log("KPI data seeding completed");
}

// Run the seeding function
createInitialData()
  .then(() => {
    console.log("Seed script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });