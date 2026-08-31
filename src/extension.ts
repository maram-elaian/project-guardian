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

                    const result =
                        analyzeProject(workspacePath);

                    const analysis =
                        result.analysis;

                    const issues =
                        result.issues;

                    const metrics =
                        calculateProjectMetrics(
                            analysis,
                            issues
                        );

                    const health =
                        calculateHealthScore(
                            metrics,
                            issues
                        );

                    console.log('Project Analysis:', analysis);
                    console.log('Architecture Issues:', issues);
                    console.log('Project Metrics:', metrics);
                    console.log('Health Score:', health);

                    const panel =
                        vscode.window.createWebviewPanel(
                            'projectGuardianDashboard',
                            'Project Guardian',
                            vscode.ViewColumn.One,
                            {
                                enableScripts: true
                            }
                        );

                    panel.webview.onDidReceiveMessage(
                        async (message) => {

                            if (message.command === 'openFile') {

                                try {

                                    const filePath =
                                        message.filePath;

                                    const document =
                                        await vscode.workspace.openTextDocument(
                                            filePath
                                        );

                                    await vscode.window.showTextDocument(
                                        document,
                                        {
                                            preview: false
                                        }
                                    );

                                } catch (error) {

                                    vscode.window.showErrorMessage(
                                        'Project Guardian could not open the selected file.'
                                    );

                                    console.error('Open File Error:', error);
                                }
                            }
                        },
                        undefined,
                        context.subscriptions
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

                    console.error('Project Guardian Error:', error);
                }
            }
        );

    context.subscriptions.push(analyzeProjectCommand);
}


// ============================================================
// DASHBOARD HTML
// ============================================================

const SEVERITY_META: Record<string, { label: string; order: number }> = {
    high: { label: 'High priority', order: 0 },
    warning: { label: 'Needs attention', order: 1 },
    info: { label: 'Informational', order: 2 }
};

