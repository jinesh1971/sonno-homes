import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Sonno Homes",
      email: "info@sonnohomes.com",
      country: "Italy",
      managementFee: 0.20,
    },
  });

  // 2. Admin users
  const admin = await prisma.user.upsert({
    where: { clerkId: "clerk_admin_001" },
    update: {},
    create: {
      id: "a0000000-0000-0000-0000-000000000001",
      orgId: org.id,
      clerkId: "clerk_admin_001",
      email: "eric@sonnohomes.com",
      role: "admin",
      firstName: "Eric",
      lastName: "Admin",
    },
  });

  await prisma.user.upsert({
    where: { clerkId: "clerk_admin_002" },
    update: {},
    create: {
      id: "a0000000-0000-0000-0000-000000000002",
      orgId: org.id,
      clerkId: "clerk_admin_002",
      email: "jineshrocks1999@gmail.com",
      role: "admin",
      firstName: "Jinesh",
      lastName: "Admin",
    },
  });

  await prisma.user.upsert({
    where: { clerkId: "clerk_admin_003" },
    update: {},
    create: {
      id: "a0000000-0000-0000-0000-000000000003",
      orgId: org.id,
      clerkId: "clerk_admin_003",
      email: "eklein@sonnohomes.com",
      role: "admin",
      firstName: "Eric",
      lastName: "Klein",
    },
  });

  // 3. Properties
  const propertyData = [
    { id: "10000000-0000-0000-0000-000000000001", name: "Villa Serena", propertyType: "Villa", location: "Amalfi Coast, Campania", region: "Campania", bedrooms: 4, contractYears: 5, monthlyYield: 1.9, propertyValue: 450000, status: "active" as const, acquisitionDate: new Date("2022-03-01") },
    { id: "10000000-0000-0000-0000-000000000002", name: "Casa del Sole", propertyType: "Lakehouse", location: "Lake Como, Lombardy", region: "Lombardy", bedrooms: 3, contractYears: 5, monthlyYield: 1.7, propertyValue: 380000, status: "active" as const, acquisitionDate: new Date("2022-06-01") },
    { id: "10000000-0000-0000-0000-000000000003", name: "Palazzo Azzurro", propertyType: "Apartment", location: "Florence, Tuscany", region: "Tuscany", bedrooms: 2, contractYears: 5, monthlyYield: 1.5, propertyValue: 320000, status: "active" as const, acquisitionDate: new Date("2022-01-01") },
    { id: "10000000-0000-0000-0000-000000000004", name: "Trullo Bianco", propertyType: "Trullo", location: "Alberobello, Puglia", region: "Puglia", bedrooms: 2, contractYears: 5, monthlyYield: 2.1, propertyValue: 180000, status: "active" as const, acquisitionDate: new Date("2022-09-01") },
    { id: "10000000-0000-0000-0000-000000000005", name: "Masseria Oliveto", propertyType: "Farmhouse", location: "Ostuni, Puglia", region: "Puglia", bedrooms: 6, contractYears: 5, monthlyYield: 1.4, propertyValue: 620000, status: "active" as const, acquisitionDate: new Date("2023-01-01") },
  ];

  const properties = [];
  for (const p of propertyData) {
    const prop = await prisma.property.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, orgId: org.id },
    });
    properties.push(prop);
  }

  // 4. Investors
  const investorData = [
    { id: "20000000-0000-0000-0000-000000000001", clerkId: "clerk_inv_001", email: "m.bianchi@email.com", firstName: "Marco", lastName: "Bianchi", phone: "+39 333 123 4567", profile: { occupation: "Architect", city: "Rome", country: "Italy", futureCommitment: true } },
    { id: "20000000-0000-0000-0000-000000000002", clerkId: "clerk_inv_002", email: "s.rossi@email.com", firstName: "Sofia", lastName: "Rossi", phone: "+39 340 987 6543", profile: { occupation: "Doctor", city: "Milan", country: "Italy", futureCommitment: true } },
    { id: "20000000-0000-0000-0000-000000000003", clerkId: "clerk_inv_003", email: "j.smith@email.com", firstName: "James", lastName: "Smith", phone: "+1 212 555 0123", profile: { occupation: "Banker", city: "New York", country: "USA", futureCommitment: false } },
    { id: "20000000-0000-0000-0000-000000000004", clerkId: "clerk_inv_004", email: "e.dubois@email.com", firstName: "Elena", lastName: "Dubois", phone: "+33 6 12 34 56 78", profile: { occupation: "Marketing Director", city: "Paris", country: "France", futureCommitment: true } },
    { id: "20000000-0000-0000-0000-000000000005", clerkId: "clerk_inv_005", email: "a.conti@email.com", firstName: "Alessandro", lastName: "Conti", phone: "+39 348 555 7890", profile: { occupation: "Restaurateur", city: "Naples", country: "Italy", futureCommitment: true } },
  ];

  const investors = [];
  for (const inv of investorData) {
    const { profile, ...userData } = inv;
    const user = await prisma.user.upsert({
      where: { clerkId: inv.clerkId },
      update: {},
      create: { ...userData, orgId: org.id, role: "investor" },
    });
    await prisma.investorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...profile },
    });
    investors.push(user);
  }

  // 5. Investments (mapping investors to properties)
  const investmentMap = [
    { investorIdx: 0, propertyIdx: 0, amount: 45000 },
    { investorIdx: 0, propertyIdx: 2, amount: 30000 },
    { investorIdx: 1, propertyIdx: 1, amount: 35000 },
    { investorIdx: 1, propertyIdx: 4, amount: 25000 },
    { investorIdx: 2, propertyIdx: 0, amount: 50000 },
    { investorIdx: 2, propertyIdx: 3, amount: 20000 },
    { investorIdx: 3, propertyIdx: 1, amount: 40000 },
    { investorIdx: 3, propertyIdx: 2, amount: 15000 },
    { investorIdx: 4, propertyIdx: 3, amount: 25000 },
    { investorIdx: 4, propertyIdx: 4, amount: 35000 },
  ];

  for (const im of investmentMap) {
    const investorId = investors[im.investorIdx].id;
    const propertyId = properties[im.propertyIdx].id;
    await prisma.investment.upsert({
      where: { uq_investment: { investorId, propertyId } },
      update: {},
      create: {
        investorId,
        propertyId,
        amount: im.amount,
        equityShare: (im.amount / Number(properties[im.propertyIdx].propertyValue || 1)) * 100,
        startDate: properties[im.propertyIdx].acquisitionDate || new Date(),
        status: "active",
      },
    });
  }

  // 6. Sample performance report (published)
  const report = await prisma.performanceReport.upsert({
    where: { uq_report_property_period: { propertyId: properties[0].id, periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-01-31") } },
    update: {},
    create: {
      propertyId: properties[0].id,
      createdBy: admin.id,
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      nightsBooked: 25,
      nightsAvailable: 31,
      grossRevenue: 8500,
      totalExpenses: 2800,
      managementFee: 1140,
      status: "published",
      publishedAt: new Date("2025-02-05"),
    },
  });

  // Expenses for the report
  const expenseCategories = [
    { category: "Cleaning", amount: 800 },
    { category: "Utilities", amount: 450 },
    { category: "Maintenance", amount: 350 },
    { category: "Platform Fees", amount: 680 },
    { category: "Insurance", amount: 520 },
  ];

  for (let i = 0; i < expenseCategories.length; i++) {
    await prisma.reportExpense.create({
      data: { reportId: report.id, ...expenseCategories[i], sortOrder: i },
    });
  }

  // 7. Sample offerings
  const offeringData = [
    { id: "30000000-0000-0000-0000-000000000001", propertyId: properties[0].id, title: "Villa Serena Investment Package", description: "Invest in a stunning 4-bedroom villa on the Amalfi Coast. Prime short-term rental location with consistent high-season demand and year-round tourism appeal.", minimumInvestment: 25000, targetRaise: 200000, projectedReturn: 8.5, status: "open" as const },
    { id: "30000000-0000-0000-0000-000000000002", propertyId: properties[1].id, title: "Lake Como Lakehouse Opportunity", description: "Beautiful lakehouse property on Lake Como with breathtaking views. Strong rental performance driven by luxury tourism market.", minimumInvestment: 20000, targetRaise: 150000, projectedReturn: 7.8, status: "open" as const },
    { id: "30000000-0000-0000-0000-000000000003", propertyId: properties[3].id, title: "Trullo Bianco — Puglia Heritage", description: "Unique trullo property in Alberobello, a UNESCO World Heritage site. High demand from cultural tourism and growing Puglia market.", minimumInvestment: 15000, targetRaise: 100000, projectedReturn: 9.2, status: "funded" as const },
  ];

  for (const o of offeringData) {
    await prisma.offering.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, orgId: org.id },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Organization: ${org.name}`);
  console.log(`   Properties: ${properties.length}`);
  console.log(`   Investors: ${investors.length}`);
  console.log(`   Investments: ${investmentMap.length}`);
  console.log(`   Reports: 1 (published)`);
  console.log(`   Offerings: ${offeringData.length}`);

  // 8. Fund — Italian Coastal Collection
  const fund = await prisma.fund.upsert({
    where: { id: "40000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "40000000-0000-0000-0000-000000000001",
      orgId: org.id,
      name: "Italian Coastal Collection Q1 2025",
      description: "A diversified fund combining three premium Italian coastal and lakeside properties. This fund offers investors exposure to high-demand short-term rental markets across Campania, Lombardy, and Puglia with professional management and quarterly reporting.",
      quarterYear: 2025,
      quarterNumber: 1,
      targetRaise: 500000,
      minimumInvestment: 50000,
      projectedReturn: 8.2,
      imageUrls: [],
      status: "open",
    },
  });

  // Fund properties — Villa Serena, Casa del Sole, Trullo Bianco
  const fundPropertyIds = [properties[0].id, properties[1].id, properties[3].id];
  for (const propId of fundPropertyIds) {
    await prisma.fundProperty.upsert({
      where: { uq_fund_property: { fundId: fund.id, propertyId: propId } },
      update: {},
      create: { fundId: fund.id, propertyId: propId },
    });
  }

  // Fund investments — Marco Bianchi and Sofia Rossi
  const fundInvestmentData = [
    { id: "50000000-0000-0000-0000-000000000001", investorIdx: 0, amount: 75000 },
    { id: "50000000-0000-0000-0000-000000000002", investorIdx: 1, amount: 100000 },
  ];
  for (const fi of fundInvestmentData) {
    await prisma.fundInvestment.upsert({
      where: { uq_fund_investment: { fundId: fund.id, investorId: investors[fi.investorIdx].id } },
      update: {},
      create: {
        id: fi.id,
        fundId: fund.id,
        investorId: investors[fi.investorIdx].id,
        amount: fi.amount,
        startDate: new Date("2025-01-15"),
        status: "active",
      },
    });
  }

  // Fund report — Q1 2025 (published)
  const fundReport = await prisma.fundReport.upsert({
    where: { uq_fund_report_quarter: { fundId: fund.id, quarterYear: 2025, quarterNumber: 1 } },
    update: {},
    create: {
      fundId: fund.id,
      createdBy: admin.id,
      quarterYear: 2025,
      quarterNumber: 1,
      status: "published",
      publishedAt: new Date("2025-04-10"),
      notes: "Strong Q1 performance across all three properties.",
    },
  });

  // Fund offering
  await prisma.offering.upsert({
    where: { id: "30000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000004",
      orgId: org.id,
      fundId: fund.id,
      propertyId: null,
      title: "Italian Coastal Collection — Fund Investment",
      description: "Invest in a diversified portfolio of three premium Italian properties. Quarterly distributions, professional management, and transparent reporting.",
      minimumInvestment: 50000,
      targetRaise: 500000,
      projectedReturn: 8.2,
      status: "open",
    },
  });

  // Fund distributions — Q1 2025 for both investors
  const totalFundInvested = 175000;
  const netProfit = 12000; // sample net profit for Q1
  for (const fi of fundInvestmentData) {
    const equityShare = fi.amount / totalFundInvested;
    const distAmount = Math.round(netProfit * equityShare);
    await prisma.distribution.create({
      data: {
        fundInvestmentId: fi.id,
        investmentId: null,
        amount: distAmount,
        distType: "quarterly",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-03-31"),
        status: "paid",
        paidAt: new Date("2025-04-15"),
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Organization: ${org.name}`);
  console.log(`   Properties: ${properties.length}`);
  console.log(`   Investors: ${investors.length}`);
  console.log(`   Investments: ${investmentMap.length}`);
  console.log(`   Reports: 1 (published)`);
  console.log(`   Offerings: ${offeringData.length + 1} (incl. fund offering)`);
  console.log(`   Fund: ${fund.name}`);
  console.log(`   Fund Investments: ${fundInvestmentData.length}`);
  console.log(`   Fund Report: 1 (published)`);
  console.log(`   Fund Distributions: ${fundInvestmentData.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
