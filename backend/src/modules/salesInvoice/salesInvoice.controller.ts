import { Request, Response } from "express";
import { z } from "zod";
import {
  createAndPostSalesInvoice,
  listSalesInvoices,
  getSalesInvoice,
  getSalesInvoiceOutstandingBalance,
  cancelSalesInvoice,
} from "./salesInvoice.service";

const CreateSalesInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().datetime().or(z.string().date()),
  arAccountCode: z.string().min(1).default("1100"),
  vatPayableAccountCode: z.string().min(1).default("2100"),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        revenueAccountCode: z.string().min(1),
        amount: z.union([z.string(), z.number()]),
        vatRate: z.union([z.string(), z.number()]),
      })
    )
    .min(1),
});

export async function listSalesInvoicesHandler(req: Request, res: Response): Promise<void> {
  const invoices = await listSalesInvoices(req.companyId);
  res.json(invoices);
}

export async function createSalesInvoiceHandler(req: Request, res: Response): Promise<void> {
  const input = CreateSalesInvoiceSchema.parse(req.body);
  const idempotencyKey = (req.header("Idempotency-Key") ?? undefined) as string | undefined;

  const invoice = await createAndPostSalesInvoice(req.companyId, { ...input, idempotencyKey });
  res.status(201).json(invoice);
}

export async function getSalesInvoiceHandler(req: Request, res: Response): Promise<void> {
  const invoice = await getSalesInvoice(req.companyId, req.params.id);
  const outstandingBalance = await getSalesInvoiceOutstandingBalance(req.companyId, req.params.id);
  res.json({ ...invoice, outstandingBalance: outstandingBalance.toFixed(2) });
}

export async function cancelSalesInvoiceHandler(req: Request, res: Response): Promise<void> {
  const invoice = await cancelSalesInvoice(req.companyId, req.params.id);
  res.json(invoice);
}
