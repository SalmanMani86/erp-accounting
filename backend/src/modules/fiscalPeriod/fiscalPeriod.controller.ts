import { Request, Response } from "express";
import { z } from "zod";
import { listFiscalPeriods, createFiscalPeriod, closeFiscalPeriod } from "./fiscalPeriod.service";

const CreateFiscalPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function listFiscalPeriodsHandler(req: Request, res: Response): Promise<void> {
  const periods = await listFiscalPeriods(req.companyId);
  res.json(periods);
}

export async function createFiscalPeriodHandler(req: Request, res: Response): Promise<void> {
  const input = CreateFiscalPeriodSchema.parse(req.body);
  const period = await createFiscalPeriod(req.companyId, input);
  res.status(201).json(period);
}

export async function closeFiscalPeriodHandler(req: Request, res: Response): Promise<void> {
  const period = await closeFiscalPeriod(req.companyId, req.params.id);
  res.json(period);
}
