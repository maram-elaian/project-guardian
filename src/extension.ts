import * as vscode from 'vscode';
import { scanProject } from './scanner/projectScanner';
import {
	checkRootFileOverload,
	checkCatchAllFolders,
	checkDeepFolderNesting,
	checkCircularDependencies
} from './scanner/rules';
export function activate(context: vscode.ExtensionContext) {

	console.log('Project Guardian is now active.');

	const analyzeProject = vscode.commands.registerCommand(
		'project-guardian.analyzeProject',
		() => {

			const workspaceFolders = vscode.workspace.workspaceFolders;

			if (!workspaceFolders || workspaceFolders.length === 0) {
				vscode.window.showWarningMessage(
					'Project Guardian: Please open a project folder first.'
				);
				return;
			}

			const workspacePath = workspaceFolders[0].uri.fsPath;

			try {

				const analysis = scanProject(workspacePath);

				const issues = [];

				const rootFileIssue = checkRootFileOverload(analysis);

				if (rootFileIssue) {
					issues.push(rootFileIssue);
				}
				const catchAllFolderIssues = checkCatchAllFolders(analysis);

				issues.push(...catchAllFolderIssues);
				const deepFolderNestingIssues = checkDeepFolderNesting(analysis);

				issues.push(...deepFolderNestingIssues);
				const circularDependencyIssues = checkCircularDependencies(analysis);
				issues.push(...circularDependencyIssues);

				console.log('Project Analysis:', analysis);
				console.log('Architecture Issues:', issues);

				if (issues.length === 0) {

					vscode.window.showInformationMessage(
						`Project Guardian: No architecture issues found. ${analysis.files.length} files and ${analysis.folders.length} folders analyzed.`
					);

				} else {

					vscode.window.showWarningMessage(
						`Project Guardian: Found ${issues.length} architecture issue(s).`
					);
				}

			} catch (error) {

				vscode.window.showErrorMessage(
					'Project Guardian could not analyze the project.'
				);

				console.error(error);
			}
		}
	);

	context.subscriptions.push(analyzeProject);
}

export function deactivate() { }