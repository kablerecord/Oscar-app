# v2.0: Client-Side Key Management

## Overview
Move from server-side per-user keys to true zero-knowledge architecture where encryption keys never leave user devices. OSQR servers store only encrypted blobs with no ability to decrypt.

## Why Deferred from v1.5
- Requires platform-specific implementations for each interface
- Current interfaces (web only) have limited secure key storage options
- VS Code extension, mobile app, and desktop app don't exist yet
- Each new interface should bring its own key storage implementation

## Architecture Pattern
Decoupled data/control planes:
- **Control plane (OSQR)**: Tool orchestration, plugin management, model routing
- **Data plane (User)**: PKV storage, encryption keys, embeddings

## Per-Platform Implementation

| Platform | Key Storage | Implementation Timing |
|----------|-------------|----------------------|
| Web | Browser extension or WebAuthn | When browser extension ships |
| VS Code | SecretStorage API + system keychain | When VS Code extension ships |
| iOS | Keychain Services | When iOS app ships |
| Android | Android Keystore | When Android app ships |
| Desktop | macOS Keychain / Windows Credential Manager | When desktop app ships |

## Key Sync Pattern
Options to evaluate:

1. **No sync** - Each device generates own key, separate encrypted vaults (simplest, most secure)
2. **QR code transfer** - Scan to copy key to new device (manual, no server involvement)
3. **Recovery phrase** - BIP-39 style seed phrase user writes down (user responsibility)
4. **Secrets manager integration** - User's 1Password/Bitwarden holds master key (delegates to existing trust)

**Recommendation:** Start with Option 1 (no sync), add Option 2 or 3 based on user feedback.

## Key Loss Policy
**Lost key = lost data.** This is a feature, not a bug.

- Cannot be overridden
- Documented clearly during onboarding
- Aligns with User Data Sovereignty principle (user owns data, including consequences)

## Migration Path
Users on v1.5 (server-side keys) can migrate:

1. Export decrypted data using server-side key
2. Generate new client-side key on device
3. Re-encrypt and upload
4. Delete server-side key

## Dependencies
- [ ] At least one native interface (VS Code extension, mobile, or desktop)
- [ ] Onboarding flow explaining key responsibility
- [ ] Export/import functionality for migration
- [ ] Backup/recovery UX design

## Success Criteria
- OSQR servers cannot decrypt any user PKV data
- Key compromise on server has zero impact on user data
- Users can verify zero-knowledge claim (open source client encryption)

## Research to Conduct
- Audit how 1Password, Bitwarden handle multi-device key sync
- Evaluate WebAuthn/passkeys as key storage mechanism for web
- Review Apple's iCloud Keychain sync protocol (if documented)

---

*Document Version: 1.0*
*Status: Deferred to v2.0*
*Created: December 2025*
