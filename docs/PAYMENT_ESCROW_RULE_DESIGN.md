# Law119 Payment / Escrow Rule Design (MVP Rules First)

## Positioning
- Law119 is a legal-service matching platform, not a law firm.
- Quote selection does not equal final engagement.
- Payment/escrow should only be available after `EngagementConfirmation` becomes `ACTIVE`.

## Core Objectives
1. Reduce payment disputes and off-platform transactions.
2. Keep role/fee/service boundary traceable.
3. Support legal-service fee complexity (consultation / staged / hourly / representation).
4. Preserve audit trail for platform moderation and dispute handling.

## Payment States (Recommended)
- `UNPAID`
- `PENDING_PAYMENT`
- `PAID_HELD` (escrow-held / platform pending release)
- `PARTIALLY_RELEASED`
- `RELEASED`
- `REFUND_PENDING`
- `REFUNDED`
- `CHARGEBACK_REVIEW`
- `CANCELED`

## Escrow Scope (MVP)
- Allowed:
  - Consultation fixed fee
  - Stage-based milestone fee
- Not recommended in MVP:
  - Open-ended hourly billing automation
  - Trust-account-like handling without legal review

## Preconditions Before Payment
1. EngagementConfirmation status = `ACTIVE`
2. Service scope summary confirmed by both sides
3. Fee mode + price range/amount confirmed
4. Conflict check acknowledged by attorney (if applicable)
5. Platform disclaimers acknowledged

## Milestone Rules (Staged Fees)
- Each milestone requires:
  - title
  - amount
  - deliverable description
  - target date (optional)
  - acceptance rule (client confirms / auto-release after X days unless dispute)
- Platform should block milestone release when dispute ticket is `OPEN/UNDER_REVIEW/WAITING_PARTY`.

## Release Rules
- Consultation fee:
  - release after session completed + no dispute within grace window (e.g. 24h)
- Stage fee:
  - release after client confirms deliverable
  - optional auto-release after 72h if no response and no dispute
- Manual admin hold allowed on reports/disputes/risk events.

## Refund Rules (Policy Layer)
- Full refund: service not started / attorney no-show / duplicate payment
- Partial refund: partial work completed (documented in milestone or engagement scope)
- No automatic refund for outcome dissatisfaction if agreed work delivered (legal result not guaranteed)
- Refund decision must reference:
  - engagement scope
  - message history
  - milestone evidence
  - dispute ticket resolution notes

## Risk Controls
- Trigger manual review when:
  - repeated off-platform contact attempts
  - harassment/threat reports
  - high-value ticket exceeds threshold
  - cross-state practice mismatch flagged and unresolved
- Block payout on active `DisputeTicket` or severe `ContentRuleEvent`

## Records / Audit Requirements
- Payment intent log
- Escrow hold/release log
- Refund decision log
- AdminActionLog linkage to ticket/report IDs
- Receipt / invoice metadata (payer, payee, amount, timestamp, scope snapshot)

## Compliance / Legal Review Checklist (Before Coding Payments)
1. Platform legal counsel review of escrow/trust-account implications by jurisdiction
2. Payment processor ToS compatibility review (legal services category)
3. Chargeback response workflow and document retention policy
4. Privacy handling for payment receipts and billing info

## Suggested Implementation Order (After Policy Approval)
1. `PaymentOrder` + `PaymentEvent` models
2. Engagement-linked payment prechecks
3. Consultation fixed-fee flow (simplest)
4. Stage/milestone flow
5. Refund/dispute integration
6. Admin payout hold/release tools
