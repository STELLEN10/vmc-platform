# VMC v0.5 — Driver referrals

V0.5 introduces the driver referral and R250 reward workflow behind the existing release-control system.

## Driver experience

An authorized active driver gets a Referrals item in the Driver navigation when the `driver_referrals` feature is enabled. The driver can create one active referral code, copy a registration link, or use the phone's native share sheet.

Referral links use `/driver/register?ref=CODE`.

The referred rider can complete the normal VMC driver signup. The referral code is carried in Auth metadata and attached to the driver's operational record by a server-side management workflow. Drivers cannot choose or edit the referred driver relationship from the browser.

## Management workflow

Management gets a Referrals area when the feature is enabled.

Lifecycle:

`created → applied → qualified → reward_pending → rewarded`

A referral can also be cancelled.

Management can qualify or cancel a referral. Qualification creates a R250 reward record. Only an administrator can mark the R250 reward as paid. Each state change is audited, and the referring driver receives an in-app notification for qualification, cancellation, and payment.

## Security

- Referral creation is a SECURITY DEFINER function restricted to active VMC drivers.
- Referral attachment validates the target driver and prevents self-referral.
- Referral rewards are private to the referrer and VMC management through RLS.
- Only VMC management can qualify/cancel referrals.
- Only VMC administrators can mark rewards as paid.
- The public signup form does not trust a referral code to assign a role.
- The `driver_referrals` feature remains locked until the VMC release-control workflow explicitly enables it.
