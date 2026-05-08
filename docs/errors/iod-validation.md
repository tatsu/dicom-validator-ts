---
title: IOD Validation Rules
description: Detailed reference for all IOD (Information Object Definition) validation rules produced by dicom-validator-ts
---

# IOD Validation Rules

This page documents all validation rules related to **IOD (Information Object Definition)** validation. IOD validation verifies that a DICOM dataset conforms to the structural requirements defined by its SOP Class — including the presence of mandatory modules and the correct inclusion of conditional modules.

IOD validation is performed by the `IODValidator` class, which:

1. Identifies the SOP Class from the dataset's SOP Class UID tag `(0008,0016)`
2. Looks up the IOD definition for that SOP Class
3. Validates each module referenced by the IOD based on its usage type (Mandatory, Conditional, or User Optional)

## IOD-Level Rules Summary

| Rule | Severity | Description |
|------|----------|-------------|
| `iod-sop-class-missing` | error | SOP Class UID tag is missing from the dataset |
| `iod-sop-class-unknown` | error | SOP Class UID is not recognized |
| `iod-module-not-found` | warning | Module definition referenced by the IOD is not in the dictionary |
| `iod-module-condition-indeterminate` | info | Inclusion condition for a conditional module cannot be evaluated |

## IOD-Level Rules

### `iod-sop-class-missing`

- **Severity:** error
- **Message:** `SOP Class UID not found`
- **Tag:** `(0008,0016)`

**Trigger condition:** The dataset does not contain the SOP Class UID tag `(0008,0016)`, or the tag has no value. Without a SOP Class UID, the validator cannot determine which IOD definition to validate against, so validation stops immediately.

---

### `iod-sop-class-unknown`

- **Severity:** error
- **Message:** `SOP Class UID not recognized: {sopClassUID}`
- **Tag:** `(0008,0016)`

**Trigger condition:** The dataset contains a SOP Class UID value that does not match any known IOD definition in the registry. This typically means the UID is malformed, proprietary, or from a newer edition of the DICOM standard not yet supported by the dictionary. Validation stops immediately since no IOD structure can be determined.

---

### `iod-module-not-found`

- **Severity:** warning
- **Message:** `Module definition not found for "{moduleName}" ({moduleId})`
- **Tag:** _(none)_
- **Module:** The module name referenced by the IOD

**Trigger condition:** The IOD definition references a module (by module ID) that does not exist in the module registry. This is typically a dictionary completeness issue rather than a problem with the dataset itself. The module is skipped and validation continues with the remaining modules.

---

### `iod-module-condition-indeterminate`

- **Severity:** info
- **Tag:** _(none)_
- **Module:** The conditional module name

This rule is produced in two scenarios:

**Scenario 1 — No evaluable condition defined:**
- **Message:** `Conditional module "{moduleName}" has no evaluable condition`
- **Trigger condition:** A module with usage type "C" (Conditional) has no condition expression attached to its IOD reference. The validator cannot determine whether the module should be included, so it reports the situation as informational and skips validation of that module.

**Scenario 2 — Condition evaluation is indeterminate:**
- **Message:** `Condition for conditional module "{moduleName}" could not be fully evaluated`
- **Trigger condition:** A conditional module has a condition expression, but the condition evaluator returns "indeterminate" — typically because the tags referenced in the condition are themselves absent from the dataset. The module is skipped and no error is raised.

## Module Usage Types

When the IOD validator processes a module, it first checks the module's **usage type** to determine whether validation should proceed:

| Usage Type | Code | Validation Behavior |
|------------|------|---------------------|
| Mandatory | `M` | Always validated — all attributes in the module are checked against their type rules |
| Conditional | `C` | Condition is evaluated first. If `true`, validated like Mandatory. If `false`, skipped entirely. If `indeterminate`, skipped with an info finding |
| User Optional | `U` | Always skipped — no validation is performed |

Mandatory modules represent the core structure of the IOD and must always be present. Conditional modules are included only when a specific condition is met (e.g., a particular modality or transfer syntax). User Optional modules are never validated because their inclusion is at the discretion of the creating application.

## Attribute Types

Within each validated module, individual attributes are checked according to their **attribute type** as defined by the DICOM standard:

| Attribute Type | Required | Empty Allowed | Condition Evaluated |
|----------------|----------|---------------|---------------------|
| Type 1 | Yes | No | — |
| Type 2 | Yes | Yes | — |
| Type 3 | No | — | — |
| Type 1C | Conditional | No | Yes |
| Type 2C | Conditional | Yes | Yes |

- **Type 1** — The attribute must be present and must contain a non-empty value. A missing attribute produces a `type1-missing` error; a present but empty attribute produces a `type1-empty` error.
- **Type 2** — The attribute must be present, but an empty value is acceptable. A missing attribute produces a `type2-missing` warning.
- **Type 3** — The attribute is entirely optional. No validation findings are produced regardless of presence or value.
- **Type 1C** — The attribute is conditionally required. If the condition evaluates to `true`, Type 1 rules apply. If `false`, the attribute is not required. If `indeterminate`, a `condition-indeterminate` info finding is produced.
- **Type 2C** — The attribute is conditionally required but may be empty. If the condition evaluates to `true`, Type 2 rules apply. If `false`, the attribute is not required. If `indeterminate`, a `condition-indeterminate` info finding is produced.

