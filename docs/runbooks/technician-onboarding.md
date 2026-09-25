# Technician onboarding

The owner or manager opens Team & Dispatch, enters the invited email and chooses a permitted role. Active technician-role members plus pending technician invitations are limited to the workspace technician allowance (Starter: three). Role changes and reactivation enforce the same limit.

The app generates an invitation link containing a random token and stores its hash. The operator copies the link and shares it with the intended person. Do not claim automatic invitation email delivery. Use the application's generated URL rather than a hardcoded domain.

The recipient creates an account or signs in, verifies the matching email address, and selects Join team workspace. The backend validates token state, expiry, email, workspace and seat availability before creating membership. Acceptance is retryable. Revoked or expired invitations require a new link.

Open an assigned visit while connected, start it, complete the checklist, add required photos and explain exceptions. Wait for saved/upload status before completing. Pending local photos block finalization. Signing out clears device drafts; see evidence-durability.md.

PWA installation is optional. Verify the real deployed origin, installation behavior and camera permissions on physical devices before prescribing device-specific installation steps to customers. Owners can deactivate departing staff; subsequent API and database access checks use current membership, not only cached token roles.
