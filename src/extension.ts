import * as vscode from 'vscode';
import { scanProject } from './scanner/projectScanner';

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

				vscode.window.showInformationMessage(
					`Project Guardian: Found ${analysis.files.length} files and ${analysis.folders.length} folders.`
				);

				console.log('Project Analysis:', analysis);

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

export function deactivate() {}