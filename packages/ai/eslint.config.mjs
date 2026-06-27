import { auraspearPackageConfig } from '@auraspear/config/eslint/base.mjs'

// Type-aware strict lint for the AI safety/redaction/routing primitives.
// Closes audit finding ES-03 (these files were previously unlinted).
export default auraspearPackageConfig({ tsconfigRootDir: import.meta.dirname })
