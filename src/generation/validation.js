// src/generation/validation.js — Post-extraction schema validation
// Validates parsed tracker JSON against the active schema and logs warnings

import { log, warn } from '../logger.js';
import { getActiveSchema } from '../settings.js';

/**
 * Validate extracted data against the active schema.
 * Returns an array of validation warnings (not errors — we never reject data).
 * @param {object} data - Parsed tracker data
 * @returns {string[]} - Array of warning messages
 */
export function validateExtraction(data) {
    const warnings = [];
    if (!data || typeof data !== 'object') {
        warnings.push('Extracted data is not an object');
        return warnings;
    }

    let schema;
    try {
        schema = getActiveSchema()?.value;
    } catch {
        return warnings; // Can't validate without schema
    }
    if (!schema?.properties) return warnings;

    const props = schema.properties;
    const required = schema.required || [];

    // Check required fields
    for (const key of required) {
        if (!(key in data)) {
            warnings.push(`Missing required field: ${key}`);
        } else if (data[key] === '' || data[key] === null || data[key] === undefined) {
            warnings.push(`Empty required field: ${key}`);
        }
    }

    // Check field types
    for (const [key, spec] of Object.entries(props)) {
        if (!(key in data)) continue;
        const val = data[key];

        if (spec.type === 'string' && typeof val !== 'string' && val !== null) {
            warnings.push(`${key}: expected string, got ${typeof val}`);
        }
        if (spec.type === 'integer' && typeof val !== 'number') {
            warnings.push(`${key}: expected integer, got ${typeof val}`);
        }
        if (spec.type === 'array' && !Array.isArray(val)) {
            warnings.push(`${key}: expected array, got ${typeof val}`);
        }

        // Enum validation
        if (spec.enum && typeof val === 'string' && !spec.enum.includes(val)) {
            warnings.push(`${key}: "${val}" not in enum [${spec.enum.join(',')}]`);
        }

        // Integer range validation for meters (0-100)
        if (spec.type === 'integer' && typeof val === 'number') {
            if (val < 0 || val > 100) {
                warnings.push(`${key}: value ${val} outside 0-100 range`);
            }
        }

        // Array item validation
        if (spec.type === 'array' && Array.isArray(val) && spec.items?.properties) {
            const itemRequired = spec.items.required || [];
            for (let i = 0; i < val.length; i++) {
                const item = val[i];
                if (!item || typeof item !== 'object') {
                    warnings.push(`${key}[${i}]: expected object, got ${typeof item}`);
                    continue;
                }
                for (const rk of itemRequired) {
                    if (!(rk in item) || item[rk] === '' || item[rk] === null) {
                        warnings.push(`${key}[${i}].${rk}: missing or empty required field`);
                    }
                }
                // Validate nested enums
                for (const [ik, ispec] of Object.entries(spec.items.properties)) {
                    if (ispec.enum && ik in item && typeof item[ik] === 'string' && !ispec.enum.includes(item[ik])) {
                        warnings.push(`${key}[${i}].${ik}: "${item[ik]}" not in enum`);
                    }
                }
            }
        }
    }

    // Log warnings
    if (warnings.length) {
        log('Schema validation:', warnings.length, 'warnings');
        for (const w of warnings) log('  ⚠', w);
    }

    return warnings;
}
