import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const AccountSeed = [
  { code: "1000", name: "Cash/Bank", type: "ASSET" as const },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
  { code: "1200", name: "VAT Receivable", type: "ASSET" as const },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
  { code: "2100", name: "VAT Payable", type: "LIABILITY" as const },
  { code: "3000", name: "Retained Earnings", type: "EQUITY" as const },
  { code: "4000", name: "Transport Revenue", type: "REVENUE" as const },
  { code: "5000", name: "General Expense", type: "EXPENSE" as const },
];

const CreateCompanySchema = z.object({
  name: z.string().min(1),
  seedDefaultChartOfAccounts: z.boolean().default(true),
});

export async function listCompanies(_req: Request, res: Response): Promise<void> {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  res.json(companies);
}

export async function getCompany(req: Request, res: Response): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: req.params.companyId } });
  if (!company) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Company not found" } });
    return;
  }
  res.json(company);
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  const input = CreateCompanySchema.parse(req.body);

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({ data: { name: input.name } });

    if (input.seedDefaultChartOfAccounts) {
      await tx.account.createMany({
        data: AccountSeed.map((a) => ({ ...a, companyId: created.id })),
      });
    }

    return created;
  });

  res.status(201).json(company);
}
