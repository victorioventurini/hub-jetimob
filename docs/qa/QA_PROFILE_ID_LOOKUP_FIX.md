# QA: Profile ID Lookup Fix

## Test Scenarios

### 1. Assets Module

#### 1.1 Item Detail by UUID (`getItem`)
**Steps:**
1. Navigate to `/assets/inventory/{uuid}` (use a valid asset UUID)
2. Verify holder user name and avatar display correctly
3. Verify home_location and current_location display correctly

**Expected:**
- If item status is `loaned`, the LoanStatusCard shows:
  - Current holder name + avatar
  - Loan date (`assigned_at`)
  - Time on loan (calculated)
  - Due date (if set)
  - Authorized by (if set)

**Result:** [ ] PASS / [ ] FAIL

#### 1.2 Item Detail by Code (`getItemByCode`)
**Steps:**
1. Navigate to `/assets/inventory/{internal_code}` (e.g., `/assets/inventory/0202`)
2. Verify same data displays as UUID route

**Expected:**
- Identical display to 1.1 for the same item

**Result:** [ ] PASS / [ ] FAIL

#### 1.3 Inventory List (`items`)
**Steps:**
1. Navigate to `/assets/inventory`
2. Verify all loaned items show holder name correctly
3. Check at least 3 different loaned items

**Expected:**
- Each item with `current_user_id` shows correct profile name
- No "undefined" or "Sem nome" for valid holders

**Result:** [ ] PASS / [ ] FAIL

#### 1.4 Movement History (`getMovements`)
**Steps:**
1. Open detail page of an item with movements
2. Switch to "Movimentações" tab
3. Verify each movement shows:
   - `performed_by` name
   - `authorized_by` name (if applicable)
   - `to_user` or `from_user` names

**Expected:**
- All user references resolve correctly
- No missing names for movements with user IDs

**Result:** [ ] PASS / [ ] FAIL

### 2. Cross-BU Isolation

#### 2.1 BU Switch Test
**Steps:**
1. Login and select BU A
2. Open an asset with a holder
3. Note the holder name
4. Switch to BU B
5. Open the asset list
6. Verify no profile mixing between BUs

**Expected:**
- Each BU shows only its own users
- No cross-BU profile leakage

**Result:** [ ] PASS / [ ] FAIL

### 3. Audit Scripts

#### 3.1 Profile Lookup Audit
**Command:**
```bash
npm run audit:profile-lookup
```

**Expected:**
- Script runs without errors
- Either "PASS" or lists remaining violations
- Report saved to `docs/perf/PROFILE_LOOKUP_AUDIT.md`

**Result:** [ ] PASS / [ ] FAIL

#### 3.2 Identity Usage Audit
**Command:**
```bash
npm run audit:identity
```

**Expected:**
- Existing audit continues to work
- No new violations from this fix

**Result:** [ ] PASS / [ ] FAIL

---

## Summary

| Area | Status |
|------|--------|
| Assets getItem (UUID) | [ ] |
| Assets getItemByCode | [ ] |
| Assets items list | [ ] |
| Assets movements | [ ] |
| BU isolation | [ ] |
| audit:profile-lookup | [ ] |
| audit:identity | [ ] |

**Overall:** [ ] PASS / [ ] FAIL

---

## Notes
- All domain columns (current_user_id, from_user_id, to_user_id, etc.) store `profiles.id`
- Infrastructure columns (bu_user_memberships.user_id, user_roles.user_id) store `auth.users.id`
- Refer to `docs/IDENTITY_CONVENTION.md` for complete mapping
