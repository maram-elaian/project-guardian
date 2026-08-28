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