---
title: VR Validation Reference
description: Complete reference of all Value Representation (VR) validation rules, message templates, and trigger conditions in dicom-validator-ts
---

# VR Validation Reference

Value Representation (VR) validation checks that DICOM tag values conform to the format constraints defined by the DICOM standard for each VR type. When a tag value violates its VR format rules, the validator produces a finding with the corresponding rule identifier.

This page documents all 19 VR-related validation rules produced by dicom-validator-ts:

- **15 format error rules** (`vr-format-*`) — one per string-based VR type that has format constraints
- **2 warning rules** — for unknown or undetermined VR situations
- **2 info rules** — for private and retired tags encountered during validation

## Rules Summary

| Rule Identifier | Severity | Description |
|-----------------|----------|-------------|
| `vr-format-AE` | error | Application Entity value exceeds 16 characters, contains backslash, or contains control characters |
| `vr-format-AS` | error | Age String value is not exactly 4 characters or does not match NNN[DWMY] format |
| `vr-format-CS` | error | Code String value exceeds 16 characters or contains disallowed characters |
| `vr-format-DA` | error | Date value is not in YYYYMMDD format or has an invalid month/day |
| `vr-format-DS` | error | Decimal String value exceeds 16 characters or is not a valid numeric format |
| `vr-format-IS` | error | Integer String value exceeds 12 characters or is not a valid integer format |
| `vr-format-LO` | error | Long String value exceeds 64 characters, contains backslash, or contains control characters |
| `vr-format-LT` | error | Long Text value exceeds 10240 characters |
| `vr-format-PN` | error | Person Name value has too many component groups, a group exceeds 64 characters, or too many components in a group |
| `vr-format-SH` | error | Short String value exceeds 16 characters, contains backslash, or contains control characters |
| `vr-format-ST` | error | Short Text value exceeds 1024 characters |
| `vr-format-TM` | error | Time value does not match HH, HHMM, HHMMSS, or HHMMSS.FFFFFF format, or has invalid hour/minute/second |
| `vr-format-UI` | error | Unique Identifier value exceeds 64 characters, contains invalid characters, or has structural issues |
| `vr-format-UR` | error | URI value has trailing spaces |
| `vr-format-UT` | error | Unlimited Text value exceeds maximum length (2^32-2 characters) |
| `vr-unknown` | warning | No validator is registered for the specified VR |
| `vr-undetermined` | warning | The VR could not be determined for a tag (not in dictionary and no explicit VR) |
| `retired-tag` | info | A retired tag is being used in the dataset |
| `private-tag-skipped` | info | A private tag was skipped during VR/VM validation |

## Detailed Rule Reference

### `vr-format-AE` — Application Entity

**Severity:** error

AE values must be at most 16 characters, must not contain backslash characters, and must not contain control characters (except ESC).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 16 characters | `AE value exceeds maximum length of 16 characters (got {length})` |
| Value contains backslash | `AE value must not contain backslash characters` |
| Value contains control characters (other than ESC) | `AE value contains invalid control characters` |

**Trigger conditions:**

- `value.length > 16`
- `value.includes('\\')` is true
- Value contains any character in the range `\x00`–`\x1A` or `\x1C`–`\x1F`

---

### `vr-format-AS` — Age String

**Severity:** error

AS values must be exactly 4 characters in the format `NNNx` where `x` is one of `D` (days), `W` (weeks), `M` (months), or `Y` (years).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value is not exactly 4 characters | `AS value must be exactly 4 characters (got {length})` |
| Value does not match NNN[DWMY] pattern | `AS value must match format NNNx where x is D, W, M, or Y (got "{value}")` |

**Trigger conditions:**

- `value.length !== 4`
- Value does not match the regex `^\d{3}[DWMY]$`

---

### `vr-format-CS` — Code String

**Severity:** error

CS values must be at most 16 characters and contain only uppercase letters, digits, spaces, and underscores.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 16 characters | `CS value exceeds maximum length of 16 characters (got {length})` |
| Value contains disallowed characters | `CS value must contain only uppercase letters, digits, spaces, and underscores` |

**Trigger conditions:**

- `value.length > 16`
- Value does not match the regex `^[A-Z0-9 _]*$`

---

### `vr-format-DA` — Date

**Severity:** error

DA values must be exactly 8 digits in `YYYYMMDD` format with a valid month (01–12) and a valid day for the given month and year (including leap year rules).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value is not exactly 8 digits | `DA value must be exactly 8 digits in YYYYMMDD format (got "{value}")` |
| Month is out of range | `DA value has invalid month {MM} (must be 01-12)` |
| Day is out of range for the month | `DA value has invalid day {DD} for month {MM} (max {maxDays} days)` |

