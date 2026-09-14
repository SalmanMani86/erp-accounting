import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { sum } from "../../accounting-engine/money";

const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

export async function listSuppliers(req: Request, res: Response): Promise<void> {
  const suppliers = await prisma.supplier.findMany({
    where: { companyId: req.companyId },
    orderBy: { createdAt: "desc" },
  });
  res.json(suppliers);
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
  const input = CreateSupplierSchema.parse(req.body);
  const supplier = await prisma.supplier.create({ data: { companyId: req.companyId, ...input } });
  res.status(201).json(supplier);
}

export async function getSupplier(req: Request, res: Response): Promise<void> {
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
  if (!supplier) throw new NotFoundError("Supplier");

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { supplierId: supplier.id, companyId: req.companyId, status: "POSTED" },
    include: { allocations: { where: { payment: { status: "POSTED" } } } },
  });

  const outstandingBalance = sum(
    invoices.map((inv) => inv.totalAmount.minus(sum(inv.allocations.map((a) => a.allocatedAmount))))
  );

  res.json({ ...supplier, outstandingBalance: outstandingBalance.toFixed(2) });
}
