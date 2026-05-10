import { expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { IODValidator } from './iod-validator.js';
import { DictionaryLoader } from '../dictionary/loader.js';
import { ConditionEvaluator } from '../condition/evaluator.js';
import { DicomDataset } from '../types/dataset.js';
import type { DicomElement } from '../types/dataset.js';

/**
 * Preservation Property Tests
 *
 * Property 2: Preservation - Existing Validation Behavior Unchanged
 *
 * These tests capture the EXISTING behavior on UNFIXED code for non-buggy inputs.
 * They must PASS on unfixed code, confirming the baseline behavior that must be
 * preserved after the fix is applied.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

const CT_SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.2';

// Load real dictionary data
const loader = DictionaryLoader.getInstance();
const iodRegistry = loader.getIODRegistry();
const moduleRegistry = loader.getModuleRegistry();
const conditionEvaluator = new ConditionEvaluator();
const validator = new IODValidator();

/**
 * Build a complete CT Image Storage dataset with ALL required attributes present,
 * including the 4 attributes that are missing from modules.json (Rescale Intercept,
 * Rescale Slope, Patient Position, Acquisition Number).
 *
 * This dataset should produce no type1-missing or type2-missing findings for any
 * of these attributes because they are all present.
 */
function buildCompleteCTDataset(): Map<string, DicomElement> {
  const elements = new Map<string, DicomElement>();

  // SOP Class UID - identifies this as CT Image Storage
  elements.set('(0008,0016)', { tag: '(0008,0016)', vr: 'UI', value: CT_SOP_CLASS_UID });

  // Patient module (M) - Type 2 attributes
  elements.set('(0010,0010)', { tag: '(0010,0010)', vr: 'PN', value: 'Test^Patient' });
  elements.set('(0010,0020)', { tag: '(0010,0020)', vr: 'LO', value: 'PAT001' });
  elements.set('(0010,0030)', { tag: '(0010,0030)', vr: 'DA', value: '19800101' });
  elements.set('(0010,0040)', { tag: '(0010,0040)', vr: 'CS', value: 'M' });

  // General Study module (M)
  elements.set('(0008,0020)', { tag: '(0008,0020)', vr: 'DA', value: '20240101' });
  elements.set('(0008,0030)', { tag: '(0008,0030)', vr: 'TM', value: '120000' });
  elements.set('(0008,0050)', { tag: '(0008,0050)', vr: 'SH', value: 'ACC001' });
  elements.set('(0008,0090)', { tag: '(0008,0090)', vr: 'PN', value: 'Dr^Ref' });
  elements.set('(0020,000D)', { tag: '(0020,000D)', vr: 'UI', value: '1.2.3.4.5' });
  elements.set('(0020,0010)', { tag: '(0020,0010)', vr: 'SH', value: 'STUDY1' });

  // General Series module (M)
  elements.set('(0008,0060)', { tag: '(0008,0060)', vr: 'CS', value: 'CT' });
  elements.set('(0020,000E)', { tag: '(0020,000E)', vr: 'UI', value: '1.2.3.4.5.6' });
  elements.set('(0020,0011)', { tag: '(0020,0011)', vr: 'IS', value: '1' });
  // Patient Position - should be Type 2C in General Series (not in modules.json yet)
  elements.set('(0018,5100)', { tag: '(0018,5100)', vr: 'CS', value: 'HFS' });

  // Frame of Reference module (M)
  elements.set('(0020,0052)', { tag: '(0020,0052)', vr: 'UI', value: '1.2.3.4.5.6.7' });
  elements.set('(0020,1040)', { tag: '(0020,1040)', vr: 'LO', value: '' });

  // General Equipment module (M)
  elements.set('(0008,0070)', { tag: '(0008,0070)', vr: 'LO', value: 'TestMfg' });
  elements.set('(0008,0080)', { tag: '(0008,0080)', vr: 'LO', value: 'TestInst' });
  elements.set('(0008,1010)', { tag: '(0008,1010)', vr: 'SH', value: 'STATION1' });
  elements.set('(0008,1090)', { tag: '(0008,1090)', vr: 'LO', value: 'Model1' });
  elements.set('(0018,1020)', { tag: '(0018,1020)', vr: 'LO', value: '1.0' });

  // General Image module (M)
  elements.set('(0020,0013)', { tag: '(0020,0013)', vr: 'IS', value: '1' });
  elements.set('(0008,0023)', { tag: '(0008,0023)', vr: 'DA', value: '20240101' });
  elements.set('(0008,0033)', { tag: '(0008,0033)', vr: 'TM', value: '120000' });
  elements.set('(0020,0020)', { tag: '(0020,0020)', vr: 'CS', value: 'L\\P' });
  // Acquisition Number - Type 3 in General Image (present, so no finding)
  elements.set('(0020,0012)', { tag: '(0020,0012)', vr: 'IS', value: '1' });

  // Image Plane module (M)
  elements.set('(0028,0030)', { tag: '(0028,0030)', vr: 'DS', value: '0.5\\0.5' });
  elements.set('(0020,0037)', { tag: '(0020,0037)', vr: 'DS', value: '1\\0\\0\\0\\1\\0' });
  elements.set('(0020,0032)', { tag: '(0020,0032)', vr: 'DS', value: '0\\0\\0' });
  elements.set('(0018,0050)', { tag: '(0018,0050)', vr: 'DS', value: '5.0' });
  elements.set('(0020,1041)', { tag: '(0020,1041)', vr: 'DS', value: '0' });

  // Image Pixel module (M)
  elements.set('(0028,0002)', { tag: '(0028,0002)', vr: 'US', value: 1 });
  elements.set('(0028,0004)', { tag: '(0028,0004)', vr: 'CS', value: 'MONOCHROME2' });
  elements.set('(0028,0010)', { tag: '(0028,0010)', vr: 'US', value: 512 });
  elements.set('(0028,0011)', { tag: '(0028,0011)', vr: 'US', value: 512 });
  elements.set('(0028,0100)', { tag: '(0028,0100)', vr: 'US', value: 16 });
  elements.set('(0028,0101)', { tag: '(0028,0101)', vr: 'US', value: 12 });
  elements.set('(0028,0102)', { tag: '(0028,0102)', vr: 'US', value: 11 });
  elements.set('(0028,0103)', { tag: '(0028,0103)', vr: 'US', value: 0 });
  elements.set('(7FE0,0010)', { tag: '(7FE0,0010)', vr: 'OW', value: Buffer.alloc(4) });

  // CT Image module (M)
  elements.set('(0008,0008)', { tag: '(0008,0008)', vr: 'CS', value: 'ORIGINAL\\PRIMARY\\AXIAL' });
  elements.set('(0018,0060)', { tag: '(0018,0060)', vr: 'DS', value: '120' });
  // Rescale Intercept - should be Type 2 in CT Image (not in modules.json yet)
  elements.set('(0028,1052)', { tag: '(0028,1052)', vr: 'DS', value: '0' });
  // Rescale Slope - should be Type 2 in CT Image (not in modules.json yet)
  elements.set('(0028,1053)', { tag: '(0028,1053)', vr: 'DS', value: '1' });

  return elements;
}

/**
 * Collect all tags that are defined in any module of the CT Image IOD.
 * This is used to ensure we only add tags that belong to modules (no unexpected tags).
 */
function getAllModuleTagsForCT(): Set<string> {
  const tags = new Set<string>();
  const iodDef = iodRegistry.getIOD(CT_SOP_CLASS_UID);
  if (!iodDef) return tags;

  for (const moduleRef of iodDef.modules) {
    const moduleDef = moduleRegistry.getModule(moduleRef.moduleId);
    if (moduleDef) {
      for (const attr of moduleDef.attributes) {
        tags.add(attr.tag);
      }
    }
  }
  return tags;
}

// --- Preservation Property 1: Complete CT Dataset produces no type1/type2-missing findings ---

/**
 * Arbitrary that generates valid values for optional Type 3 attributes that can be
 * added to the complete dataset. These are all module-defined tags.
 */
const optionalModuleTagArb: fc.Arbitrary<Array<{ tag: string; vr: string; value: string }>> = fc.constantFrom(
  { tag: '(0008,0021)', vr: 'DA', value: '20240101' },  // Series Date (General Series, Type 3)
  { tag: '(0008,0031)', vr: 'TM', value: '120000' },    // Series Time (General Series, Type 3)
  { tag: '(0008,0022)', vr: 'DA', value: '20240101' },  // Acquisition Date (General Image, Type 3)
  { tag: '(0008,0032)', vr: 'TM', value: '120000' },    // Acquisition Time (General Image, Type 3)
  { tag: '(0008,0081)', vr: 'ST', value: '123 Main St' }, // Institution Address (General Equipment, Type 3)
  { tag: '(0018,1000)', vr: 'LO', value: 'SN12345' },   // Device Serial Number (General Equipment, Type 3)
).chain((item) =>
  fc.subarray([item], { minLength: 0, maxLength: 1 }).map((arr) => arr)
);

test.prop(
  [fc.subarray([
    { tag: '(0008,0021)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0031)', vr: 'TM', value: '120000' },
    { tag: '(0008,0022)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0032)', vr: 'TM', value: '120000' },
    { tag: '(0008,0081)', vr: 'ST', value: '123 Main St' },
    { tag: '(0018,1000)', vr: 'LO', value: 'SN12345' },
  ], { minLength: 0, maxLength: 6 })],
  { numRuns: 30 },
)(
  'Preservation: Complete CT dataset with all module attributes produces no type1-missing or type2-missing findings for those attributes',
  (additionalTags) => {
    // Build a complete CT dataset with all required attributes present
    const elements = buildCompleteCTDataset();

    // Add optional Type 3 module-defined tags
    for (const { tag, vr, value } of additionalTags) {
      elements.set(tag, { tag, vr, value });
    }

    const dataset = new DicomDataset(elements);

    // Validate using the real (unfixed) dictionary data
    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    // Assert no type1-missing or type2-missing findings for any tag in the dataset
    const missingFindings = findings.filter(
      (f) => (f.rule === 'type1-missing' || f.rule === 'type2-missing') &&
             elements.has(f.tag)
    );

    expect(
      missingFindings.length,
      `Expected no type1-missing or type2-missing findings for present attributes, ` +
      `but got: [${missingFindings.map((f) => `${f.tag}:${f.rule}`).join(', ')}]`
    ).toBe(0);
  },
);

// --- Preservation Property 2: Private tags do NOT produce unexpected-tag findings ---

/**
 * Arbitrary that generates private tags (odd group number).
 * Private tags should produce info-level findings from TagValidator, NOT unexpected-tag.
 */
const privateTagArb: fc.Arbitrary<{ tag: string; vr: string; value: string }> = fc.tuple(
  // Odd group numbers for private tags
  fc.constantFrom('0009', '0011', '0013', '0015', '0019', '0021', '0023', '7FE1'),
  // Element numbers
  fc.constantFrom('0010', '0020', '0030', '1000', '1001', '1010'),
).map(([group, element]) => ({
  tag: `(${group},${element})`,
  vr: 'LO',
  value: 'PrivateData',
}));

test.prop(
  [fc.array(privateTagArb, { minLength: 1, maxLength: 5 })],
  { numRuns: 30 },
)(
  'Preservation: Datasets with private tags do NOT produce unexpected-tag findings from IOD validator',
  (privateTags) => {
    // Build a complete CT dataset and add private tags
    const elements = buildCompleteCTDataset();

    // Deduplicate private tags by tag ID
    const seen = new Set<string>();
    for (const { tag, vr, value } of privateTags) {
      if (!seen.has(tag)) {
        elements.set(tag, { tag, vr, value });
        seen.add(tag);
      }
    }

    const dataset = new DicomDataset(elements);

    // Validate using the IOD validator (not TagValidator)
    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    // Assert NO unexpected-tag findings are produced for private tags
    const unexpectedTagFindings = findings.filter(
      (f) => f.rule === 'unexpected-tag'
    );

    expect(
      unexpectedTagFindings.length,
      `Expected no unexpected-tag findings for private tags, ` +
      `but got: [${unexpectedTagFindings.map((f) => `${f.tag}:${f.rule}`).join(', ')}]`
    ).toBe(0);
  },
);

// --- Preservation Property 3: Module-defined tags do NOT produce unexpected-tag findings ---

/**
 * Arbitrary that generates datasets containing ONLY tags that are defined in
 * IOD modules. These should never produce unexpected-tag findings.
 */
const moduleDefinedTagSubsetArb: fc.Arbitrary<Array<{ tag: string; vr: string; value: string }>> = (() => {
  // All tags from all CT Image IOD modules (from modules.json)
  const allModuleTags = [
    // Patient module
    { tag: '(0010,0010)', vr: 'PN', value: 'Test^Patient' },
    { tag: '(0010,0020)', vr: 'LO', value: 'PAT001' },
    { tag: '(0010,0030)', vr: 'DA', value: '19800101' },
    { tag: '(0010,0040)', vr: 'CS', value: 'M' },
    // General Study module
    { tag: '(0008,0020)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0030)', vr: 'TM', value: '120000' },
    { tag: '(0008,0050)', vr: 'SH', value: 'ACC001' },
    { tag: '(0008,0090)', vr: 'PN', value: 'Dr^Ref' },
    { tag: '(0020,000D)', vr: 'UI', value: '1.2.3.4.5' },
    { tag: '(0020,0010)', vr: 'SH', value: 'STUDY1' },
    // General Series module
    { tag: '(0008,0060)', vr: 'CS', value: 'CT' },
    { tag: '(0020,000E)', vr: 'UI', value: '1.2.3.4.5.6' },
    { tag: '(0020,0011)', vr: 'IS', value: '1' },
    { tag: '(0008,0021)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0031)', vr: 'TM', value: '120000' },
    // General Image module
    { tag: '(0020,0013)', vr: 'IS', value: '1' },
    { tag: '(0008,0023)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0033)', vr: 'TM', value: '120000' },
    { tag: '(0020,0020)', vr: 'CS', value: 'L\\P' },
    { tag: '(0020,0012)', vr: 'IS', value: '1' },
    { tag: '(0008,0022)', vr: 'DA', value: '20240101' },
    { tag: '(0008,0032)', vr: 'TM', value: '120000' },
    // Frame of Reference module
    { tag: '(0020,0052)', vr: 'UI', value: '1.2.3.4.5.6.7' },
    { tag: '(0020,1040)', vr: 'LO', value: '' },
    // General Equipment module
    { tag: '(0008,0070)', vr: 'LO', value: 'TestMfg' },
    { tag: '(0008,0080)', vr: 'LO', value: 'TestInst' },
    { tag: '(0008,0081)', vr: 'ST', value: '123 Main St' },
    { tag: '(0008,1010)', vr: 'SH', value: 'STATION1' },
    { tag: '(0008,1090)', vr: 'LO', value: 'Model1' },
    { tag: '(0018,1000)', vr: 'LO', value: 'SN12345' },
    { tag: '(0018,1020)', vr: 'LO', value: '1.0' },
    // Image Plane module
    { tag: '(0028,0030)', vr: 'DS', value: '0.5\\0.5' },
    { tag: '(0020,0037)', vr: 'DS', value: '1\\0\\0\\0\\1\\0' },
    { tag: '(0020,0032)', vr: 'DS', value: '0\\0\\0' },
    { tag: '(0018,0050)', vr: 'DS', value: '5.0' },
    { tag: '(0020,1041)', vr: 'DS', value: '0' },
    // Image Pixel module
    { tag: '(0028,0002)', vr: 'US', value: '1' },
    { tag: '(0028,0004)', vr: 'CS', value: 'MONOCHROME2' },
    { tag: '(0028,0010)', vr: 'US', value: '512' },
    { tag: '(0028,0011)', vr: 'US', value: '512' },
    { tag: '(0028,0100)', vr: 'US', value: '16' },
    { tag: '(0028,0101)', vr: 'US', value: '12' },
    { tag: '(0028,0102)', vr: 'US', value: '11' },
    { tag: '(0028,0103)', vr: 'US', value: '0' },
    // CT Image module
    { tag: '(0008,0008)', vr: 'CS', value: 'ORIGINAL\\PRIMARY\\AXIAL' },
    { tag: '(0018,0060)', vr: 'DS', value: '120' },
    { tag: '(0028,1050)', vr: 'DS', value: '40' },
    { tag: '(0028,1051)', vr: 'DS', value: '400' },
  ];

  return fc.subarray(allModuleTags, { minLength: 0, maxLength: allModuleTags.length });
})();

test.prop(
  [moduleDefinedTagSubsetArb],
  { numRuns: 30 },
)(
  'Preservation: Datasets with only IOD-module-defined tags produce no unexpected-tag findings',
  (additionalModuleTags) => {
    // Build a complete CT dataset (only module-defined tags)
    const elements = buildCompleteCTDataset();

    // Add additional module-defined tags (all from modules.json)
    for (const { tag, vr, value } of additionalModuleTags) {
      elements.set(tag, { tag, vr, value });
    }

    const dataset = new DicomDataset(elements);

    // Validate using the IOD validator
    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    // Assert NO unexpected-tag findings are produced
    const unexpectedTagFindings = findings.filter(
      (f) => f.rule === 'unexpected-tag'
    );

    expect(
      unexpectedTagFindings.length,
      `Expected no unexpected-tag findings for module-defined tags, ` +
      `but got: [${unexpectedTagFindings.map((f) => `${f.tag}:${f.rule}`).join(', ')}]`
    ).toBe(0);
  },
);

// --- Preservation Property 4: Missing/unknown SOP Class UID produces expected errors ---

test.prop(
  [fc.constantFrom(
    { uid: '', expectedRule: 'iod-sop-class-missing' },
    { uid: '9.9.9.9.9.9.9', expectedRule: 'iod-sop-class-unknown' },
    { uid: '1.2.840.10008.99.99.99', expectedRule: 'iod-sop-class-unknown' },
  )],
  { numRuns: 10 },
)(
  'Preservation: Missing or unknown SOP Class UID produces iod-sop-class-missing or iod-sop-class-unknown',
  ({ uid, expectedRule }) => {
    const elements = new Map<string, DicomElement>();

    if (uid) {
      // Set an unknown SOP Class UID
      elements.set('(0008,0016)', { tag: '(0008,0016)', vr: 'UI', value: uid });
    }
    // If uid is empty, don't set the SOP Class UID tag at all

    const dataset = new DicomDataset(elements);

    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    const matchingFindings = findings.filter((f) => f.rule === expectedRule);

    expect(
      matchingFindings.length,
      `Expected ${expectedRule} finding for SOP Class UID "${uid}", ` +
      `but got rules: [${findings.map((f) => f.rule).join(', ')}]`
    ).toBeGreaterThanOrEqual(1);
  },
);
