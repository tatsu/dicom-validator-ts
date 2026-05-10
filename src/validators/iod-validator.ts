/**
 * IODValidator validates a DICOM dataset against its SOP Class IOD definition.
 *
 * Responsibilities:
 * - Identify SOP Class from tag (0008,0016)
 * - Validate all Mandatory (M) modules
 * - Evaluate conditions for Conditional (C) modules
 * - Skip User Optional (U) modules
 * - Handle missing/unknown SOP Class UID
 */

import type { IODRegistry, IODModuleRef } from '../dictionary/iod-registry.js';
import type { ModuleRegistry } from '../dictionary/module-registry.js';
import type { ConditionEvaluator, ConditionResult } from '../condition/evaluator.js';
import { ModuleValidator } from './module-validator.js';
import type { IDicomDataset } from '../types/dataset.js';
import type { ValidationFinding } from '../result/validation-result.js';

/** SOP Class UID tag */
const SOP_CLASS_UID_TAG = '(0008,0016)';

export class IODValidator {
  private readonly moduleValidator = new ModuleValidator();

  /**
   * Validate a dataset against its SOP Class IOD definition.
   *
   * Logic:
   * 1. Get SOP Class UID from dataset
   * 2. Look up IOD definition
   * 3. For each module in IOD:
   *    - Mandatory (M): validate with ModuleValidator
   *    - Conditional (C): evaluate condition, validate if true
   *    - User Optional (U): skip
   *
   * @param dataset - The DICOM dataset to validate
   * @param iodRegistry - Registry of IOD definitions
   * @param moduleRegistry - Registry of module definitions
   * @param conditionEvaluator - Evaluator for condition AST nodes
   * @returns Array of validation findings
   */
  validate(
    dataset: IDicomDataset,
    iodRegistry: IODRegistry,
    moduleRegistry: ModuleRegistry,
    conditionEvaluator: ConditionEvaluator
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    // Step 1: Get SOP Class UID
    const sopClassUID = dataset.getString(SOP_CLASS_UID_TAG);
    if (!sopClassUID) {
      findings.push({
        severity: 'error',
        tag: SOP_CLASS_UID_TAG,
        module: '',
        message: 'SOP Class UID not found',
        rule: 'iod-sop-class-missing',
      });
      return findings;
    }

    // Step 2: Look up IOD definition
    const iodDef = iodRegistry.getIOD(sopClassUID);
    if (!iodDef) {
      findings.push({
        severity: 'error',
        tag: SOP_CLASS_UID_TAG,
        module: '',
        message: `SOP Class UID not recognized: ${sopClassUID}`,
        rule: 'iod-sop-class-unknown',
      });
      return findings;
    }

    // Step 3: Validate each module based on usage type
    // Also collect all known module tags for unexpected tag detection
    const knownTags = new Set<string>();

    for (const moduleRef of iodDef.modules) {
      // Collect tags from this module's definition
      const moduleDef = moduleRegistry.getModule(moduleRef.moduleId);
      if (moduleDef) {
        for (const attr of moduleDef.attributes) {
          knownTags.add(attr.tag);
        }
      }

      const moduleFindings = this.validateModuleRef(
        dataset,
        moduleRef,
        moduleRegistry,
        conditionEvaluator
      );
      findings.push(...moduleFindings);
    }

    // Step 4: Detect unexpected tags in the dataset
    // Also add SOP Class UID to known tags since it's used for IOD lookup
    knownTags.add(SOP_CLASS_UID_TAG);

    for (const [tagId] of dataset.elements) {
      // Skip tags already known from modules
      if (knownTags.has(tagId)) {
        continue;
      }

      // Skip private tags (odd group number) — handled by TagValidator
      if (this.isPrivateTag(tagId)) {
        continue;
      }

      // Skip File Meta Information tags (group 0002)
      if (this.isFileMetaInfoTag(tagId)) {
        continue;
      }

      // Tag is not in any module, not private, not meta info → unexpected
      findings.push({
        severity: 'warning',
        tag: tagId,
        module: '',
        message: `Tag ${tagId} is not defined in any module of the IOD`,
        rule: 'unexpected-tag',
      });
    }

    return findings;
  }

  /**
   * Validate a single module reference based on its usage type.
   */
  private validateModuleRef(
    dataset: IDicomDataset,
    moduleRef: IODModuleRef,
    moduleRegistry: ModuleRegistry,
    conditionEvaluator: ConditionEvaluator
  ): ValidationFinding[] {
    switch (moduleRef.usage) {
      case 'M':
        return this.validateMandatoryModule(dataset, moduleRef, moduleRegistry, conditionEvaluator);

      case 'C':
        return this.validateConditionalModule(dataset, moduleRef, moduleRegistry, conditionEvaluator);

      case 'U':
        // User Optional modules are skipped
        return [];
    }
  }

  /**
   * Validate a Mandatory module — always validate with ModuleValidator.
   */
  private validateMandatoryModule(
    dataset: IDicomDataset,
    moduleRef: IODModuleRef,
    moduleRegistry: ModuleRegistry,
    conditionEvaluator: ConditionEvaluator
  ): ValidationFinding[] {
    const moduleDef = moduleRegistry.getModule(moduleRef.moduleId);
    if (!moduleDef) {
      return [
        {
          severity: 'warning',
          tag: '',
          module: moduleRef.moduleName,
          message: `Module definition not found for "${moduleRef.moduleName}" (${moduleRef.moduleId})`,
          rule: 'iod-module-not-found',
        },
      ];
    }

    return this.moduleValidator.validateModule(dataset, moduleDef, conditionEvaluator);
  }

  /**
   * Validate a Conditional module — evaluate condition first.
   * - If true: validate as Mandatory
   * - If false: skip
   * - If indeterminate: add info finding
   */
  private validateConditionalModule(
    dataset: IDicomDataset,
    moduleRef: IODModuleRef,
    moduleRegistry: ModuleRegistry,
    conditionEvaluator: ConditionEvaluator
  ): ValidationFinding[] {
    if (!moduleRef.condition) {
      // No condition defined — treat as indeterminate
      return [
        {
          severity: 'info',
          tag: '',
          module: moduleRef.moduleName,
          message: `Conditional module "${moduleRef.moduleName}" has no evaluable condition`,
          rule: 'iod-module-condition-indeterminate',
        },
      ];
    }

    const result: ConditionResult = conditionEvaluator.evaluate(moduleRef.condition, dataset);

    switch (result) {
      case 'true':
        return this.validateMandatoryModule(dataset, moduleRef, moduleRegistry, conditionEvaluator);

      case 'false':
        return [];

      case 'indeterminate':
        return [
          {
            severity: 'info',
            tag: '',
            module: moduleRef.moduleName,
            message: `Condition for conditional module "${moduleRef.moduleName}" could not be fully evaluated`,
            rule: 'iod-module-condition-indeterminate',
          },
        ];
    }
  }

  /**
   * Check if a tag is a private tag (odd group number).
   * Private tags have group numbers like 0009, 0011, etc.
   */
  private isPrivateTag(tagId: string): boolean {
    const match = tagId.match(/^\(([0-9A-Fa-f]{4}),/);
    if (!match) {
      return false;
    }
    const group = parseInt(match[1], 16);
    return group % 2 !== 0;
  }

  /**
   * Check if a tag is a File Meta Information tag (group 0002).
   */
  private isFileMetaInfoTag(tagId: string): boolean {
    const match = tagId.match(/^\(([0-9A-Fa-f]{4}),/);
    if (!match) {
      return false;
    }
    return match[1].toUpperCase() === '0002';
  }
}
