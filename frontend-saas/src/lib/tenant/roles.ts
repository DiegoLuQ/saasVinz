/**
 * Dueño del crematorio = admin del tenant (o creator). Solo el dueño ve lo
 * comercial: suscripción, renovación, plan, pagos, límites para ampliar, demo
 * y el tema global. Espejo de `backend/app/api/internal/common/notifications/audience.py`.
 */
export const OWNER_ROLES = ['admin', 'creator'];

export const isOwnerRole = (role?: string | null) => !!role && OWNER_ROLES.includes(role);
