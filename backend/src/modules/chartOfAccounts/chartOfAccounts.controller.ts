import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const CreateAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export async function listAccounts(req: Request, res: Response): Promise<void> {
  const accounts = await prisma.account.findMany({
    where: { companyId: req.companyId },
    orderBy: { code: "asc" },
  });
  res.json(accounts);
}

export async function createAccount(req: Request, res: Response): Promise<void> {
  const input = CreateAccountSchema.parse(req.body);
  const account = await prisma.account.create({
    data: { companyId: req.companyId, ...input },
  });
  res.status(201).json(account);
}
