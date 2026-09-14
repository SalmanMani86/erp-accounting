import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function recordAuditLog(
  tx: TxClient,
  params: {
    companyId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: unknown;
    afterState?: unknown;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      companyId: params.companyId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState === undefined ? Prisma.JsonNull : (params.beforeState as Prisma.InputJsonValue),
      afterState: params.afterState === undefined ? Prisma.JsonNull : (params.afterState as Prisma.InputJsonValue),
    },
  });
}
