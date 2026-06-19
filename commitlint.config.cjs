/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-max-length': [2, 'always', 100],
    'scope-enum': [
      1,
      'always',
      [
        'web',
        'api',
        'shared',
        'config',
        'ui',
        'ai',
        'infra',
        'docker',
        'docs',
        'ci',
        'deps',
        'env',
        'monorepo',
        'security',
        'release',
      ],
    ],
  },
}
