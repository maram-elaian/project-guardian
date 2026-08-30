import {
	ProjectAnalysis
} from '../scanner/types';

import {
	ArchitectureIssue
} from '../scanner/rules';

export interface ProjectMetrics {

	fileCount: number;

	folderCount: number;

	codeFileCount: number;

	totalSize: number;

	averageFileSize: number;

	importCount: number;

	issueCount: number;

	highIssueCount: number;

	warningIssueCount: number;

	infoIssueCount: number;

}

const CODE_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx'
]);

export function calculateProjectMetrics(
	analysis: ProjectAnalysis,
	issues: ArchitectureIssue[]
): ProjectMetrics {

	const fileCount =
		analysis.files.length;

	const folderCount =
		analysis.folders.length;

	const codeFileCount =
		analysis.files.filter(
			file =>
				CODE_EXTENSIONS.has(
					file.extension.toLowerCase()
				)
		).length;

	const totalSize =
		analysis.files.reduce(
			(total, file) =>
				total + file.size,
			0
		);

	const averageFileSize =
		fileCount > 0
			? totalSize / fileCount
			: 0;

	const importCount =
		analysis.files.reduce(
			(total, file) =>
				total + file.imports.length,
			0
		);

	const issueCount =
		issues.length;

	const highIssueCount =
		issues.filter(
			issue =>
				issue.severity === 'high'
		).length;

	const warningIssueCount =
		issues.filter(
			issue =>
				issue.severity === 'warning'
		).length;

	const infoIssueCount =
		issues.filter(
			issue =>
				issue.severity === 'info'
		).length;

	return {
		fileCount,
		folderCount,
		codeFileCount,
		totalSize,
		averageFileSize,
		importCount,
		issueCount,
		highIssueCount,
		warningIssueCount,
		infoIssueCount
	};
}