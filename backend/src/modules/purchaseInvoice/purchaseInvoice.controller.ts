import { Request, Response } from "express";
import { z } from "zod";
import {
  createAndPostPurchaseInvoice,
  listPurchaseInvoices,
  getPurchaseInvoice,
  getPurchaseInvoiceOutstandingBalance,
  cancelPurchaseInvoice,
} from "./purchaseInvoice.service";

const CreatePurchaseInvoiceSchema = z.object({
  supplierId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().datetime().or(z.string().date()),
  apAccountCode: z.string().min(1).default("2000"),
  vatReceivableAccountCode: z.string().min(1).default("1200"),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        expenseAccountCode: z.string().min(1),
        amount: z.union([z.string(), z.number()]),
        vatRate: z.union([z.string(), z.number()]),
      })
    )
    .min(1),
});

export async function listPurchaseInvoicesHandler(req: Request, res: Response): Promise<void> {
  const invoices = await listPurchaseInvoices(req.companyId);
  res.json(invoices);
}

export async function createPurchaseInvoiceHandler(req: Request, res: Response): Promise<void> {
  const input = CreatePurchaseInvoiceSchema.parse(req.body);
  const idempotencyKey = (req.header("Idempotency-Key") ?? undefined) as string | undefined;

  const invoice = await createAndPostPurchaseInvoice(req.companyId, { ...input, idempotencyKey });
  res.status(201).json(invoice);
}

export async function getPurchaseInvoiceHandler(req: Request, res: Response): Promise<void> {
  const invoice = await getPurchaseInvoice(req.companyId, req.params.id);
  const outstandingBalance = await getPurchaseInvoiceOutstandingBalance(req.companyId, req.params.id);
  res.json({ ...invoice, outstandingBalance: outstandingBalance.toFixed(2) });
}

export async function cancelPurchaseInvoiceHandler(req: Request, res: Response): Promise<void> {
  const invoice = await cancelPurchaseInvoice(req.companyId, req.params.id);
  res.json(invoice);
}
