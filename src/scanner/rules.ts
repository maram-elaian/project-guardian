import * as path from 'path';

import { ProjectAnalysis } from './types';

export interface ArchitectureIssue {

	ruleId: string;

	severity: 'info' | 'warning' | 'high';

	title: string;

	message: string;

	affectedFiles: string[];

}

export function checkRootFileOverload(

	analysis: ProjectAnalysis

): ArchitectureIssue | null {

	const rootFiles = analysis.files.filter(

		file => path.dirname(file.path) === analysis.rootPath

	);

	const rootFileCount = rootFiles.length;

	if (rootFileCount <= 5) {

		return null;

	}

	if (rootFileCount <= 10) {

		return {

			ruleId: 'root-file-overload',

			severity: 'warning',

			title: 'Many files in project root',

			message: `The project root contains ${rootFileCount} files. Consider grouping related files into dedicated folders.`,

			affectedFiles: rootFiles.map(file => file.path)

		};

	}

	return {

		ruleId: 'root-file-overload',

		severity: 'high',

		title: 'Too many files in project root',

		message: `The project root contains ${rootFileCount} files. This may make the project harder to navigate and maintain.`,

		affectedFiles: rootFiles.map(file => file.path)

	};

}

export function checkCatchAllFolders(

	analysis: ProjectAnalysis

): ArchitectureIssue[] {

	const catchAllNames = new Set([

		'utils',

		'helpers',

		'common',

		'misc',

		'shared'

	]);

	const issues: ArchitectureIssue[] = [];

	for (const folder of analysis.folders) {

		const folderName = path.basename(folder.path).toLowerCase();

		if (!catchAllNames.has(folderName)) {

			continue;

		}

		const filesInFolder = analysis.files.filter(

			file => path.dirname(file.path) === folder.path

		);

		const fileCount = filesInFolder.length;

		if (fileCount <= 5) {

			continue;

		}

		if (fileCount <= 10) {

			issues.push({

				ruleId: 'catch-all-folder',

				severity: 'warning',

				title: 'Possible catch-all folder',

				message: `The "${folderName}" folder contains ${fileCount} files. Consider grouping files by their actual responsibility.`,

				affectedFiles: filesInFolder.map(file => file.path)

			});

		} else {

			issues.push({

				ruleId: 'catch-all-folder',

				severity: 'high',

				title: 'Catch-all folder detected',

				message: `The "${folderName}" folder contains ${fileCount} files. It may be acting as a catch-all folder and could become difficult to maintain.`,

				affectedFiles: filesInFolder.map(file => file.path)

			});

		}

	}

	return issues;

}

export function checkDeepFolderNesting(

	analysis: ProjectAnalysis

): ArchitectureIssue[] {

	const issues: ArchitectureIssue[] = [];

	for (const folder of analysis.folders) {

		const relativePath = path.relative(

			analysis.rootPath,

			folder.path

		);

		if (!relativePath) {

			continue;

		}

		const depth = relativePath

			.split(path.sep)

			.filter(Boolean)

			.length;

		if (depth <= 4) {

			continue;

		}

		const folderFiles = analysis.files.filter(

			file => path.dirname(file.path) === folder.path

		);

		if (depth <= 6) {

			issues.push({

				ruleId: 'deep-folder-nesting',

				severity: 'warning',

				title: 'Deep folder nesting',

				message: `The folder "${relativePath}" is nested ${depth} levels deep. This may make the project harder to navigate.`,

				affectedFiles: folderFiles.map(file => file.path)

			});

		} else {

			issues.push({

				ruleId: 'deep-folder-nesting',

				severity: 'high',

				title: 'Excessive folder nesting',

				message: `The folder "${relativePath}" is nested ${depth} levels deep. Consider simplifying the project structure.`,

				affectedFiles: folderFiles.map(file => file.path)

			});

		}

	}

	return issues;

}

