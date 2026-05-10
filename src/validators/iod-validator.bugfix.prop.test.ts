import { expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { IODValidator } from './iod-validator.js';
import { DictionaryLoader } from '../dictionary/loader.js';
import { ConditionEvaluator } from '../condition/evaluator.js';
import { DicomDataset } from '../types/dataset.js';
import type { DicomElement } from '../types/dataset.js';

/**
 * Bug Condition Exploration Test
 *
 * Property 1: Bug Condition - Missing Module Attributes and Unexpected Tags Not Detected
 *
 * This test encodes the EXPECTED behavior after the fix. It is expected to FAIL
 * on unfixed code, confirming the bug exists. When the fix is applied, this test
 * will pass, confirming the bug is resolved.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
 */

const CT_SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.2';

// Tags that should be Type 2 in CT Image module but are missing from modules.json
const RESCALE_INTERCEPT_TAG = '(0028,1052)';
const RESCALE_SLOPE_TAG = '(0028,1053)';
const ACQUISITION_NUMBER_TAG = '(0020,0012)';

// Tag that should be Type 2C in General Series module but is missing from modules.json
const PATIENT_POSITION_TAG = '(0018,5100)';

// All 4 bug-condition tags
const BUG_CONDITION_TAGS = [
  RESCALE_INTERCEPT_TAG,
  RESCALE_SLOPE_TAG,
  PATIENT_POSITION_TAG,
  ACQUISITION_NUMBER_TAG,
] as const;

// Load real dictionary data (unfixed)
const loader = DictionaryLoader.getInstance();
const iodRegistry = loader.getIODRegistry();
const moduleRegistry = loader.getModuleRegistry();
const conditionEvaluator = new ConditionEvaluator();
const validator = new IODValidator();

/**
 * Build a minimal valid CT Image Storage dataset with all required attributes present.
 * This serves as the baseline — removing specific tags from this will trigger the bug condition.
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
  // Patient Position - should be Type 2C in General Series but is NOT in modules.json
  elements.set(PATIENT_POSITION_TAG, { tag: PATIENT_POSITION_TAG, vr: 'CS', value: 'HFS' });

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
  // Acquisition Number - Type 3 in General Image, should be Type 2 in CT Image
  elements.set(ACQUISITION_NUMBER_TAG, { tag: ACQUISITION_NUMBER_TAG, vr: 'IS', value: '1' });

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
  elements.set('(0018,0050)', { tag: '(0018,0050)', vr: 'DS', value: '5.0' });
  elements.set('(0018,0060)', { tag: '(0018,0060)', vr: 'DS', value: '120' });
  // Rescale Intercept - should be Type 2 in CT Image but is NOT in modules.json
  elements.set(RESCALE_INTERCEPT_TAG, { tag: RESCALE_INTERCEPT_TAG, vr: 'DS', value: '0' });
  // Rescale Slope - should be Type 2 in CT Image but is NOT in modules.json
  elements.set(RESCALE_SLOPE_TAG, { tag: RESCALE_SLOPE_TAG, vr: 'DS', value: '1' });

  return elements;
}

// --- Property 1: Missing Module Attributes Not Detected (Bug Condition) ---

/**
 * Arbitrary that generates a non-empty subset of the 4 bug-condition tags to remove.
 * This creates CT Image datasets with varying combinations of missing attributes.
 */
const missingTagSubsetArb: fc.Arbitrary<string[]> = fc
  .subarray([...BUG_CONDITION_TAGS], { minLength: 1, maxLength: 4 })
  .filter((arr) => arr.length > 0);

test.prop(
  [missingTagSubsetArb],
  { numRuns: 20 },
)(
  'Bug Condition: CT Image dataset missing module attributes should produce type2-missing findings',
  (tagsToRemove) => {
    // Build a complete CT dataset and remove the selected tags
    const elements = buildCompleteCTDataset();
    for (const tag of tagsToRemove) {
      elements.delete(tag);
    }
    const dataset = new DicomDataset(elements);

    // Validate using the real (unfixed) dictionary data
    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    // For each removed tag, assert a type2-missing finding is produced
    for (const removedTag of tagsToRemove) {
      const type2MissingForTag = findings.filter(
        (f) => f.tag === removedTag && f.rule === 'type2-missing'
      );
      expect(
        type2MissingForTag.length,
        `Expected type2-missing finding for tag ${removedTag} but got ${type2MissingForTag.length} findings. ` +
        `Total findings: ${findings.length}. Rules found: [${findings.map((f) => `${f.tag}:${f.rule}`).join(', ')}]`
      ).toBeGreaterThanOrEqual(1);
    }
  },
);

// --- Property 2: Unexpected Tags Not Detected (Bug Condition) ---

/**
 * Arbitrary that generates non-module, non-private tags to add to a dataset.
 * These are tags that should trigger unexpected-tag findings but currently don't.
 *
 * We use concrete known-unexpected tags to keep the test focused and deterministic.
 */
const unexpectedTagArb: fc.Arbitrary<{ tag: string; vr: string; value: string }> = fc.constantFrom(
  { tag: '(0000,0000)', vr: 'UL', value: '0' },           // Command Group Length
  { tag: '(0008,0054)', vr: 'AE', value: 'TESTAE' },      // Retrieve AE Title
  { tag: '(0008,0120)', vr: 'UR', value: 'urn:test:123' }, // URN Code Value
  { tag: '(0008,0119)', vr: 'UC', value: 'LongCodeVal' },  // Long Code Value
);

/**
 * Arbitrary that generates 1-3 unexpected tags to add to the dataset.
 */
const unexpectedTagsArb: fc.Arbitrary<Array<{ tag: string; vr: string; value: string }>> = fc
  .array(unexpectedTagArb, { minLength: 1, maxLength: 3 })
  .map((tags) => {
    // Deduplicate by tag
    const seen = new Set<string>();
    return tags.filter((t) => {
      if (seen.has(t.tag)) return false;
      seen.add(t.tag);
      return true;
    });
  })
  .filter((tags) => tags.length > 0);

test.prop(
  [unexpectedTagsArb],
  { numRuns: 20 },
)(
  'Bug Condition: Dataset with non-module tags should produce unexpected-tag findings',
  (unexpectedTags) => {
    // Build a complete CT dataset and add unexpected tags
    const elements = buildCompleteCTDataset();
    for (const { tag, vr, value } of unexpectedTags) {
      elements.set(tag, { tag, vr, value });
    }
    const dataset = new DicomDataset(elements);

    // Validate using the real (unfixed) dictionary data
    const findings = validator.validate(dataset, iodRegistry, moduleRegistry, conditionEvaluator);

    // For each unexpected tag, assert an unexpected-tag finding is produced
    for (const { tag } of unexpectedTags) {
      const unexpectedFindings = findings.filter(
        (f) => f.tag === tag && f.rule === 'unexpected-tag'
      );
      expect(
        unexpectedFindings.length,
        `Expected unexpected-tag finding for tag ${tag} but got ${unexpectedFindings.length} findings. ` +
        `Total findings: ${findings.length}. Rules found: [${findings.map((f) => `${f.tag}:${f.rule}`).join(', ')}]`
      ).toBeGreaterThanOrEqual(1);
    }
  },
);
