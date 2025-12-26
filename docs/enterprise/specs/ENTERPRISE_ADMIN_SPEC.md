# OSQR Enterprise Admin Specification
## Admin Dashboard and User Management

**Status:** PLACEHOLDER - Needs Full Specification
**Priority:** P2 (Required for enterprise deal, not pilot)
**Created:** December 2024

---

## Purpose

Define the admin dashboard requirements for enterprise customers, enabling them to manage users, view usage, and control their organization's OSQR deployment.

---

## Requirements Summary

Based on Enterprise Feature Requirements bridge document:

### Must Have (P2)
- [ ] View all users on account
- [ ] View usage statistics (queries, documents, active users)
- [ ] Basic user management (invite, remove)

### Should Have (P2)
- [ ] Usage reporting / export
- [ ] Document management (bulk operations)
- [ ] Activity logs

### Could Have (P3)
- [ ] Role management UI
- [ ] Billing management
- [ ] API key management

---

## Dashboard Sections

### 1. Overview
- Total users
- Active users (last 7 days)
- Total queries this period
- Documents indexed
- Storage used

### 2. Users
- List of all organization members
- Invite new users
- Remove users
- Change roles (admin/member)
- Last active date

### 3. Usage
- Query volume over time (chart)
- Queries by user
- Most queried documents
- Peak usage times

### 4. Documents
- List all documents in vault
- Upload new documents
- Bulk delete
- Search/filter

### 5. Settings
- Organization name
- Billing tier
- SSO configuration (future)

---

## UI Location

Admin dashboard should be accessible at:
- `/admin` or `/dashboard/admin`
- Only visible to users with admin role
- Link in main navigation for admins

---

## API Endpoints Needed

```
GET  /api/admin/overview        - Dashboard stats
GET  /api/admin/users           - List users
POST /api/admin/users/invite    - Invite user
DELETE /api/admin/users/:id     - Remove user
PATCH /api/admin/users/:id/role - Change role
GET  /api/admin/usage           - Usage statistics
GET  /api/admin/usage/export    - Export usage data
GET  /api/admin/documents       - List documents
DELETE /api/admin/documents     - Bulk delete
```

---

## Access Control

- Only organization admins can access admin routes
- Middleware to check:
  1. User is authenticated
  2. User belongs to an organization
  3. User has admin role in that organization

---

## Open Questions

1. Should there be super-admin (OSQR staff) access?
2. How granular should usage reporting be?
3. Should document management include version history?
4. How to handle audit logging requirements?

---

## Implementation Notes

For Roberts Resorts pilot:
- Admin dashboard not required
- Can provide usage reports manually
- Build for enterprise deal phase

---

## Related Documents

- [ENTERPRISE_TIER_SPEC.md](./ENTERPRISE_TIER_SPEC.md)
- [ENTERPRISE_FEATURE_REQUIREMENTS.md](./ENTERPRISE_FEATURE_REQUIREMENTS.md)

---

*Placeholder created: December 2024*
*Status: Needs full specification*
