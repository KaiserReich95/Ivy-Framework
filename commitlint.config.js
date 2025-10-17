module.exports = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^\(([^\)]+)\) ([a-z]+): (.+)$/,
      headerCorrespondence: ['scope', 'type', 'subject']
    }
  },
  plugins: [
    {
      rules: {
        'custom-format': (parsed) => {
          const { scope, type, subject } = parsed;

          if (!scope || !type || !subject) {
            return [
              false,
              'Commit message must follow format: (feature) commit-type: message'
            ];
          }

          const validTypes = [
            'feat',
            'fix',
            'docs',
            'style',
            'refactor',
            'perf',
            'test',
            'build',
            'ci',
            'chore',
            'revert'
          ];

          if (!validTypes.includes(type)) {
            return [
              false,
              `Commit type must be one of: ${validTypes.join(', ')}`
            ];
          }

          return [true, ''];
        }
      }
    }
  ],
  rules: {
    'custom-format': [2, 'always']
  }
};
