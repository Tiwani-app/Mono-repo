# Tiwani Admin User Guide

Last updated: June 23, 2026

This guide is for association admins using the production app.

## Admin Responsibilities

Admins can manage:

- Members and join requests
- Events and attendance
- Dues, ad-hoc charges, payments, and reversals
- Announcements and push notifications
- Library documents
- Marketplace listing moderation
- Polls/elections where role permissions allow
- Audit log review
- Account deletion completion where authorised

## Daily Admin Flow

1. Sign in.
2. Check dashboard counts and recent activity.
3. Open notifications for new announcements/activity.
4. Review join requests and pending member work.
5. Review finance summaries and overdue members.
6. Review upcoming events.
7. Check audit logs if a sensitive workflow changed.

## Members

Use Add Member or Join Requests for member onboarding.

Production rule:

- Every Firebase Auth user must have a matching `users/{uid}` profile.
- Do not manually create partial user documents unless following a controlled
  recovery plan.
- Member directory data is mirrored to `member_directory` by backend.

Admin can edit status, role, and profile details. Members can edit only safe
own-profile fields.

## Events

Admins can create and edit events.

Rules:

- Future events allow normal RSVP/check-in workflows.
- Elapsed events remain visible when their date is selected.
- On elapsed event detail screens, only Edit Event should remain available to
  admins.
- Event creation/edit triggers activity notifications.
- Event reminders are sent one day and one hour before events by backend.

## Finance

Admins can:

- Create dues periods.
- Create ad-hoc charges for all active members, one member, or selected members.
- Record payments against selected charges.
- Reverse payments.
- Review member ledgers.

Finance tips:

- Select the exact charge/reference when recording payment.
- The member ledger should show only that member's charges/payments.
- Finance contacts should include treasurer/payment support and dues creator
  contact where available.
- If totals look wrong, inspect duplicated charges/payments before recording new
  adjustments.

## Voting

Admins and electoral chairmen may manage voting based on role permissions.

Secret ballot rule:

- Admins may see that a member voted.
- Admins must not see the member's selected candidate choices in secret ballots.
- Polls/elections should remain visible after expiry for reference/results.

## Announcements And Push

Admins can create announcements. The backend handles push delivery to active
tokens and writes in-app notifications.

Before sending:

- Keep messages concise.
- Avoid private finance details in broad announcements.
- Confirm target audience.

## Library

Admins can upload and manage documents:

- Constitutional documents
- Meeting minutes and reports

Files should be PDFs unless the product intentionally expands supported types.

## Marketplace

Marketplace inquiry should open a direct communication app with prepared text,
not a placeholder modal.

Admins may moderate listings as needed.

## Audit Logs

Use audit logs after sensitive actions:

- member creation/status/role
- finance mutation
- voting mutation
- notification delivery
- account deletion

Audit logs are for investigation and accountability, not member browsing.

## Support Escalation

For critical issues:

1. Capture the affected role, screen, app version, platform, and time.
2. Do not paste private member data into chat.
3. Follow `docs/INCIDENT_RESPONSE_CONTACTS.md`.
4. Pause rollout if auth, finance, privacy, or voting integrity is affected.
