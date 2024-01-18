/* eslint-disable @typescript-eslint/no-var-requires */
import { Vc2cOptions } from './options';
import path from 'path';
import { log } from './debug';
import prettier from 'prettier/standalone';
import prettierTypescriptParser from 'prettier/parser-typescript';

export function format(content: string, options: Vc2cOptions): string {
	const isNode = typeof window === 'undefined';

	if (!isNode) {
		return prettier.format(content, {
			plugins: [prettierTypescriptParser],
			parser: 'typescript',
			semi: false,
			singleQuote: true,
		});
	}

	const prettierFormat = require('prettier-eslint') as (config: unknown) => string;

	const prettierEslintOpions = {
		text: content,
		eslintConfig: {
			parser: require.resolve('@typescript-eslint/parser'),
			parserOptions: {
				sourceType: 'module',
				ecmaFeatures: {
					jsx: false,
				},
			},
			rules: {
				'semi': 'off',
				'space-before-function-paren': 'off',
				'padding-line-between-statements': [
					'error',
					{ blankLine: 'always', prev: '*', next: 'export' },
					{ blankLine: 'always', prev: 'const', next: '*' },
					{ blankLine: 'always', prev: '*', next: 'const' },
				],
			},
		},
		prettierOptions: {
			parser: 'typescript',
			singleQuote: true,
			Semicolons: false,
			trailingComma: 'all',
			printWidth: 120,
			useTabs: true,
			endOfLine: 'auto',
			quoteProps: 'consistent',
			bracketSpacing: true,
			bracketSameLine: false,
			htmlWhitespaceSensitivity: 'strict',
		},
		fallbackPrettierOptions: {
			parser: 'typescript',
			Semilocons: true,
			singleQuote: true,
			trailingComma: 'all',
			printWidth: 120,
			useTabs: true,
			endOfLine: 'auto',
			quoteProps: 'consistent',
			bracketSpacing: true,
			bracketSameLine: false,
			htmlWhitespaceSensitivity: 'strict',
		},
	};

	log('Format result code.....');
	return prettierFormat(prettierEslintOpions);
}
