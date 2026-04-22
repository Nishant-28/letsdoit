# Phone Number Migration Guide

## Current State
The `phoneE164` field has been added to the schema as **optional**. This allows existing users to continue using the app without disruption.

## Migration Strategy: Widen-Migrate-Narrow

### Phase A: Widen (✅ COMPLETE)
- Schema updated with optional `phoneE164` field
- Index `by_phoneE164` created
- New users must provide phone during onboarding
- Existing users can continue without phone

### Phase B: Migrate (TODO)
Two options for handling existing users:

#### Option 1: Force Onboarding
Redirect existing users without `phoneE164` to onboarding flow:

```typescript
// In AppHome.tsx or protected routes
if (user && !user.phoneE164) {
  navigate("/onboarding");
  return null;
}
```

#### Option 2: Backfill Migration
Create a migration script to prompt users:

```typescript
// convex/migrations/addPhoneNumbers.ts
import { internalMutation } from "./_generated/server";

export const promptUsersForPhone = internalMutation({
  args: {},
  handler: async (ctx) => {
    const usersWithoutPhone = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneE164"), undefined))
      .take(100);
    
    // Send email/notification to these users
    // Or mark them for onboarding redirect
    
    return { processed: usersWithoutPhone.length };
  },
});
```

### Phase C: Narrow (TODO)
Once all users have phone numbers:

1. Update schema to make `phoneE164` required:
```typescript
phoneE164: v.string(), // Remove v.optional()
```

2. Update validators in mutations to enforce non-null

3. Deploy schema change

## Current Behavior

### New Users
1. Sign up via WorkOS
2. Redirected to `/callback`
3. `syncFromWorkOS` creates user record (no phone)
4. Redirected to `/onboarding`
5. Must complete all 3 steps including phone
6. `completeOnboarding` saves phone and sets `onboardedAt`
7. Redirected to `/app`

### Existing Users (if any)
1. Sign in via WorkOS
2. `syncFromWorkOS` updates existing record
3. If `onboardedAt` exists → `/app`
4. If no `onboardedAt` → `/onboarding`

## Phone Validation Rules

### Format
- Must be exactly 10 digits
- Automatically prefixed with `+91`
- Stored as: `+91XXXXXXXXXX`

### Uniqueness
- Enforced via `by_phoneE164` index
- Checked before insert/update
- Error message: "This phone number is already registered."

### Regex
```typescript
const phoneRegex = /^\+91\d{10}$/;
```

## Testing Migration

### Test New User Flow
```bash
# 1. Start dev server
bun dev

# 2. Visit http://localhost:3000
# 3. Click "Sign Up"
# 4. Complete WorkOS signup
# 5. Complete onboarding with phone
# 6. Verify redirect to /app
```

### Test Existing User (Manual)
```bash
# 1. Create user via Convex dashboard without phoneE164
# 2. Sign in with that user
# 3. Should be redirected to onboarding
# 4. Complete phone step
# 5. Verify phone saved and redirect to /app
```

### Test Phone Uniqueness
```bash
# 1. Complete onboarding with phone: +919876543210
# 2. Sign out
# 3. Create new account
# 4. Try same phone in onboarding
# 5. Should see error: "This phone number is already registered."
```

## Rollback Plan

If issues arise, rollback is safe:

1. The field is optional, so removing it won't break existing data
2. Remove `phoneE164` from schema
3. Remove phone validation from mutations
4. Remove phone input from onboarding
5. Deploy

No data loss occurs because the field is optional.

## Production Deployment

### Before Deploy
- [ ] Test complete flow in dev
- [ ] Verify phone uniqueness works
- [ ] Test with multiple users
- [ ] Check admin auto-promotion

### Deploy Steps
1. Deploy Convex functions: `bunx convex deploy`
2. Deploy frontend: `bun run build`
3. Update production env vars
4. Test production auth flow
5. Monitor for errors

### After Deploy
- [ ] Verify new signups work
- [ ] Check existing users can sign in
- [ ] Monitor Convex logs for errors
- [ ] Test admin dashboard access

## Future Enhancements

### Phone Verification
Add SMS verification via Twilio/AWS SNS:
```typescript
export const sendPhoneVerification = mutation({
  args: { phoneE164: v.string() },
  handler: async (ctx, args) => {
    // Generate OTP
    // Send via SMS
    // Store OTP with expiry
  },
});

export const verifyPhone = mutation({
  args: { phoneE164: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    // Verify OTP
    // Mark phone as verified
  },
});
```

### International Support
Extend beyond India:
```typescript
phoneE164: v.string(), // Any E.164 format
countryCode: v.string(), // ISO country code
```

### Phone as Login
Allow phone-based authentication:
- Integrate WorkOS phone auth
- Or use Twilio Verify
- Link phone to WorkOS identity
