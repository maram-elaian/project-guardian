import * as vscode from 'vscode';

import {
	analyzeProject
} from './analyzer/projectAnalyzer';

export function activate(
	context: vscode.ExtensionContext
) {

	console.log(
		'Project Guardian is now active.'
	);

	const analyzeProjectCommand =
		vscode.commands.registerCommand(
			'project-guardian.analyzeProject',
			() => {

				const workspaceFolders =
					vscode.workspace.workspaceFolders;

				if (
					!workspaceFolders ||
					workspaceFolders.length === 0
				) {

					vscode.window.showWarningMessage(
						'Project Guardian: Please open a project folder first.'
					);

					return;
				}

				const workspacePath =
					workspaceFolders[0].uri.fsPath;

				try {

					const result =
						analyzeProject(workspacePath);

					console.log(
						'Project Analysis:',
						result.analysis
					);

					console.log(
						'Architecture Issues:',
						result.issues
					);

					if (result.issues.length === 0) {

						vscode.window.showInformationMessage(
							`Project Guardian: No architecture issues found. ${result.analysis.files.length} files and ${result.analysis.folders.length} folders analyzed.`
						);

					} else {

						vscode.window.showWarningMessage(
							`Project Guardian: Found ${result.issues.length} architecture issue(s).`
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

	context.subscriptions.push(
		analyzeProjectCommand
	);
}

export function deactivate() {}