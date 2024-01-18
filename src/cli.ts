import program from 'commander';
import { convertFile } from './index.js';
import inquirer from 'inquirer';
import { writeFileInfo } from './file';

import { readdir } from 'fs/promises';
import path from 'path';
import { PathLike, readdirSync, lstatSync } from 'fs';

function findInDir(dir: string, fileList: string[] = []) {
	const files = readdirSync(dir);

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const fileExt = path.extname(file);
		const fileStat = lstatSync(filePath);

		if (fileStat.isDirectory()) {
			findInDir(filePath, fileList);
		} else if (fileExt === '.vue') {
			fileList.push(filePath);
		}
	});

	return fileList;
}

const findByExtension = async (dir: PathLike, filelist = []) => {
	const matchedFiles = [];

	const files = await readdir(dir);

	for (const file of files) {
		const fileExt = path.extname(file);

		if (fileExt === '.vue') {
			matchedFiles.push(file);
		}
	}

	return matchedFiles;
};

function camelize(str: string) {
	return str.replace(/-(\w)/g, (_, c: string) => (c ? c.toUpperCase() : ''));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCmdOptions(cmd: { options: Array<{ long: string }> }) {
	const args: { [key: string]: boolean | string } = {};

	cmd.options.forEach((o: { long: string }) => {
		const key = camelize(o.long.replace(/^--/, ''));

		if (
			typeof ((cmd as unknown) as Record<string, string>)[key] !== 'function' &&
			typeof ((cmd as unknown) as Record<string, string>)[key] !== 'undefined'
		) {
			args[key] = ((cmd as unknown) as Record<string, string>)[key];
		}
	});
	return args;
}

program
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	.version((require('../../package.json') as { version: string }).version)
	.usage('<command> [options]');

program
	.command('single <filePath>')
	.description('convert vue component file from class to composition api')
	.option('-v, --view', 'Output file content on stdout, and no write file.')
	.option('-o, --output', 'Output result file path.')
	.option('-r, --root <root>', 'Set root path for calc file absolute path. Default:`process.cwd()`')
	.option('-c, --config <config>', "Set vc2c config file path. Default: `'.vc2c.js'`")
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	.action(async (filePath: string, cmd) => {
		const cmdOptions = getCmdOptions(cmd);

		if (!cmdOptions.output && !cmdOptions.view) {
			const result = await inquirer.prompt({
				name: 'ok',
				type: 'confirm',
				message: "You aren't using -o option to set output file path, It will replace original file content.",
			});

			if (!result.ok) {
				return;
			}
		}

		const { file, result } = await convertFile(filePath, cmdOptions.root as string, cmdOptions.config as string);

		if (cmdOptions.view) {
			console.log(result);
			return;
		}

		writeFileInfo(file, result);
		console.log('Please check the TODO comments on result.');
	});

program
	.command('folder <filePath>')
	.description('convert folder - vue component file from class to composition api')
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	.action(async (filePath: string, cmd) => {
		const cmdOptions = getCmdOptions(cmd);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		const files = findInDir(filePath);
		console.log('🚀 ~ .action ~ files:', files.length);

		const resultAll = { ok: 0, err: 0 };

		for await (const fileP of files) {
			try {
				const { file, result } = await convertFile(fileP, cmdOptions.root as string, cmdOptions.config as string);
				writeFileInfo(file, result);
				resultAll.ok += 1;
			} catch (err) {
				resultAll.err += 1;
			}
		}

		console.log(resultAll);
		console.log('Please check the TODO comments on result.');
	});

program.parse(process.argv);
