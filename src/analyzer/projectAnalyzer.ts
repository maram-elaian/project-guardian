import {
	scanProject
} from '../scanner/projectScanner';

import {
	ArchitectureIssue,
	checkRootFileOverload,
	checkCatchAllFolders,
	checkDeepFolderNesting,
	checkCircularDependencies,
	checkMixedResponsibilities
} from '../scanner/rules';

import {
	ProjectAnalysis
} from '../scanner/types';

import {
	ProjectMetrics,
	calculateProjectMetrics
} from '../metrics/projectMetrics';

export interface ProjectAnalysisResult {

	analysis: ProjectAnalysis;

	issues: ArchitectureIssue[];

	metrics: ProjectMetrics;

}

export function analyzeProject(
	rootPath: string
): ProjectAnalysisResult {

	const analysis =
		scanProject(rootPath);

	const issues: ArchitectureIssue[] = [];

	const rootFileIssue =
		checkRootFileOverload(analysis);

	if (rootFileIssue) {
		issues.push(rootFileIssue);
	}

	const catchAllFolderIssues =
		checkCatchAllFolders(analysis);

	issues.push(
		...catchAllFolderIssues
	);

	const deepFolderNestingIssues =
		checkDeepFolderNesting(analysis);

	issues.push(
		...deepFolderNestingIssues
	);

	const circularDependencyIssues =
		checkCircularDependencies(analysis);

	issues.push(
		...circularDependencyIssues
	);

	const mixedResponsibilityIssues =
		checkMixedResponsibilities(analysis);

	issues.push(
		...mixedResponsibilityIssues
	);

	const metrics =
		calculateProjectMetrics(
			analysis,
			issues
		);

	return {
		analysis,
		issues,
		metrics
	};
}