export function checkCircularDependencies(

	analysis: ProjectAnalysis

): ArchitectureIssue[] {

	const issues: ArchitectureIssue[] = [];

	const fileMap = new Map<string, ProjectAnalysis['files'][number]>();

	for (const file of analysis.files) {

		fileMap.set(path.normalize(file.path), file);

	}

	function resolveImport(

		currentFilePath: string,

		importPath: string

	): string | null {

		if (!importPath.startsWith('.')) {

			return null;

		}

		const currentDirectory = path.dirname(currentFilePath);

		const basePath = path.normalize(

			path.resolve(currentDirectory, importPath)

		);

		const possiblePaths = [

			basePath,

			`${basePath}.ts`,

			`${basePath}.tsx`,

			`${basePath}.js`,

			`${basePath}.jsx`,

			path.join(basePath, 'index.ts'),

			path.join(basePath, 'index.tsx'),

			path.join(basePath, 'index.js'),

			path.join(basePath, 'index.jsx')

		];

		for (const possiblePath of possiblePaths) {

			if (fileMap.has(path.normalize(possiblePath))) {

				return path.normalize(possiblePath);

			}

		}

		return null;

	}

	function findCycle(

		startFile: string,

		currentFile: string,

		visited: Set<string>,

		stack: string[]

	): string[] | null {

		if (stack.includes(currentFile)) {

			const cycleStart = stack.indexOf(currentFile);

			return [

				...stack.slice(cycleStart),

				currentFile

			];

		}

		if (visited.has(currentFile)) {

			return null;

		}

		visited.add(currentFile);

		const file = fileMap.get(currentFile);

		if (!file) {

			return null;

		}

		const nextFiles: string[] = [];

		for (const importPath of file.imports) {

			const resolvedPath = resolveImport(

				currentFile,

				importPath

			);

			if (resolvedPath) {

				nextFiles.push(resolvedPath);

			}

		}

		for (const nextFile of nextFiles) {

			const cycle = findCycle(

				startFile,

				nextFile,

				visited,

				[...stack, currentFile]

			);

			if (cycle) {

				return cycle;

			}

		}

		return null;

	}

	const reportedCycles = new Set<string>();

	for (const file of analysis.files) {

		if (!['.ts', '.tsx', '.js', '.jsx'].includes(file.extension)) {

			continue;

		}

		const normalizedPath = path.normalize(file.path);

		const cycle = findCycle(

			normalizedPath,

			normalizedPath,

			new Set<string>(),

			[]

		);

		if (!cycle) {

			continue;

		}

		const uniqueCycle = [

			...new Set(cycle)

		];

		const cycleKey = [...uniqueCycle]

			.sort()

			.join('|');

		if (reportedCycles.has(cycleKey)) {

			continue;

		}

		reportedCycles.add(cycleKey);

		const relativeCycle = uniqueCycle.map(

			cycleFile =>

				path.relative(

					analysis.rootPath,

					cycleFile

				)

		);

		issues.push({

			ruleId: 'circular-dependency',

			severity: 'high',

			title: 'Circular dependency detected',

			message: `A circular dependency was detected: ${relativeCycle.join(' → ')}`,

			affectedFiles: uniqueCycle

		});

	}

	return issues;

}

/**
 * Detects files that combine several distinct architectural responsibilities.
 *
 * A file with 3 responsibilities is considered a warning.
 * A file with 4 or more responsibilities is considered high severity.
 */
export function checkMixedResponsibilities(

	analysis: ProjectAnalysis

): ArchitectureIssue[] {

	const issues: ArchitectureIssue[] = [];

	for (const file of analysis.files) {

		if (!['.ts', '.tsx', '.js', '.jsx'].includes(file.extension)) {

			continue;

		}

		const responsibilities = file.responsibilities;

		if (responsibilities.length < 3) {

			continue;

		}

		const severity =
			responsibilities.length >= 4
				? 'high'
				: 'warning';

		const responsibilityList =
			responsibilities.join(', ');

		issues.push({

			ruleId: 'mixed-responsibilities',

			severity,

			title:
				responsibilities.length >= 4
					? 'Too many responsibilities in one file'
					: 'Mixed responsibilities detected',

			message:
				`The file "${file.name}" combines ${responsibilities.length} responsibilities: ${responsibilityList}. Consider separating these responsibilities into focused modules.`,

			affectedFiles: [file.path]

		});

	}

	return issues;

}