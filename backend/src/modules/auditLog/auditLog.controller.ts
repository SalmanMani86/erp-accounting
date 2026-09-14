import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const { entityType, entityId } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: {
      companyId: req.companyId,
      ...(typeof entityType === "string" ? { entityType } : {}),
      ...(typeof entityId === "string" ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(logs);
}
