import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash/Bank", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "1200", name: "VAT Receivable", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "VAT Payable", type: "LIABILITY" },
  { code: "3000", name: "Retained Earnings", type: "EQUITY" },
  { code: "4000", name: "Transport Revenue", type: "REVENUE" },
  { code: "5000", name: "General Expense", type: "EXPENSE" },
];

async function seedCompany(name: string) {
  const company = await prisma.company.create({ data: { name } });

  await prisma.account.createMany({
    data: STANDARD_ACCOUNTS.map((a) => ({ ...a, companyId: company.id })),
  });

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fiscalPeriod = await prisma.fiscalPeriod.create({
    data: {
      companyId: company.id,
      name: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      startDate,
      endDate,
      status: "OPEN",
    },
  });

  const customer = await prisma.customer.create({
    data: { companyId: company.id, name: "Acme Logistics Customer", email: "billing@acme-customer.test" },
  });

  const supplier = await prisma.supplier.create({
    data: { companyId: company.id, name: "Fleet Parts Supplier Co.", email: "ap@fleetparts.test" },
  });

  console.log(`Seeded company "${company.name}" (${company.id})`);
  console.log(`  Fiscal period: ${fiscalPeriod.name} (${fiscalPeriod.id})`);
  console.log(`  Customer: ${customer.name} (${customer.id})`);
  console.log(`  Supplier: ${supplier.name} (${supplier.id})`);

  return { company, fiscalPeriod, customer, supplier };
}

async function main() {
  await seedCompany("Demo Transport Co.");
  await seedCompany("Other Company Ltd.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
