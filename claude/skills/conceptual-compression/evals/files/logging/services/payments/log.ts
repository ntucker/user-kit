import { logger } from '@acme/logger';

export function chargeLogger(requestId: string) {
  return logger.child({ requestId, service: 'payments' });
}

export function logCharge(log: ReturnType<typeof chargeLogger>, charge: Charge) {
  log.info({
    event: 'charge.created',
    charge_id: charge.id,
    amount_cents: charge.amountCents,
    currency: charge.currency,
    card_last4: charge.card.last4,
  });
}

export function logChargeFailed(log: ReturnType<typeof chargeLogger>, charge: Charge, err: Error) {
  log.error({ event: 'charge.failed', charge_id: charge.id, reason: err.name });
}