**Trigger conditions:**

- Value does not match the regex `^\d{8}$`
- Parsed month is less than 1 or greater than 12
- Parsed day is less than 1 or greater than the maximum days for the given month/year

---

### `vr-format-DS` — Decimal String

**Severity:** error

DS values must be at most 16 characters (after trimming) and must be a valid decimal number (optional sign, digits, optional decimal point, optional exponent).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Trimmed value exceeds 16 characters | `DS value exceeds maximum length of 16 characters (got {length})` |
| Value is not a valid decimal string | `DS value is not a valid decimal string (got "{value}")` |

**Trigger conditions:**

- `trimmed.length > 16`
- Trimmed value does not match the regex `^[+-]?(\d+\.?\d*|\d*\.?\d+)([eE][+-]?\d+)?$`

---

### `vr-format-IS` — Integer String

**Severity:** error

IS values must be at most 12 characters (after trimming) and must be a valid integer (optional sign followed by digits).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Trimmed value exceeds 12 characters | `IS value exceeds maximum length of 12 characters (got {length})` |
| Value is not a valid integer string | `IS value is not a valid integer string (got "{value}")` |

**Trigger conditions:**

- `trimmed.length > 12`
- Trimmed value does not match the regex `^[+-]?\d+$`

---

### `vr-format-LO` — Long String

**Severity:** error

LO values must be at most 64 characters, must not contain backslash characters, and must not contain control characters (except ESC).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 64 characters | `LO value exceeds maximum length of 64 characters (got {length})` |
| Value contains backslash | `LO value must not contain backslash characters` |
| Value contains control characters (other than ESC) | `LO value contains invalid control characters` |

**Trigger conditions:**

- `value.length > 64`
- `value.includes('\\')` is true
- Value contains any character in the range `\x00`–`\x1A` or `\x1C`–`\x1F`

---

### `vr-format-LT` — Long Text

**Severity:** error

LT values must be at most 10240 characters.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 10240 characters | `LT value exceeds maximum length of 10240 characters (got {length})` |

**Trigger conditions:**

- `value.length > 10240`

---

### `vr-format-PN` — Person Name

**Severity:** error

PN values use `=` to separate component groups (max 3: alphabetic, ideographic, phonetic) and `^` to separate components within each group (max 5: family, given, middle, prefix, suffix). Each component group must be at most 64 characters.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Too many component groups | `PN value has too many component groups (got {count}, max 3)` |
| A component group exceeds 64 characters | `PN component group {n} exceeds maximum length of 64 characters (got {length})` |
| A component group has too many components | `PN component group {n} has too many components (got {count}, max 5)` |

**Trigger conditions:**

- Number of `=`-separated groups exceeds 3
- Any group's length exceeds 64 characters
- Any group has more than 5 `^`-separated components

---

### `vr-format-SH` — Short String

**Severity:** error

SH values must be at most 16 characters, must not contain backslash characters, and must not contain control characters (except ESC).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 16 characters | `SH value exceeds maximum length of 16 characters (got {length})` |
| Value contains backslash | `SH value must not contain backslash characters` |
| Value contains control characters (other than ESC) | `SH value contains invalid control characters` |

**Trigger conditions:**

- `value.length > 16`
- `value.includes('\\')` is true
- Value contains any character in the range `\x00`–`\x1A` or `\x1C`–`\x1F`

---

### `vr-format-ST` — Short Text

**Severity:** error

ST values must be at most 1024 characters.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 1024 characters | `ST value exceeds maximum length of 1024 characters (got {length})` |

**Trigger conditions:**

- `value.length > 1024`

---

### `vr-format-TM` — Time

**Severity:** error

TM values must match one of the truncated time formats: `HH`, `HHMM`, `HHMMSS`, or `HHMMSS.FFFFFF` (1–6 fractional digits). Trailing spaces are trimmed before validation. Hours must be 00–23, minutes 00–59, and seconds 00–59.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value does not match any valid format | `TM value does not match any valid format (HH, HHMM, HHMMSS, or HHMMSS.FFFFFF) (got "{value}")` |
| Fractional seconds without full HHMMSS | `TM value has fractional seconds without full HHMMSS prefix (got "{value}")` |
| Invalid hour | `TM value has invalid hour {HH} (must be 00-23) (got "{value}")` |
| Invalid minute | `TM value has invalid minute {MM} (must be 00-59) (got "{value}")` |
| Invalid second | `TM value has invalid second {SS} (must be 00-59) (got "{value}")` |

**Trigger conditions:**

