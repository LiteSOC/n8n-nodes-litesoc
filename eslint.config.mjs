import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.js'],
	},
	{
		files: ['nodes/**/*.ts', 'index.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
			},
		},
		rules: {
			// TypeScript specific rules
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			
			// General rules
			'no-console': 'warn',
			'prefer-const': 'error',
			'no-var': 'error',
			'eqeqeq': ['error', 'always'],
		},
	},
	{
		files: ['tests/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
);
