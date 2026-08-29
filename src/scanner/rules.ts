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