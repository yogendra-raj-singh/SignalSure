# SignalSure Security Specification & Payload TDD

## 1. Data Invariants
1. **Identity Integrity**: Every document in `/users/{userId}`, `/scanReports/{reportId}`, and `/incidentReports/{incidentId}` belongs strictly to a verified Google-authenticated user (`request.auth.uid`) with `request.auth.token.email_verified == true`.
2. **PII Isolation**: `/users/{userId}` contains `email`, `displayName`, and `photoUrl` and can only be read (`get`) or written by `userId == request.auth.uid`. Blanket `list` on `/users` is denied.
3. **Strict Ownership on Lists**: `allow list` on `/scanReports` and `/incidentReports` evaluates `resource.data.ownerId == request.auth.uid`, forcing queries to scope strictly to the signed-in owner.
4. **Temporal & Structural Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt`, `ownerId`, and core snapshot fields remain immutable on updates; extra ghost fields are rejected via `hasAll` / `hasOnly` and `affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**: Once a `ScanReportRecord` reaches `status == 'resolved'` or an `IncidentReportRecord` reaches `status == 'archived'`, subsequent `update` writes are denied.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write** on `/users/uid1`, `/scanReports/r1`, or `/incidentReports/i1`.
2. **Unverified email write** (`request.auth.token.email_verified == false`) attempting to create a `scanReports` document.
3. **Owner spoofing on create**: Signed-in user `uidA` sends `ownerId: "uidB"` when creating `/scanReports/r1`.
4. **Ghost field injection (Shadow Update)**: Sending `isAdmin: true` or `role: "superadmin"` alongside valid `UserProfile` fields on create or update.
5. **Path ID poisoning**: Writing to `/scanReports/invalid$id*with!badchars` or a 200-character document ID.
6. **Client-forged timestamp**: Creating a `scanReports` document with a client Date string instead of `request.time`.
7. **Cross-user PII read**: User `uidA` calling `get` on `/users/uidB` or `list` on `/users`.
8. **Unscoped collection list**: User `uidA` calling `list` on `/scanReports` without filtering `where('ownerId', '==', uidA)`.
9. **Immutable field tampering**: Updating `ownerId`, `riskLevel`, or `createdAt` on an existing `scanReports` document.
10. **Terminal state bypass**: Updating `notes` on a `scanReports` record whose existing `status` is already `'resolved'`.
11. **Value poisoning / resource exhaustion**: Updating `notes` on `/scanReports/r1` with a 10,000-character string or boolean.
12. **Privilege escalation on initial status**: Creating `/incidentReports/i1` directly with `status: 'archived'` instead of `'submitted'`.
