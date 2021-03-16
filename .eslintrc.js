module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:node/recommended',
    'plugin:mocha/recommended',
    'plugin:jsdoc/recommended',
    'prettier',
  ],
  settings: {
    jsdoc: {
      ignorePrivate: true,
      ignoreInternal: true,
    },
  },
  rules: {
    // We intentionally use `any` in a few places for user values.
    '@typescript-eslint/explicit-module-boundary-types': [
      'error',
      {
        allowArgumentsExplicitlyTypedAsAny: true,
      },
    ],

    // We use the typescript compiler to transpile import statements into
    // require statements, so this isn't actually valid
    'node/no-unsupported-features/es-syntax': [
      'error',
      {
        ignores: ['modules'],
      },
    ],

    // Reconfigure the checker to include ts files.
    'node/no-missing-import': [
      'error',
      {
        tryExtensions: ['.js', '.ts'],
      },
    ],

    // Add the category and internal tags that we use.
    'jsdoc/check-tag-names': [
      'warn',
      {
        definedTags: ['category', 'internal'],
      },
    ],

    // Reconfigure jsdoc to require doc blocks for anything which we do
    // not have marked as internal or private.
    'jsdoc/require-jsdoc': [
      'warn',
      {
        contexts: [
          'TSMethodSignature',
          'TSPropertySignature',
          'TSInterfaceDeclaration',
          'TSTypeAliasDeclaration',
          'TSEnumDeclaration',
          'FunctionDeclaration',
          'MethodDefinition',
          'ClassProperty',
        ],
      },
    ],

    // Reconfigure jsdoc to require descriptions for all doc blocks. This
    // is really an extension of the above requirement.
    'jsdoc/require-description': 'warn',
    'jsdoc/require-description-complete-sentence': 'warn',

    // We get type information from typescript.
    'jsdoc/require-returns': 'off',
    'jsdoc/require-param-type': 'off',

    // We intentionally use `any` in a few places for user values.
    '@typescript-eslint/no-explicit-any': 'off',

    // There are a number of places we need to do this for code clarity,
    // especially around handling backwards-compatibility.
    'prefer-rest-params': 'off',
  },
}