## Module-Level Rules Summary

| Rule | Severity | Description |
|------|----------|-------------|
| `type1-missing` | error | A Type 1 (or Type 1C with condition true) attribute is missing from the dataset |
| `type1-empty` | error | A Type 1 (or Type 1C with condition true) attribute is present but has an empty value |
| `type2-missing` | warning | A Type 2 (or Type 2C with condition true) attribute is missing from the dataset |
| `condition-indeterminate` | info | The condition for a Type 1C or Type 2C attribute could not be evaluated |

## Module-Level Rules

### `type1-missing`

- **Severity:** error
- **Message:** `Missing required attribute "{name}"`
- **Tag:** The tag of the missing attribute
- **Module:** The module containing the attribute

**Trigger condition:** A Type 1 attribute (or a Type 1C attribute whose condition evaluates to `true`) is not present in the dataset. Type 1 attributes are mandatory and must always be included with a non-empty value.

---

### `type1-empty`

- **Severity:** error
- **Message:** `Required attribute "{name}" must not be empty`
- **Tag:** The tag of the empty attribute
- **Module:** The module containing the attribute

**Trigger condition:** A Type 1 attribute (or a Type 1C attribute whose condition evaluates to `true`) is present in the dataset but has an empty value. An element is considered empty if its value is `null`, an empty string, an empty array, or a zero-length Buffer.

---

### `type2-missing`

- **Severity:** warning
- **Message:** `Missing required-but-empty-allowed attribute "{name}"`
- **Tag:** The tag of the missing attribute
- **Module:** The module containing the attribute

**Trigger condition:** A Type 2 attribute (or a Type 2C attribute whose condition evaluates to `true`) is not present in the dataset. Type 2 attributes must be present but are allowed to have an empty value. Note that if a Type 2 attribute is present with an empty value, no finding is produced — this is valid.

---

### `condition-indeterminate`

- **Severity:** info
- **Tag:** The tag of the conditional attribute
- **Module:** The module containing the attribute

This rule is produced in two scenarios:

**Scenario 1 — No evaluable condition defined:**
- **Message (Type 1C):** `Type 1C attribute "{name}" has no evaluable condition`
- **Message (Type 2C):** `Type 2C attribute "{name}" has no evaluable condition`
- **Trigger condition:** A Type 1C or Type 2C attribute has no condition expression attached to its definition. The validator cannot determine whether the attribute is required, so it reports the situation as informational and skips validation of that attribute.

**Scenario 2 — Condition evaluation is indeterminate:**
- **Message (Type 1C):** `Condition for Type 1C attribute "{name}" could not be fully evaluated`
- **Message (Type 2C):** `Condition for Type 2C attribute "{name}" could not be fully evaluated`
- **Trigger condition:** A Type 1C or Type 2C attribute has a condition expression, but the condition evaluator returns `indeterminate` — typically because the tags referenced in the condition are themselves absent from the dataset. The attribute is skipped and no error is raised.


## Code Example

The following TypeScript example demonstrates how to validate a DICOM file and filter findings by IOD-level and module-level rules:

```typescript
import { validate, type ValidationFinding } from 'dicom-validator-ts';

// IOD-level rules (produced by IODValidator)
const iodLevelRules = [
  'iod-sop-class-missing',
  'iod-sop-class-unknown',
  'iod-module-not-found',
  'iod-module-condition-indeterminate',
];

// Module-level rules (produced by ModuleValidator)
const moduleLevelRules = [
  'type1-missing',
  'type1-empty',
  'type2-missing',
  'condition-indeterminate',
];

async function checkIODValidation(filePath: string) {
  // Run validation with verbose output to include info-level findings
  const result = await validate(filePath, { verbosity: 'verbose' });

  // Filter IOD-level findings
  const iodFindings = result.findings.filter((f) =>
    iodLevelRules.includes(f.rule)
  );

  // Filter module-level findings
  const moduleFindings = result.findings.filter((f) =>
    moduleLevelRules.includes(f.rule)
  );

  // Display IOD-level issues
  if (iodFindings.length > 0) {
    console.log('=== IOD-Level Issues ===');
    for (const finding of iodFindings) {
      console.log(`[${finding.severity}] ${finding.message}`);
    }
  }

  // Display module-level issues grouped by module
  if (moduleFindings.length > 0) {
    console.log('\n=== Module-Level Issues ===');
    const byModule = groupByModule(moduleFindings);
    for (const [moduleName, findings] of Object.entries(byModule)) {
      console.log(`\n  Module: ${moduleName}`);
      for (const finding of findings) {
        console.log(`    [${finding.severity}] ${finding.tag} — ${finding.message}`);
      }
    }
  }
}

function groupByModule(
  findings: readonly ValidationFinding[]
): Record<string, ValidationFinding[]> {
  const grouped: Record<string, ValidationFinding[]> = {};
  for (const finding of findings) {
    const key = finding.module || '(no module)';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(finding);
  }
  return grouped;
}

checkIODValidation('path/to/dicom-file.dcm');
```

This example uses `verbosity: 'verbose'` to ensure info-level findings (such as `iod-module-condition-indeterminate` and `condition-indeterminate`) are included in the results. With the default `'normal'` verbosity, only errors and warnings are returned.