- Trimmed value does not match the regex `^(\d{2})(\d{2})?(\d{2})?(\.\d{1,6})?$`
- Fractional part is present but minutes or seconds are missing
- Parsed hour > 23
- Parsed minute > 59
- Parsed second > 59

---

### `vr-format-UI` — Unique Identifier

**Severity:** error

UI values must be at most 64 characters, contain only digits and periods, must not start or end with a period, and must not contain consecutive periods (empty components). Trailing null characters are trimmed before validation (DICOM padding).

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds 64 characters | `UI value exceeds maximum length of 64 characters (got {length})` |
| Value contains invalid characters | `UI value must contain only digits (0-9) and periods (.)` |
| Value starts with a period | `UI value must not start with a period` |
| Value ends with a period | `UI value must not end with a period` |
| Value contains consecutive periods | `UI value must not contain empty components (consecutive periods)` |

**Trigger conditions:**

- `trimmed.length > 64` (after removing trailing null characters)
- Value does not match the regex `^[0-9.]+$`
- `trimmed.startsWith('.')` is true
- `trimmed.endsWith('.')` is true
- `trimmed.includes('..')` is true

---

### `vr-format-UR` — Universal Resource Identifier

**Severity:** error

UR values must not have trailing spaces. Maximum length is 2³²−2 (4,294,967,294) characters.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds maximum length | `UR value exceeds maximum length of 4294967294 characters` |
| Value has trailing spaces | `UR value must not have trailing spaces` |

**Trigger conditions:**

- `value.length > 4294967294`
- `value !== value.trimEnd()`

---

### `vr-format-UT` — Unlimited Text

**Severity:** error

UT values must not exceed 2³²−2 (4,294,967,294) characters.

**Message templates:**

| Condition | Message |
|-----------|---------|
| Value exceeds maximum length | `UT value exceeds maximum length of 4294967294 characters` |

**Trigger conditions:**

- `value.length > 4294967294`

---

### `vr-unknown`

**Severity:** warning

Produced when no validator is registered for the VR code specified on a tag. This typically indicates a non-standard or unrecognized VR.

**Message template:**

```
No validator registered for VR "{vr}"
```

**Trigger condition:**

- The `getVRValidator(expectedVR)` lookup returns `undefined` for the given VR code

---

### `vr-undetermined`

**Severity:** warning

Produced when the VR cannot be determined for a tag — the element has no explicit VR and the tag is not found in the dictionary with a VR definition.

**Message template:**

```
VR could not be determined for tag
```

**Trigger condition:**

- `element.vr` is not set AND `tagDef.vr` is not set (both are falsy)

---

### `retired-tag`

**Severity:** info

Produced when a tag in the dataset is marked as retired in the DICOM dictionary. The tag is still validated for VR/VM compliance.

**Message template:**

```
Tag "{tagName}" is retired
```

**Trigger condition:**

- `tagDef.retired` is `true` for the tag in the dictionary

---

### `private-tag-skipped`

**Severity:** info

Produced when a private tag (odd group number) is encountered. VR and VM validation is not performed on private tags.

**Message template:**

```
Private tag skipped: VR/VM validation not performed
```

**Trigger condition:**

- `dictionary.isPrivateTag(tagId)` returns `true` (the tag has an odd group number)


## Code Example

The following TypeScript example demonstrates how to run validation and filter findings to only VR-related rules:

```typescript
import { validate, type ValidationFinding } from 'dicom-validator-ts';

// VR-related rule prefixes and identifiers
const VR_RULES = [
  'vr-format-',
  'vr-unknown',
  'vr-undetermined',
  'retired-tag',
  'private-tag-skipped',
];

function isVRFinding(finding: ValidationFinding): boolean {
  return VR_RULES.some((rule) => finding.rule.startsWith(rule));
}

async function checkVRValidation(filePath: string) {
  // Run validation with verbose output to include info-level findings
  const result = await validate(filePath, { verbosity: 'verbose' });

  // Filter to only VR-related findings
  const vrFindings = result.findings.filter(isVRFinding);

  console.log(`Found ${vrFindings.length} VR-related finding(s):\n`);

  for (const finding of vrFindings) {
    console.log(`[${finding.severity}] ${finding.rule}`);
    console.log(`  Tag: ${finding.tag || '(none)'}`);
    console.log(`  Message: ${finding.message}\n`);
  }

  // Summarize by severity
  const errors = vrFindings.filter((f) => f.severity === 'error');
  const warnings = vrFindings.filter((f) => f.severity === 'warning');
  const infos = vrFindings.filter((f) => f.severity === 'info');

  console.log('Summary:');
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Info: ${infos.length}`);
}

checkVRValidation('./my-dicom-file.dcm');
```
