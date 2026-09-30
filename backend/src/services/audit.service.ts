import prisma from '../config/prisma';

export type AuditAction =
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'PRICE_CHANGED'
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'CATEGORY_DELETED'
  | 'STOCK_ADJUSTED'
  | 'SALE_CREATED' | 'SALE_REFUNDED' | 'SALE_CANCELLED'
  | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' | 'CUSTOMER_DELETED'
  | 'SUPPLIER_CREATED' | 'SUPPLIER_UPDATED' | 'SUPPLIER_DELETED'
  | 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'PASSWORD_CHANGED'
  | 'BUSINESS_UPDATED'
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED';

interface AuditContext {
  businessId: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const auditService = {
  async log(ctx: AuditContext): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          businessId: ctx.businessId,
          userId: ctx.userId || null,
          action: ctx.action,
          entity: ctx.entity,
          entityId: ctx.entityId || null,
          oldValue: ctx.oldValue ? JSON.stringify(ctx.oldValue) : null,
          newValue: ctx.newValue ? JSON.stringify(ctx.newValue) : null,
          ipAddress: ctx.ipAddress || null,
          userAgent: ctx.userAgent || null,
        },
      });
    } catch (err) {
      // Audit logging should NEVER crash the main request
      console.warn('Audit log failed:', err);
    }
  },
};
