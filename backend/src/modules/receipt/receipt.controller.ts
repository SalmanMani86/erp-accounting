import { Request, Response } from "express";
import { z } from "zod";
import { createAndAllocateReceipt, listReceipts } from "./receipt.service";

const CreateReceiptSchema = z.object({
  customerId: z.string().uuid(),
  receiptDate: z.string().datetime().or(z.string().date()),
  amount: z.union([z.string(), z.number()]),
  bankAccountCode: z.string().min(1).default("1000"),
  arAccountCode: z.string().min(1).default("1100"),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().uuid(),
        allocatedAmount: z.union([z.string(), z.number()]),
      })
    )
    .min(1),
});

export async function listReceiptsHandler(req: Request, res: Response): Promise<void> {
  const receipts = await listReceipts(req.companyId);
  res.json(receipts);
}

export async function createReceiptHandler(req: Request, res: Response): Promise<void> {
  const input = CreateReceiptSchema.parse(req.body);
  const idempotencyKey = (req.header("Idempotency-Key") ?? undefined) as string | undefined;

  const receipt = await createAndAllocateReceipt(req.companyId, { ...input, idempotencyKey });
  res.status(201).json(receipt);
}
