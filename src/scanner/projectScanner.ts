import * as fs from 'fs';
import * as path from 'path';
import {
	ProjectAnalysis,
	ProjectFile,
	ProjectFolder
} from './types';

const IGNORED_DIRECTORIES = new Set([
	'node_modules',
	'.git',
	'out',
	'dist',
	'.vscode-test'
]);

export function scanProject(rootPath: string): ProjectAnalysis {

	const files: ProjectFile[] = [];
	const folders: ProjectFolder[] = [];

	function scanDirectory(directoryPath: string): void {

		const entries = fs.readdirSync(directoryPath, {
			withFileTypes: true
		});

		for (const entry of entries) {

			const fullPath = path.join(directoryPath, entry.name);

			if (entry.isDirectory()) {

				if (IGNORED_DIRECTORIES.has(entry.name)) {
					continue;
				}

				folders.push({
					name: entry.name,
					path: fullPath
				});

				scanDirectory(fullPath);

			} else {

				const stats = fs.statSync(fullPath);
				const extension = path.extname(entry.name);

				files.push({
					name: entry.name,
					path: fullPath,
					extension: extension || '(none)',
					size: stats.size
				});
			}
		}
	}

	scanDirectory(rootPath);

	return {
		rootPath,
		files,
		folders
	};
}