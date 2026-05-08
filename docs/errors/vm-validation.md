---
title: VM Validation Reference
description: Complete reference for Value Multiplicity (VM) constraint validation errors produced by dicom-validator-ts
---

# VM Validation Reference

Value Multiplicity (VM) validation checks that the number of values in a DICOM tag matches the multiplicity constraint defined in the DICOM standard. Each tag in the data dictionary specifies how many values it may hold — a single value, a fixed count, a range, or an unbounded multiple.

When a tag's value count violates its VM constraint, the validator produces a `vm-constraint` error finding.

## Rule Reference

| Rule | Severity | Message Template | Trigger Condition |
|------|----------|-----------------|-------------------|
| `vm-constraint` | error | `VM violation: expected {vm} values but got {count}` | The number of backslash-delimited values does not satisfy the tag's VM constraint |

## vm-constraint

**Rule Identifier:** `vm-constraint`

**Severity:** error

**Message Template:**

```
VM violation: expected {vm} values but got {count}
```

Where `{vm}` is the VM constraint string from the data dictionary (e.g., `"1"`, `"1-3"`, `"1-n"`, `"2-2n"`) and `{count}` is the actual number of values found.

**Trigger Condition:** The tag's value, when split by the backslash (`\`) delimiter, produces a count that does not satisfy the VM constraint. The check is performed by `TagValidator.validateVM()` in `src/validators/tag-validator.ts`.

**Example findings:**

| Tag | VM Constraint | Actual Values | Message |
|-----|--------------|---------------|---------|
| `(0010,0010)` | `1` | `Smith^John\Doe^Jane` (2 values) | `VM violation: expected 1 values but got 2` |
| `(0020,0037)` | `6` | `1\0\0` (3 values) | `VM violation: expected 6 values but got 3` |
| `(0008,0008)` | `1-n` | _(empty after split — 0 values)_ | `VM violation: expected 1-n values but got 0` |


## VM Constraint Formats

The DICOM standard defines several VM constraint formats that specify how many values a tag may hold. The validator parses these strings into a structured `VMConstraint` object with `min`, `max`, and `step` fields (see `src/types/vm-constraint.ts`).

### Fixed (`"1"`, `"3"`)

A fixed VM constraint requires exactly N values.

**Parsing:** `"3"` → `{ min: 3, max: 3, step: 1 }`

| VM String | Valid Counts | Invalid Counts |
|-----------|-------------|----------------|
| `"1"` | 1 | 0, 2, 3, … |
| `"3"` | 3 | 0, 1, 2, 4, 5, … |
| `"6"` | 6 | 0, 1, 2, 3, 4, 5, 7, … |

### Range (`"1-3"`)

A range constraint allows any count between the minimum and maximum (inclusive).

**Parsing:** `"1-3"` → `{ min: 1, max: 3, step: 1 }`

| VM String | Valid Counts | Invalid Counts |
|-----------|-------------|----------------|
| `"1-3"` | 1, 2, 3 | 0, 4, 5, … |
| `"2-4"` | 2, 3, 4 | 0, 1, 5, 6, … |
| `"1-8"` | 1, 2, 3, 4, 5, 6, 7, 8 | 0, 9, 10, … |

### Unbounded (`"1-n"`)

An unbounded constraint requires at least N values with no upper limit. The step is 1, so any count at or above the minimum is valid.

**Parsing:** `"1-n"` → `{ min: 1, max: null, step: 1 }`

| VM String | Valid Counts | Invalid Counts |
|-----------|-------------|----------------|
| `"1-n"` | 1, 2, 3, 4, … | 0 |
| `"2-n"` | 2, 3, 4, 5, … | 0, 1 |
| `"3-n"` | 3, 4, 5, 6, … | 0, 1, 2 |

### Multiplier (`"2-2n"`, `"3-3n"`)

A multiplier constraint requires the value count to be a multiple of the step value, starting from the minimum. The upper bound is unbounded.

**Parsing:** `"2-2n"` → `{ min: 2, max: null, step: 2 }`

| VM String | Valid Counts | Invalid Counts |
|-----------|-------------|----------------|
| `"2-2n"` | 2, 4, 6, 8, … | 0, 1, 3, 5, 7, … |
| `"3-3n"` | 3, 6, 9, 12, … | 0, 1, 2, 4, 5, 7, 8, … |

The multiplier format enforces that values come in groups. For example, `"3-3n"` is used for tags that store coordinate triplets — the count must always be a multiple of 3.

### Validation Logic

The `satisfiesVM(count, constraint)` function in `src/types/vm-constraint.ts` applies the following rules in order:

1. A count of 0 is never valid (empty values are rejected before the VM check)
2. The count must be greater than or equal to `constraint.min`
3. If `constraint.max` is not null, the count must be less than or equal to `constraint.max`
4. If `constraint.step` is greater than 1, the count must be a multiple of `constraint.step`


## Code Example

The following TypeScript example demonstrates how to validate a DICOM file and filter the results to only `vm-constraint` findings:

```typescript
import { validate, type ValidationFinding } from 'dicom-validator-ts';

async function checkVMConstraints(filePath: string): Promise<void> {
  // Run validation on a DICOM file
  const result = await validate(filePath);

  // Filter findings to only the vm-constraint rule
  const vmFindings: ValidationFinding[] = result.findings.filter(
    (f) => f.rule === 'vm-constraint'
  );

  if (vmFindings.length === 0) {
    console.log('No VM constraint violations found.');
    return;
  }

  console.log(`Found ${vmFindings.length} VM constraint violation(s):\n`);

  for (const finding of vmFindings) {
    console.log(`  Tag: ${finding.tag}`);
    console.log(`  Message: ${finding.message}`);
    console.log(`  Severity: ${finding.severity}`);
    console.log('');
  }
}

checkVMConstraints('./my-dicom-file.dcm');
```
