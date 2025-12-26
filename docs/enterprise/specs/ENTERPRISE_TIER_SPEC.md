# OSQR Enterprise Tier Specification
## Multi-Seat Accounts, User Invitation, and Permissions

**Status:** PLACEHOLDER - Needs Full Specification
**Priority:** P1 (Required for enterprise pilots)
**Created:** December 2024

---

## Purpose

Define the architecture and implementation for enterprise-level multi-seat accounts, enabling organizations like Roberts Resorts to have multiple users sharing a single knowledge vault.

---

## Requirements Summary

Based on Enterprise Feature Requirements bridge document:

### Must Have (P1)
- [ ] Multi-seat account structure (3-6 users for pilot)
- [ ] User invitation flow (email-based)
- [ ] Shared workspace/vault across team members
- [ ] Basic usage tracking per user

### Should Have (P2)
- [ ] Admin vs. standard user roles
- [ ] Document-level permissions (optional)
- [ ] Upgrade/downgrade flows between tiers

### Could Have (P3)
- [ ] SSO integration (SAML/OIDC)
- [ ] Custom role definitions
- [ ] API access tokens per user

---

## Database Schema Changes Required

Current schema has:
- `User` - individual users
- `Workspace` - owned by single user (`ownerId`)

Need to add:
- `Organization` or `Team` model
- `OrganizationMembership` (user-to-org relationship with role)
- Workspace needs to support org ownership

### Proposed Schema Addition

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  tier        String   @default("enterprise")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     OrganizationMember[]
  workspaces  Workspace[]  // Org-owned workspaces
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("member")  // admin, member
  invitedAt      DateTime     @default(now())
  joinedAt       DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
}
```

---

## User Flows

### 1. Organization Creation
- Enterprise customer signs up
- Creates organization
- Becomes first admin

### 2. User Invitation
- Admin invites users via email
- Invited user receives link
- Can sign up or sign in to accept
- Joins organization with member role

### 3. Workspace Sharing
- Org admin creates shared workspace
- All org members can access
- Documents uploaded are visible to all members

---

## Open Questions

1. Should workspaces be per-user within org, or truly shared?
2. How to handle document permissions within shared workspace?
3. Should there be org-level vs. workspace-level admins?
4. How to migrate existing single-user workspaces to org model?

---

## Implementation Notes

This spec needs to be fully developed before enterprise pilot expansion.

For initial Roberts Resorts pilot (3-6 execs):
- Could use workaround: shared login credentials
- Not ideal but unblocks pilot
- Proper implementation needed for enterprise deal

---

## Related Documents

- [ENTERPRISE_FEATURE_REQUIREMENTS.md](./ENTERPRISE_FEATURE_REQUIREMENTS.md)
- [ENTERPRISE_ADMIN_SPEC.md](./ENTERPRISE_ADMIN_SPEC.md)

---

*Placeholder created: December 2024*
*Status: Needs full specification*
