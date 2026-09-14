import { Request, Response } from "express";
import { z } from "zod";
import { createAndAllocatePayment, listPayments } from "./payment.service";

const CreatePaymentSchema = z.object({
  supplierId: z.string().uuid(),
  paymentDate: z.string().datetime().or(z.string().date()),
  amount: z.union([z.string(), z.number()]),
  bankAccountCode: z.string().min(1).default("1000"),
  apAccountCode: z.string().min(1).default("2000"),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().uuid(),
        allocatedAmount: z.union([z.string(), z.number()]),
      })
    )
    .min(1),
});

export async function listPaymentsHandler(req: Request, res: Response): Promise<void> {
  const payments = await listPayments(req.companyId);
  res.json(payments);
}

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const input = CreatePaymentSchema.parse(req.body);
  const idempotencyKey = (req.header("Idempotency-Key") ?? undefined) as string | undefined;

  const payment = await createAndAllocatePayment(req.companyId, { ...input, idempotencyKey });
  res.status(201).json(payment);
}
