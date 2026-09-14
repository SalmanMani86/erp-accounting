import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { sum } from "../../accounting-engine/money";

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const customers = await prisma.customer.findMany({
    where: { companyId: req.companyId },
    orderBy: { createdAt: "desc" },
  });
  res.json(customers);
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const input = CreateCustomerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data: { companyId: req.companyId, ...input } });
  res.status(201).json(customer);
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
  if (!customer) throw new NotFoundError("Customer");

  const invoices = await prisma.salesInvoice.findMany({
    where: { customerId: customer.id, companyId: req.companyId, status: "POSTED" },
    include: { allocations: { where: { receipt: { status: "POSTED" } } } },
  });

  const outstandingBalance = sum(
    invoices.map((inv) => inv.totalAmount.minus(sum(inv.allocations.map((a) => a.allocatedAmount))))
  );

  res.json({ ...customer, outstandingBalance: outstandingBalance.toFixed(2) });
}
