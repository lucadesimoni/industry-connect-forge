# 🚨 IMMEDIATE ACTION ITEMS - Priority Order

## ⚡ CRITICAL - Do First (This Week)

### 1. Fix RLS Security Policies
**File:** `supabase/migrations/[new_migration].sql`

**Current Problem:**
```sql
-- DANGEROUS - Allows anyone to do anything
CREATE POLICY "Allow all operations on uns_nodes" 
ON public.uns_nodes FOR ALL USING (true) WITH CHECK (true);
```

**Immediate Fix:**
```sql
-- Remove permissive policies
DROP POLICY IF EXISTS "Allow all operations on uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Allow all operations on aas" ON public.aas;
DROP POLICY IF EXISTS "Allow all operations on aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Allow all operations on aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Allow all operations on rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Allow all operations on entity_links" ON public.entity_links;

-- Add temporary restrictive policy (until auth is implemented)
CREATE POLICY "Authenticated users only" 
ON public.uns_nodes FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
-- Repeat for all tables
```

### 2. Add Authentication Check in Hooks
**Files:** `src/hooks/useRDS.ts`, `src/hooks/useAAS.ts`, `src/hooks/useUNSNodes.ts`

**Add to each hook:**
```typescript
import { supabase } from '@/integrations/supabase/client';

// At the start of each mutation
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  throw new Error('Authentication required');
}
```

### 3. Fix Error Handling Inconsistencies
**Files:** `src/components/uns/UNSDialog.tsx`, `src/components/aas/AASDialog.tsx`

**Replace console.error with proper error handling:**
```typescript
// Instead of:
console.error('Failed to save UNS node:', error);

// Use:
toast({
  title: 'Failed to save UNS node',
  description: error instanceof Error ? error.message : 'An unknown error occurred',
  variant: 'destructive'
});
```

### 4. Add Input Validation
**File:** `src/components/aas/AASDialog.tsx`

**Add Zod schema:**
```typescript
import { z } from 'zod';

const aasSchema = z.object({
  idShort: z.string()
    .min(1, 'ID Short is required')
    .max(100, 'ID Short must be 100 characters or less')
    .regex(/^[A-Za-z0-9_-]+$/, 'ID Short must contain only alphanumeric characters, underscores, and hyphens'),
  assetId: z.string()
    .min(1, 'Asset ID is required')
    .max(100, 'Asset ID must be 100 characters or less'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less'),
  manufacturer: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
});
```

---

## 🔥 HIGH PRIORITY - Do Next (Next Week)

### 5. Add Site Support
**Create migration:**
```sql
-- Create sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add site_id to all tables
ALTER TABLE public.uns_nodes ADD COLUMN site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.aas ADD COLUMN site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.rds_designations ADD COLUMN site_id UUID REFERENCES public.sites(id);

-- Create indexes
CREATE INDEX idx_uns_nodes_site_id ON public.uns_nodes(site_id);
CREATE INDEX idx_aas_site_id ON public.aas(site_id);
CREATE INDEX idx_rds_designations_site_id ON public.rds_designations(site_id);
```

### 6. Add Audit Logging
**Create migration:**
```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
```

### 7. Add Aerospace Fields
**Create migration:**
```sql
ALTER TABLE public.aas 
  ADD COLUMN part_number TEXT,
  ADD COLUMN lot_number TEXT,
  ADD COLUMN revision TEXT,
  ADD COLUMN as9100_compliant BOOLEAN DEFAULT false,
  ADD COLUMN export_control_flag TEXT CHECK (export_control_flag IN ('NONE', 'ITAR', 'EAR'));
```

---

## ⚠️ MEDIUM PRIORITY - Do Soon (Week 3-4)

### 8. Standardize Type Definitions
**File:** `src/types/industrial.ts`

**Add strict metadata types:**
```typescript
export interface UNSNodeMetadata {
  uns_path?: string;
  rds_location?: string;
  site_code?: string;
  timezone?: string;
}

export interface AASMetadata {
  part_number?: string;
  lot_number?: string;
  revision?: string;
  as9100_compliant?: boolean;
  export_control_flag?: 'NONE' | 'ITAR' | 'EAR';
}

export interface RDSMetadata {
  uns_topic?: string;
  broker_topic?: string;
  hierarchy_level?: string;
  functionAspect?: string;
  productAspect?: string;
  locationAspect?: string;
}
```

### 9. Add Comprehensive Validation
**Create:** `src/lib/validation.ts`

**Centralize all validation schemas**

### 10. Add Error Boundary
**Create:** `src/components/ErrorBoundary.tsx`

**Implement React error boundary for better error handling**

---

## 📝 CODE FIXES NEEDED

### Fix 1: UNSDialog.tsx - Missing Error Handling
**Line 115, 124:** Replace `console.error` with toast notifications

### Fix 2: AASDialog.tsx - Add Validation
**Add Zod schema validation before submit**

### Fix 3: useAAS.ts - Add Null Checks
**Add checks for submodels/properties arrays**

### Fix 4: RDSBuilderDialog.tsx - Fix Designation Generation
**Line 86:** Current format `${aspectCode}${objectClass}-${locationCode}` doesn't match IEC 81346 standard
**Should be:** `${aspectCode}${objectClass}+${locationAspect}` for instances

### Fix 5: All Hooks - Add Loading States
**Add proper loading/error states for better UX**

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests Needed:
- [ ] Validation schemas
- [ ] Hook functions
- [ ] Utility functions
- [ ] Type conversions

### Integration Tests Needed:
- [ ] Database operations
- [ ] RLS policies
- [ ] Authentication flows
- [ ] Multi-site isolation

### E2E Tests Needed:
- [ ] Create UNS node
- [ ] Create AAS
- [ ] Create RDS designation
- [ ] Link entities
- [ ] Cross-site access (should fail)

---

## 📋 QUICK REFERENCE

### Security Checklist
- [ ] RLS policies restrictive
- [ ] Auth checks in all hooks
- [ ] Input validation everywhere
- [ ] Audit logging active
- [ ] Error handling consistent

### Aerospace Compliance
- [ ] Part numbers tracked
- [ ] Lot numbers tracked
- [ ] Revision control
- [ ] AS9100 fields
- [ ] Export control flags

### Multi-Site Support
- [ ] Sites table created
- [ ] site_id added to all tables
- [ ] Site filtering implemented
- [ ] Cross-site access blocked

---

**Status:** 🔴 CRITICAL - Start with Security fixes immediately

