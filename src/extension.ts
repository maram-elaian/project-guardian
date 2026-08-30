import * as vscode from 'vscode';

import { analyzeProject } from './analyzer/projectAnalyzer';

import { calculateProjectMetrics } from './metrics/projectMetrics';

import { calculateHealthScore } from './metrics/healthScore';

export function activate(context: vscode.ExtensionContext) {
    console.log('Project Guardian is now active.');

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

                    // ==========================================
                    // PROJECT ANALYSIS
                    // ==========================================

                    const result =
                        analyzeProject(workspacePath);

                    const analysis =
                        result.analysis;

                    const issues =
                        result.issues;

                    // ==========================================
                    // PROJECT METRICS
                    // ==========================================

                    const metrics =
                        calculateProjectMetrics(
                            analysis,
                            issues
                        );

                    // ==========================================
                    // HEALTH SCORE
                    // ==========================================

                    const health =
                        calculateHealthScore(
                            metrics,
                            issues
                        );

                    // ==========================================
                    // DEBUG OUTPUT
                    // ==========================================

                    console.log(
                        'Project Analysis:',
                        analysis
                    );

                    console.log(
                        'Architecture Issues:',
                        issues
                    );

                    console.log(
                        'Project Metrics:',
                        metrics
                    );

                    console.log(
                        'Health Score:',
                        health
                    );

                    // ==========================================
                    // USER MESSAGE
                    // ==========================================

                    if (issues.length === 0) {

                        vscode.window.showInformationMessage(
                            `Project Guardian: ${health.label} — ${health.score}/100`
                        );

                    } else {

                        vscode.window.showWarningMessage(
                            `Project Guardian: ${issues.length} architecture issue(s) — Health Score: ${health.score}/100`
                        );
                    }

                } catch (error) {

                    vscode.window.showErrorMessage(
                        'Project Guardian could not analyze the project.'
                    );

                    console.error(
                        'Project Guardian Error:',
                        error
                    );
                }
            }
        );

    context.subscriptions.push(
        analyzeProjectCommand
    );
}

export function deactivate() {}