function getDashboardHtml(
    analysis: any,
    issues: any[],
    metrics: any,
    health: any
): string {

    const projectName =
        String(analysis.rootPath || '')
            .split(/[\\/]/)
            .filter(Boolean)
            .pop() || 'this project';

    const issueRows =
        issues.length === 0

            ? `
                <div class="empty-state">
                    ${iconCheck()}
                    <h3>No architecture issues found</h3>
                    <p>${escapeHtml(projectName)} scanned clean.</p>
                </div>
            `

            : issues
                .map((issue) => {

                    const severity = SEVERITY_META[issue.severity] || {
                        label: issue.severity,
                        order: 3
                    };

                    const affectedFiles =
                        issue.affectedFiles
                            .map(
                                (file: string) => `
                                    <button class="file-row" data-file="${escapeHtml(file)}">
                                        ${iconFile()}
                                        <span class="file-path">${escapeHtml(
                                            getRelativePath(analysis.rootPath, file)
                                        )}</span>
                                        <span class="icon-arrow">${iconArrow()}</span>
                                    </button>
                                `
                            )
                            .join('');

                    return `
                        <article class="issue-card ${escapeHtml(issue.severity)}">

                            <div class="issue-card-head">
                                <span class="severity-dot ${escapeHtml(issue.severity)}"></span>
                                <div>
                                    <div class="severity-label">${escapeHtml(severity.label)}</div>
                                    <h3>${escapeHtml(issue.title)}</h3>
                                </div>
                            </div>

                            <p class="issue-message">${escapeHtml(issue.message)}</p>

                            <div class="affected-title">Affected files</div>
                            <div class="file-list">
                                ${affectedFiles}
                            </div>

                        </article>
                    `;
                })
                .join('');

    const scoreClass =
        health.score >= 80 ? 'healthy' :
        health.score >= 60 ? 'attention' : 'critical';

    // Radial gauge geometry
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const clampedScore = Math.max(0, Math.min(100, health.score));
    const offset = circumference * (1 - clampedScore / 100);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Project Guardian</title>
<style>

    * { box-sizing: border-box; }

    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
    }

    .mono {
        font-family: var(--vscode-editor-font-family, "Cascadia Code", "Consolas", monospace);
    }

    .container {
        max-width: 1040px;
        margin: 0 auto;
        padding: 40px 32px 64px;
    }

    /* Header */

    .header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 36px;
    }

    .mark {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        color: var(--pg-accent, #4ade80);
    }

    .brand h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 650;
        letter-spacing: -0.01em;
    }

    .brand p {
        margin: 3px 0 0;
        opacity: 0.62;
        font-size: 13px;
    }

    /* Hero */

    .hero {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 28px;
        align-items: stretch;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 20px;
        padding: 32px;
        margin-bottom: 40px;
    }

    .gauge-wrap {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto;
    }

    .gauge {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .gauge-track {
        fill: none;
        stroke: var(--vscode-panel-border);
        stroke-width: 12;
    }

    .gauge-value {
        fill: none;
        stroke-width: 12;
        stroke-linecap: round;
        stroke-dasharray: ${circumference.toFixed(2)}px;
        stroke-dashoffset: ${circumference.toFixed(2)}px;
        animation: gauge-fill 1s cubic-bezier(0.16, 0.84, 0.44, 1) 0.1s forwards;
    }

    .gauge-value.healthy { stroke: #4ade80; }
    .gauge-value.attention { stroke: #facc15; }
    .gauge-value.critical { stroke: #f87171; }

    @keyframes gauge-fill {
        to { stroke-dashoffset: ${offset.toFixed(2)}px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .gauge-value {
            animation: none;
            stroke-dashoffset: ${offset.toFixed(2)}px;
        }
    }

    .gauge-readout {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .gauge-score {
        font-size: 42px;
        font-weight: 700;
        line-height: 1;
    }

    .gauge-caption {
        margin-top: 6px;
        font-size: 12.5px;
        opacity: 0.65;
        text-align: center;
        max-width: 140px;
    }

    .hero-body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
    }

    .hero-body h2 {
        margin: 0 0 10px;
        font-size: 18px;
    }

    .hero-body > p {
        margin: 0;
        opacity: 0.75;
        line-height: 1.65;
        font-size: 14px;
        max-width: 62ch;
    }

    .readout-strip {
        display: flex;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--vscode-panel-border);
        gap: 0;
    }

    .readout-item {
        flex: 1;
        padding-right: 18px;
        border-right: 1px solid var(--vscode-panel-border);
    }

    .readout-item:last-child {
        border-right: none;
        padding-right: 0;
    }

    .readout-item + .readout-item {
        padding-left: 18px;
    }

    .readout-label {
        font-size: 12px;
        opacity: 0.6;
    }

    .readout-value {
        font-size: 22px;
        font-weight: 650;
        margin-top: 4px;
    }

    /* Issues */

    .section-title {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 16px;
    }

    .section-title h2 {
        margin: 0;
        font-size: 17px;
    }

    .issue-count {
        font-size: 12.5px;
        opacity: 0.55;
    }

    .issues {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .issue-card {
        padding: 22px 24px;
        background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
        border: 1px solid var(--vscode-panel-border);
        border-left-width: 3px;
        border-radius: 16px;
        transition: border-color 0.15s ease;
    }

    .issue-card.high { border-left-color: #f87171; }
    .issue-card.warning { border-left-color: #facc15; }
    .issue-card.info { border-left-color: #60a5fa; }

    .issue-card-head {
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }

    .severity-dot {
        margin-top: 6px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .severity-dot.high { background: #f87171; }
    .severity-dot.warning { background: #facc15; }
    .severity-dot.info { background: #60a5fa; }

    .severity-label {
        font-size: 12px;
        opacity: 0.6;
        margin-bottom: 2px;
    }

    .issue-card-head h3 {
        margin: 0;
        font-size: 15.5px;
    }

    .issue-message {
        margin: 12px 0 18px 21px;
        line-height: 1.6;
        opacity: 0.75;
        font-size: 13.5px;
        max-width: 66ch;
    }

    .affected-title {
        margin: 0 0 9px 21px;
        font-size: 11.5px;
        opacity: 0.5;
    }

    .file-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-left: 21px;
    }

    .file-row {
        width: 100%;
        border: 1px solid transparent;
        border-radius: 10px;
        background: var(--vscode-textCodeBlock-background);
        padding: 9px 12px;
        display: flex;
        align-items: center;
        gap: 9px;
        text-align: left;
        cursor: pointer;
        color: var(--vscode-foreground);
    }

    .file-row:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-panel-border);
    }

    .file-row:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }

    .file-row svg { flex-shrink: 0; opacity: 0.6; }
    .file-row .icon-arrow { margin-left: auto; opacity: 0.4; }

    .file-path {
        font-family: var(--vscode-editor-font-family, "Cascadia Code", "Consolas", monospace);
        font-size: 12.5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Empty state */

    .empty-state {
        text-align: center;
        padding: 50px 20px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 14px;
    }

    .empty-state svg {
        color: #4ade80;
        margin-bottom: 14px;
    }

    .empty-state h3 { margin: 0 0 6px; font-size: 15px; }
    .empty-state p { margin: 0; opacity: 0.6; font-size: 13.5px; }

    /* Responsive */

    @media (max-width: 720px) {
        .hero {
            grid-template-columns: 1fr;
        }
        .readout-strip {
            flex-wrap: wrap;
            row-gap: 16px;
        }
        .readout-item {
            flex: 1 1 45%;
            border-right: none !important;
            padding: 0 !important;
        }
    }

    @media (max-width: 480px) {
        .container { padding: 24px 18px 48px; }
    }

</style>
</head>
<body>
<div class="container">

    <header class="header">
        ${iconMark()}
        <div class="brand">
            <h1>Project Guardian</h1>
            <p>Scan results for ${escapeHtml(projectName)}</p>
        </div>
    </header>

    <section class="hero">

        <div class="gauge-wrap">
            <svg class="gauge" viewBox="0 0 200 200">
                <circle class="gauge-track" cx="100" cy="100" r="${radius}"></circle>
                <circle class="gauge-value ${scoreClass}" cx="100" cy="100" r="${radius}"></circle>
            </svg>
            <div class="gauge-readout">
                <div class="gauge-score mono">${health.score}</div>
                <div class="gauge-caption">${escapeHtml(health.label)}</div>
            </div>
        </div>

        <div class="hero-body">
            <h2>Overview</h2>
            <p>${escapeHtml(health.summary)}</p>

            <div class="readout-strip">
                <div class="readout-item">
                    <div class="readout-label">Files</div>
                    <div class="readout-value mono">${metrics.fileCount}</div>
                </div>
                <div class="readout-item">
                    <div class="readout-label">Code files</div>
                    <div class="readout-value mono">${metrics.codeFileCount}</div>
                </div>
                <div class="readout-item">
                    <div class="readout-label">Folders</div>
                    <div class="readout-value mono">${metrics.folderCount}</div>
                </div>
                <div class="readout-item">
                    <div class="readout-label">Imports</div>
                    <div class="readout-value mono">${metrics.importCount}</div>
                </div>
            </div>
        </div>

    </section>

    <section>
        <div class="section-title">
            <h2>Architecture issues</h2>
            <span class="issue-count">${issues.length} issue${issues.length === 1 ? '' : 's'}</span>
        </div>

        <div class="issues">
            ${issueRows}
        </div>
    </section>

</div>

<script>
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('.file-row').forEach(button => {
        button.addEventListener('click', () => {
            const filePath = button.dataset.file;
            if (!filePath) return;
            vscode.postMessage({ command: 'openFile', filePath: filePath });
        });
    });
</script>

</body>
</html>`;
}


// ============================================================
// ICONS
// ============================================================

function iconMark(): string {
    return `
        <svg class="mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 3L34 8V19C34 27.5 28.2 33.9 20 37C11.8 33.9 6 27.5 6 19V8L20 3Z"
                stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M11 19H16.5L19 13L22 25L24.5 19H29" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function iconCheck(): string {
    return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6" opacity="0.35"/>
            <path d="M7.5 12.5L10.3 15.3L16.5 9" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function iconFile(): string {
    return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2H14L19 7V22H6V2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M14 2V7H19" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
    `;
}

function iconArrow(): string {
    return `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getRelativePath(rootPath: string, filePath: string): string {
    return filePath
        .replace(rootPath, '')
        .replace(/^[/\\]+/, '')
        .replace(/\\/g, '/');
}

export function deactivate() {}