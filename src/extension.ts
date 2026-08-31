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
                    // OPEN DASHBOARD
                    // ==========================================

                    const panel =
                        vscode.window.createWebviewPanel(
                            'projectGuardianDashboard',
                            'Project Guardian',
                            vscode.ViewColumn.One,
                            {
                                enableScripts: true
                            }
                        );

                    panel.webview.html =
                        getDashboardHtml(
                            analysis,
                            issues,
                            metrics,
                            health
                        );

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

function getDashboardHtml(
    analysis: any,
    issues: any[],
    metrics: any,
    health: any
): string {

    const issueCards = issues.length === 0
        ? `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h3>No Architecture Issues</h3>
                <p>Your project structure looks healthy.</p>
            </div>
        `
        : issues.map(issue => {

            const severityClass =
                issue.severity === 'high'
                    ? 'high'
                    : issue.severity === 'warning'
                        ? 'warning'
                        : 'info';

            const affectedFiles =
                issue.affectedFiles
                    .map(
                        (file: string) =>
                            `<li>${escapeHtml(file)}</li>`
                    )
                    .join('');

            return `
                <div class="issue-card ${severityClass}">

                    <div class="issue-header">

                        <div>
                            <span class="severity ${severityClass}">
                                ${escapeHtml(issue.severity.toUpperCase())}
                            </span>

                            <h3>
                                ${escapeHtml(issue.title)}
                            </h3>
                        </div>

                    </div>

                    <p class="issue-message">
                        ${escapeHtml(issue.message)}
                    </p>

                    <details>
                        <summary>
                            Affected Files
                        </summary>

                        <ul>
                            ${affectedFiles}
                        </ul>
                    </details>

                </div>
            `;
        }).join('');

    const scoreClass =
        health.score >= 80
            ? 'healthy'
            : health.score >= 60
                ? 'attention'
                : 'critical';

    return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
/>

<title>Project Guardian</title>

<style>

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 0;
        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        color: var(--vscode-foreground);

        background:
            var(--vscode-editor-background);
    }

    .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .logo {
        width: 46px;
        height: 46px;
        border-radius: 12px;

        display: flex;
        align-items: center;
        justify-content: center;

        font-size: 24px;

        background:
            var(--vscode-button-background);

        color:
            var(--vscode-button-foreground);
    }

    .brand h1 {
        margin: 0;
        font-size: 24px;
    }

    .brand p {
        margin: 4px 0 0;
        opacity: 0.65;
        font-size: 13px;
    }

    .score-section {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 24px;
        margin-bottom: 24px;
    }

    .score-card,
    .summary-card,
    .metric-card,
    .issue-card {
        background:
            var(--vscode-editorWidget-background);

        border:
            1px solid var(--vscode-panel-border);

        border-radius: 14px;
    }

    .score-card {
        padding: 28px;
        text-align: center;
    }

    .score {
        font-size: 64px;
        font-weight: 700;
        line-height: 1;
        margin: 12px 0;
    }

    .score.healthy {
        color: #4ade80;
    }

    .score.attention {
        color: #facc15;
    }

    .score.critical {
        color: #f87171;
    }

    .score-label {
        font-size: 16px;
        font-weight: 600;
    }

    .summary-card {
        padding: 28px;
    }

    .summary-card h2 {
        margin-top: 0;
    }

    .summary-card p {
        opacity: 0.75;
        line-height: 1.6;
    }

    .metrics {
        display: grid;
        grid-template-columns:
            repeat(4, 1fr);

        gap: 14px;
        margin-bottom: 32px;
    }

    .metric-card {
        padding: 20px;
    }

    .metric-label {
        font-size: 12px;
        opacity: 0.6;
        margin-bottom: 8px;
    }

    .metric-value {
        font-size: 26px;
        font-weight: 700;
    }

    .section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;

        margin-bottom: 16px;
    }

    .section-title h2 {
        margin: 0;
        font-size: 18px;
    }

    .issue-count {
        font-size: 12px;
        opacity: 0.65;
    }

    .issues {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .issue-card {
        padding: 20px;
        border-left: 4px solid;
    }

    .issue-card.high {
        border-left-color: #f87171;
    }

    .issue-card.warning {
        border-left-color: #facc15;
    }

    .issue-card.info {
        border-left-color: #60a5fa;
    }

    .issue-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .issue-header h3 {
        margin:
            8px 0 0;

        font-size: 16px;
    }

    .severity {
        display: inline-block;

        padding:
            4px 8px;

        border-radius:
            6px;

        font-size:
            10px;

        font-weight:
            700;
    }

    .severity.high {
        background: rgba(248, 113, 113, 0.15);
        color: #f87171;
    }

    .severity.warning {
        background: rgba(250, 204, 21, 0.15);
        color: #facc15;
    }

    .severity.info {
        background: rgba(96, 165, 250, 0.15);
        color: #60a5fa;
    }

    .issue-message {
        opacity: 0.75;
        line-height: 1.5;
    }

    details {
        margin-top: 14px;
    }

    summary {
        cursor: pointer;
        opacity: 0.7;
        font-size: 13px;
    }

    ul {
        padding-left: 20px;
    }

    li {
        margin: 5px 0;
        font-family: monospace;
        font-size: 12px;
        opacity: 0.7;
        word-break: break-all;
    }

    .empty-state {
        text-align: center;
        padding: 50px 20px;

        background:
            var(--vscode-editorWidget-background);

        border:
            1px solid var(--vscode-panel-border);

        border-radius: 14px;
    }

    .empty-icon {
        width: 60px;
        height: 60px;

        margin:
            0 auto 16px;

        border-radius: 50%;

        display: flex;
        align-items: center;
        justify-content: center;

        font-size: 28px;

        background:
            rgba(74, 222, 128, 0.12);

        color:
            #4ade80;
    }

    @media (max-width: 800px) {

        .score-section {
            grid-template-columns: 1fr;
        }

        .metrics {
            grid-template-columns:
                repeat(2, 1fr);
        }
    }

</style>

</head>

<body>

<div class="container">

    <header class="header">

        <div class="brand">

            <div class="logo">
                🛡
            </div>

            <div>

                <h1>
                    Project Guardian
                </h1>

                <p>
                    Intelligent project architecture analysis
                </p>

            </div>

        </div>

    </header>

    <section class="score-section">

        <div class="score-card">

            <div>
                HEALTH SCORE
            </div>

            <div class="score ${scoreClass}">
                ${health.score}
            </div>

            <div class="score-label">
                ${escapeHtml(health.label)}
            </div>

        </div>

        <div class="summary-card">

            <h2>
                Architecture Overview
            </h2>

            <p>
                ${escapeHtml(health.summary)}
            </p>

            <p>
                Project contains
                <strong>${metrics.fileCount}</strong>
                files and
                <strong>${metrics.folderCount}</strong>
                folders.
            </p>

        </div>

    </section>

    <section>

        <div class="section-title">

            <h2>
                Project Metrics
            </h2>

        </div>

        <div class="metrics">

            <div class="metric-card">

                <div class="metric-label">
                    TOTAL FILES
                </div>

                <div class="metric-value">
                    ${metrics.fileCount}
                </div>

            </div>

            <div class="metric-card">

                <div class="metric-label">
                    CODE FILES
                </div>

                <div class="metric-value">
                    ${metrics.codeFileCount}
                </div>

            </div>

            <div class="metric-card">

                <div class="metric-label">
                    FOLDERS
                </div>

                <div class="metric-value">
                    ${metrics.folderCount}
                </div>

            </div>

            <div class="metric-card">

                <div class="metric-label">
                    IMPORTS
                </div>

                <div class="metric-value">
                    ${metrics.importCount}
                </div>

            </div>

        </div>

    </section>

    <section>

        <div class="section-title">

            <h2>
                Architecture Issues
            </h2>

            <span class="issue-count">
                ${issues.length} issue(s)
            </span>

        </div>

        <div class="issues">

            ${issueCards}

        </div>

    </section>

</div>

</body>

</html>`;
}

function escapeHtml(value: string): string {

    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function deactivate() {}