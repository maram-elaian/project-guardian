import * as vscode from 'vscode';

import { analyzeProject } from './analyzer/projectAnalyzer';
import { calculateProjectMetrics } from './metrics/projectMetrics';
import { calculateHealthScore } from './metrics/healthScore';


// ============================================================
// GLOBAL STATE
// ============================================================

let lastAnalysis: any = null;
let lastMetrics: any = null;
let lastHealth: any = null;

let sidebarProvider: GuardianSidebarProvider;


// ============================================================
// ACTIVATE EXTENSION
// ============================================================

export function activate(context: vscode.ExtensionContext) {


    console.log('Project Guardian is now active.');

    // --------------------------------------------------------
    // SIDEBAR PROVIDER
    // --------------------------------------------------------

    sidebarProvider = new GuardianSidebarProvider(
        context.extensionUri
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'projectGuardian.sidebar',
            sidebarProvider
        )
    );


    // --------------------------------------------------------
    // ANALYZE COMMAND
    // --------------------------------------------------------

    const analyzeCommand = vscode.commands.registerCommand(
        'project-guardian.analyzeProject',
        async () => {

            const workspaceFolder =
                vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {

                vscode.window.showWarningMessage(
                    'Project Guardian: Please open a project folder first.'
                );

                return;
            }

            const rootPath = workspaceFolder.uri.fsPath;

            try {

                vscode.window.showInformationMessage(
                    'Project Guardian: Analyzing project...'
                );

                // ------------------------------------------------
                // PROJECT ANALYSIS
                // ------------------------------------------------

                const result = await analyzeProject(rootPath);

                lastAnalysis = result.analysis;

                // ------------------------------------------------
                // METRICS
                // ------------------------------------------------

                lastMetrics = calculateProjectMetrics(
                    result.analysis,
                    result.issues
                );

                // ------------------------------------------------
                // HEALTH SCORE
                // ------------------------------------------------

                lastHealth = calculateHealthScore(
                    lastMetrics,
                    result.issues
                );


                // ------------------------------------------------
                // DEBUG LOGS
                // ------------------------------------------------

                console.log('Project Analysis:', result.analysis);

                console.log(
                    'Architecture Issues:',
                    result.issues
                );

                console.log(
                    'Project Metrics:',
                    lastMetrics
                );

                console.log(
                    'Health Score:',
                    lastHealth
                );


                // ------------------------------------------------
                // UPDATE SIDEBAR
                // ------------------------------------------------

                sidebarProvider.update();


                // ------------------------------------------------
                // OPEN DASHBOARD
                // ------------------------------------------------

                showDashboard(
                    context,
                    rootPath,
                    result.analysis,
                    result.issues,
                    lastMetrics,
                    lastHealth
                );


                vscode.window.showInformationMessage(
                    'Project Guardian: Analysis completed successfully.'
                );

            } catch (error) {

                console.error(
                    'Project Guardian Error:',
                    error
                );

                vscode.window.showErrorMessage(
                    `Project Guardian: ${
                        error instanceof Error
                            ? error.message
                            : String(error)
                    }`
                );
            }
        }
    );


    context.subscriptions.push(analyzeCommand);
    // إنشاء عنصر بشريط الحالة السفلي
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100 // أولوية الترتيب، رقم أعلى = أقرب لليسار
  );
  statusBarItem.text = "$(shield) Guardian";
  statusBarItem.tooltip = "افتح Project Guardian";
  statusBarItem.command = "projectGuardian.sidebar.focus"; // أمر تلقائي بيولّده VS Code لأي webview view مسجّلة
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
}


// ============================================================
// DEACTIVATE
// ============================================================

export function deactivate() {
    console.log('Project Guardian has been deactivated.');
}


// ============================================================
// SIDEBAR PROVIDER
// ============================================================

class GuardianSidebarProvider
    implements vscode.WebviewViewProvider {

    private view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri
    ) {}


    // ========================================================
    // RESOLVE WEBVIEW
    // ========================================================

    resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {

        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html =
            this.getHtml(webviewView.webview);


        // ----------------------------------------------------
        // MESSAGES FROM WEBVIEW
        // ----------------------------------------------------

        webviewView.webview.onDidReceiveMessage(
            async (message) => {

                switch (message.command) {

                    case 'analyze':

                        await vscode.commands.executeCommand(
                            'project-guardian.analyzeProject'
                        );

                        break;


                    case 'openFile':

                        if (!message.file) {
                            return;
                        }

                        try {

                            const document =
                                await vscode.workspace.openTextDocument(
                                    vscode.Uri.file(message.file)
                                );

                            await vscode.window.showTextDocument(
                                document
                            );

                        } catch (error) {

                            vscode.window.showErrorMessage(
                                `Unable to open file: ${message.file}`
                            );
                        }

                        break;
                }
            }
        );
    }


    // ========================================================
    // UPDATE SIDEBAR
    // ========================================================

    update() {

        if (!this.view) {
            return;
        }

        this.view.webview.html =
            this.getHtml(this.view.webview);
    }


    // ========================================================
    // SIDEBAR HTML
    // ========================================================

    private getHtml(
        webview: vscode.Webview
    ): string {

        const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

        const rootPath =
            workspaceFolder?.uri.fsPath ?? null;


        // ----------------------------------------------------
        // EMPTY STATE
        // ----------------------------------------------------

        if (!lastAnalysis || !lastMetrics || !lastHealth) {

            return this.getEmptyStateHtml();
        }


        // ----------------------------------------------------
        // DATA
        // ----------------------------------------------------

        const healthScore =
            Number(lastHealth.score ?? 0);

        const healthLabel =
            lastHealth.label ?? 'Unknown';

        const healthStatus =
            lastHealth.status ?? 'needs-attention';

        const fileCount =
            Number(lastMetrics.fileCount ?? 0);

        const folderCount =
            Number(lastMetrics.folderCount ?? 0);

        const codeFileCount =
            Number(lastMetrics.codeFileCount ?? 0);

        const importCount =
            Number(lastMetrics.importCount ?? 0);

        const issueCount =
            Number(lastMetrics.issueCount ?? 0);

        const highIssueCount =
            Number(lastMetrics.highIssueCount ?? 0);

        const warningIssueCount =
            Number(lastMetrics.warningIssueCount ?? 0);

        const infoIssueCount =
            Number(lastMetrics.infoIssueCount ?? 0);


        const issues =
            Array.isArray(lastAnalysis.issues)
                ? lastAnalysis.issues
                : [];


        // Some analyzer implementations store issues separately.
        // This fallback keeps the dashboard compatible.

        const analysisIssues =
            Array.isArray(lastAnalysis.architectureIssues)
                ? lastAnalysis.architectureIssues
                : [];


        const allIssues =
            issues.length > 0
                ? issues
                : analysisIssues;


        // ----------------------------------------------------
        // ISSUE CARDS
        // ----------------------------------------------------

        const issueCards =
            allIssues.length > 0

                ? allIssues
                    .map((issue: any, index: number) =>
                        this.createIssueCard(
                            issue,
                            index,
                            rootPath
                        )
                    )
                    .join('')

                : `
                    <div class="empty-issues">
                        <div class="empty-icon">✓</div>
                        <div class="empty-title">
                            No architecture issues detected
                        </div>
                        <div class="empty-text">
                            Your project structure looks clean.
                        </div>
                    </div>
                `;


        // ----------------------------------------------------
        // HEALTH CLASS
        // ----------------------------------------------------

        let healthClass = 'attention';

        if (healthStatus === 'healthy') {
            healthClass = 'healthy';
        }

        if (healthStatus === 'critical') {
            healthClass = 'critical';
        }


        // ----------------------------------------------------
        // HTML
        // ----------------------------------------------------

        return `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'none';
        style-src 'unsafe-inline';
        script-src 'unsafe-inline';
    "
>

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<style>

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
}

body {

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background: #F7F3F0;

    color: #2B2526;

    padding: 18px;

}


/* ============================================================
   HEADER
   ============================================================ */

.header {

    display: flex;

    align-items: center;

    gap: 12px;

    margin-bottom: 22px;

}


.brand-icon {

    width: 42px;

    height: 42px;

    border-radius: 12px;

    background: #8F3F4A;

    color: #FFFFFF;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 22px;

    box-shadow:
        0 5px 14px rgba(143, 63, 74, 0.20);

}


.brand-title {

    font-size: 17px;

    font-weight: 700;

    letter-spacing: -0.2px;

}


.brand-subtitle {

    margin-top: 2px;

    font-size: 11px;

    color: #756D6E;

}


/* ============================================================
   ANALYZE BUTTON
   ============================================================ */

.analyze-button {

    width: 100%;

    border: none;

    border-radius: 10px;

    padding: 11px 14px;

    background: #8F3F4A;

    color: #FFFFFF;

    font-size: 13px;

    font-weight: 600;

    cursor: pointer;

    transition:
        transform 0.15s ease,
        opacity 0.15s ease;

    margin-bottom: 18px;

}


.analyze-button:hover {

    opacity: 0.92;

    transform: translateY(-1px);

}


.analyze-button:active {

    transform: translateY(0);

}


/* ============================================================
   HEALTH CARD
   ============================================================ */

.health-card {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 16px;

    padding: 18px;

    margin-bottom: 16px;

    box-shadow:
        0 4px 14px rgba(43, 37, 38, 0.05);

}


.health-header {

    display: flex;

    justify-content: space-between;

    align-items: center;

    margin-bottom: 14px;

}


.health-title {

    font-size: 12px;

    font-weight: 700;

    color: #756D6E;

    text-transform: uppercase;

    letter-spacing: 0.6px;

}


.health-status {

    font-size: 10px;

    font-weight: 700;

    padding: 5px 8px;

    border-radius: 20px;

}


.health-status.healthy {

    background: #E8F2EC;

    color: #376B4B;

}


.health-status.attention {

    background: #F8EBDD;

    color: #8A5C29;

}


.health-status.critical {

    background: #F6E0E2;

    color: #8F3F4A;

}


.health-score-row {

    display: flex;

    align-items: center;

    gap: 14px;

}


.score {

    font-size: 38px;

    font-weight: 800;

    line-height: 1;

    color: #8F3F4A;

}


.score-info {

    flex: 1;

}


.score-label {

    font-size: 14px;

    font-weight: 700;

    margin-bottom: 4px;

}


.score-summary {

    font-size: 11px;

    line-height: 1.5;

    color: #756D6E;

}


/* ============================================================
   METRICS
   ============================================================ */

.section-title {

    font-size: 12px;

    font-weight: 700;

    text-transform: uppercase;

    letter-spacing: 0.7px;

    color: #756D6E;

    margin: 20px 0 10px;

}


.metrics-grid {

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 9px;

}


.metric-card {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 12px;

    padding: 13px;

}


.metric-value {

    font-size: 21px;

    font-weight: 750;

    color: #2B2526;

}


.metric-label {

    margin-top: 4px;

    font-size: 10px;

    color: #756D6E;

}


/* ============================================================
   ISSUE SUMMARY
   ============================================================ */

.issue-summary {

    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 7px;

}


.issue-stat {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 11px;

    padding: 11px 7px;

    text-align: center;

}


.issue-number {

    font-size: 19px;

    font-weight: 800;

}


.issue-label {

    font-size: 9px;

    margin-top: 3px;

    color: #756D6E;

}


.issue-stat.high .issue-number {

    color: #8F3F4A;

}


.issue-stat.warning .issue-number {

    color: #A86B2D;

}


.issue-stat.info .issue-number {

    color: #66777B;

}


/* ============================================================
   ISSUE CARDS
   ============================================================ */

.issue-card {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 14px;

    padding: 14px;

    margin-bottom: 10px;

}


.issue-top {

    display: flex;

    align-items: center;

    gap: 8px;

    margin-bottom: 8px;

}


.issue-badge {

    font-size: 9px;

    font-weight: 800;

    text-transform: uppercase;

    letter-spacing: 0.5px;

    padding: 5px 7px;

    border-radius: 7px;

}


.issue-badge.high {

    background: #F6E0E2;

    color: #8F3F4A;

}


.issue-badge.warning {

    background: #F8EBDD;

    color: #8A5C29;

}


.issue-badge.info {

    background: #E9EFF0;

    color: #586A6F;

}


.issue-title {

    font-size: 13px;

    font-weight: 700;

    line-height: 1.4;

}


.issue-description {

    font-size: 11px;

    color: #756D6E;

    line-height: 1.55;

    margin-top: 6px;

}


.files-title {

    font-size: 9px;

    font-weight: 700;

    color: #756D6E;

    text-transform: uppercase;

    margin-top: 12px;

    margin-bottom: 6px;

}


.file-button {

    display: block;

    width: 100%;

    text-align: left;

    border: 1px solid #E7DEDB;

    background: #F9F6F4;

    color: #8F3F4A;

    border-radius: 8px;

    padding: 7px 8px;

    font-size: 10px;

    cursor: pointer;

    margin-top: 5px;

    overflow: hidden;

    text-overflow: ellipsis;

    white-space: nowrap;

}


.file-button:hover {

    background: #F2E6E7;

}


/* ============================================================
   EMPTY ISSUES
   ============================================================ */

.empty-issues {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 14px;

    padding: 24px 15px;

    text-align: center;

}


.empty-icon {

    width: 42px;

    height: 42px;

    border-radius: 50%;

    background: #E8F2EC;

    color: #376B4B;

    display: flex;

    align-items: center;

    justify-content: center;

    margin: 0 auto 10px;

    font-size: 20px;

    font-weight: 800;

}


.empty-title {

    font-size: 12px;

    font-weight: 700;

}


.empty-text {

    margin-top: 5px;

    font-size: 10px;

    color: #756D6E;

}


/* ============================================================
   FOOTER
   ============================================================ */

.footer {

    text-align: center;

    margin-top: 20px;

    padding-top: 14px;

    border-top: 1px solid #E7DEDB;

    font-size: 9px;

    color: #968D8E;

}

</style>

</head>


<body>


<!-- ========================================================
     HEADER
     ======================================================== -->

<div class="header">

    <div class="brand-icon">
        🛡
    </div>

    <div>

        <div class="brand-title">
            Project Guardian
        </div>

        <div class="brand-subtitle">
            Architecture Intelligence
        </div>

    </div>

</div>


<!-- ========================================================
     ANALYZE
     ======================================================== -->

<button
    class="analyze-button"
    id="analyzeButton"
>
    Analyze Project
</button>


<!-- ========================================================
     HEALTH
     ======================================================== -->

<div class="health-card">

    <div class="health-header">

        <div class="health-title">
            Project Health
        </div>

        <div class="health-status ${healthClass}">
            ${escapeHtml(healthLabel)}
        </div>

    </div>


    <div class="health-score-row">

        <div class="score">
            ${healthScore}
        </div>

        <div class="score-info">

            <div class="score-label">
                Architecture Score
            </div>

            <div class="score-summary">
                ${escapeHtml(
                    lastHealth.summary ??
                    'Project health analysis completed.'
                )}
            </div>

        </div>

    </div>

</div>


<!-- ========================================================
     METRICS
     ======================================================== -->

<div class="section-title">
    Project Metrics
</div>


<div class="metrics-grid">

    <div class="metric-card">

        <div class="metric-value">
            ${fileCount}
        </div>

        <div class="metric-label">
            Total Files
        </div>

    </div>


    <div class="metric-card">

        <div class="metric-value">
            ${folderCount}
        </div>

        <div class="metric-label">
            Folders
        </div>

    </div>


    <div class="metric-card">

        <div class="metric-value">
            ${codeFileCount}
        </div>

        <div class="metric-label">
            Code Files
        </div>

    </div>


    <div class="metric-card">

        <div class="metric-value">
            ${importCount}
        </div>

        <div class="metric-label">
            Imports
        </div>

    </div>

</div>


<!-- ========================================================
     ISSUES
     ======================================================== -->

<div class="section-title">
    Architecture Issues
</div>


<div class="issue-summary">

    <div class="issue-stat high">

        <div class="issue-number">
            ${highIssueCount}
        </div>

        <div class="issue-label">
            High
        </div>

    </div>


    <div class="issue-stat warning">

        <div class="issue-number">
            ${warningIssueCount}
        </div>

        <div class="issue-label">
            Warning
        </div>

    </div>


    <div class="issue-stat info">

        <div class="issue-number">
            ${infoIssueCount}
        </div>

        <div class="issue-label">
            Info
        </div>

    </div>

</div>


<div style="margin-top: 12px;">

    ${issueCards}

</div>


<div class="footer">

    Project Guardian · Local Architecture Analysis

</div>


<script>

const vscode = acquireVsCodeApi();


/* ============================================================
   ANALYZE
   ============================================================ */

document
    .getElementById('analyzeButton')
    .addEventListener('click', () => {

        vscode.postMessage({
            command: 'analyze'
        });

    });


/* ============================================================
   OPEN FILES
   ============================================================ */

document
    .querySelectorAll('.file-button')
    .forEach(button => {

        button.addEventListener('click', () => {

            const file =
                button.getAttribute('data-file');

            if (!file) {
                return;
            }

            vscode.postMessage({
                command: 'openFile',
                file: file
            });

        });

    });

</script>


</body>

</html>

        `;
    }


    // ========================================================
    // EMPTY STATE HTML
    // ========================================================

    private getEmptyStateHtml(): string {

        return `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'none';
        style-src 'unsafe-inline';
        script-src 'unsafe-inline';
    "
>

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>


<style>

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    min-height: 100vh;

    padding: 22px 18px;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background: #F7F3F0;

    color: #2B2526;

}


.container {

    min-height: calc(100vh - 44px);

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    text-align: center;

}


.brand-icon {

    width: 58px;

    height: 58px;

    border-radius: 16px;

    background: #8F3F4A;

    color: #FFFFFF;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 29px;

    box-shadow:
        0 8px 22px rgba(143, 63, 74, 0.20);

    margin-bottom: 15px;

}


.title {

    font-size: 18px;

    font-weight: 800;

}


.subtitle {

    margin-top: 6px;

    color: #756D6E;

    font-size: 11px;

    line-height: 1.5;

    max-width: 220px;

}


.analyze-button {

    margin-top: 20px;

    border: none;

    border-radius: 10px;

    padding: 11px 18px;

    background: #8F3F4A;

    color: #FFFFFF;

    font-size: 12px;

    font-weight: 700;

    cursor: pointer;

}


.analyze-button:hover {

    opacity: 0.9;

}


.hint {

    margin-top: 12px;

    font-size: 9px;

    color: #968D8E;

}

</style>

</head>


<body>


<div class="container">

    <div class="brand-icon">
        🛡
    </div>

    <div class="title">
        Project Guardian
    </div>

    <div class="subtitle">
        Analyze your project's architecture,
        detect structural issues,
        and measure project health.
    </div>

    <button
        class="analyze-button"
        id="analyzeButton"
    >
        Analyze Project
    </button>

    <div class="hint">
        Open a project folder before analyzing.
    </div>

</div>


<script>

const vscode = acquireVsCodeApi();

document
    .getElementById('analyzeButton')
    .addEventListener('click', () => {

        vscode.postMessage({
            command: 'analyze'
        });

    });

</script>


</body>

</html>

        `;
    }


    // ========================================================
    // CREATE ISSUE CARD
    // ========================================================

    private createIssueCard(
        issue: any,
        index: number,
        rootPath: string | null
    ): string {

        const severity =
            String(
                issue.severity ??
                issue.level ??
                'info'
            ).toLowerCase();


        let severityClass = 'info';

        if (severity.includes('high')) {
            severityClass = 'high';
        }
        else if (
            severity.includes('warning') ||
            severity.includes('medium')
        ) {
            severityClass = 'warning';
        }


        const title =
            issue.title ??
            issue.name ??
            issue.type ??
            `Architecture Issue ${index + 1}`;


        const description =
            issue.description ??
            issue.message ??
            issue.reason ??
            'Architecture issue detected in the project.';


        // ----------------------------------------------------
        // AFFECTED FILES
        // ----------------------------------------------------

        let affectedFiles: string[] = [];


        if (Array.isArray(issue.affectedFiles)) {

            affectedFiles =
                issue.affectedFiles.map(
                    (file: any) => String(file)
                );

        }
        else if (Array.isArray(issue.files)) {

            affectedFiles =
                issue.files.map(
                    (file: any) => String(file)
                );

        }
        else if (issue.file) {

            affectedFiles = [
                String(issue.file)
            ];

        }


        const fileButtons =
            affectedFiles.length > 0

                ? affectedFiles
                    .map((file: string) => {

                        const absolutePath =
                            this.resolveFilePath(
                                file,
                                rootPath
                            );

                        const displayPath =
                            rootPath
                                ? getRelativePath(
                                    rootPath,
                                    absolutePath
                                )
                                : file;

                        return `

<button
    class="file-button"
    data-file="${escapeHtml(absolutePath)}"
    title="${escapeHtml(absolutePath)}"
>
    ${escapeHtml(displayPath)}
</button>

                        `;

                    })
                    .join('')

                : `
                    <div
                        style="
                            font-size:10px;
                            color:#968D8E;
                            margin-top:7px;
                        "
                    >
                        No specific files reported.
                    </div>
                `;


        return `

<div class="issue-card">

    <div class="issue-top">

        <div class="issue-badge ${severityClass}">
            ${escapeHtml(severityClass)}
        </div>

    </div>


    <div class="issue-title">
        ${escapeHtml(String(title))}
    </div>


    <div class="issue-description">
        ${escapeHtml(String(description))}
    </div>


    <div class="files-title">
        Affected Files
    </div>


    ${fileButtons}

</div>

        `;
    }


    // ========================================================
    // RESOLVE FILE PATH
    // ========================================================

    private resolveFilePath(
        filePath: string,
        rootPath: string | null
    ): string {

        if (!rootPath) {
            return filePath;
        }

        if (
            filePath.startsWith('/') ||
            filePath.match(/^[A-Za-z]:[\\/]/)
        ) {
            return filePath;
        }

        return vscode.Uri.joinPath(
            vscode.Uri.file(rootPath),
            filePath
        ).fsPath;
    }
}


// ============================================================
// FULL DASHBOARD
// ============================================================

function showDashboard(
    context: vscode.ExtensionContext,
    rootPath: string,
    analysis: any,
    issues: any[],
    metrics: any,
    health: any
) {

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
            panel.webview,
            rootPath,
            analysis,
            issues,
            metrics,
            health
        );


    // --------------------------------------------------------
    // DASHBOARD MESSAGES
    // --------------------------------------------------------

    panel.webview.onDidReceiveMessage(
        async (message) => {

            if (
                message.command === 'openFile' &&
                message.file
            ) {

                try {

                    const document =
                        await vscode.workspace.openTextDocument(
                            vscode.Uri.file(message.file)
                        );

                    await vscode.window.showTextDocument(
                        document
                    );

                } catch (error) {

                    vscode.window.showErrorMessage(
                        `Unable to open file: ${message.file}`
                    );
                }
            }
        }
    );
}


// ============================================================
// FULL DASHBOARD HTML
// ============================================================

function getDashboardHtml(
    webview: vscode.Webview,
    rootPath: string,
    analysis: any,
    issues: any[],
    metrics: any,
    health: any
): string {

    const score =
        Number(health?.score ?? 0);

    const status =
        String(
            health?.label ??
            health?.status ??
            'Unknown'
        );


    let healthClass = 'attention';

    if (health?.status === 'healthy') {
        healthClass = 'healthy';
    }

    if (health?.status === 'critical') {
        healthClass = 'critical';
    }


    const issueList =
        Array.isArray(issues)
            ? issues
            : [];


    const issueCards =
        issueList.length > 0

            ? issueList
                .map((issue: any, index: number) => {

                    const severity =
                        String(
                            issue.severity ??
                            issue.level ??
                            'info'
                        ).toLowerCase();


                    let severityClass = 'info';

                    if (severity.includes('high')) {
                        severityClass = 'high';
                    }
                    else if (
                        severity.includes('warning') ||
                        severity.includes('medium')
                    ) {
                        severityClass = 'warning';
                    }


                    const title =
                        issue.title ??
                        issue.name ??
                        issue.type ??
                        `Architecture Issue ${index + 1}`;


                    const description =
                        issue.description ??
                        issue.message ??
                        issue.reason ??
                        'Architecture issue detected.';


                    let affectedFiles: string[] = [];


                    if (
                        Array.isArray(
                            issue.affectedFiles
                        )
                    ) {

                        affectedFiles =
                            issue.affectedFiles.map(
                                (file: any) =>
                                    String(file)
                            );

                    }
                    else if (
                        Array.isArray(issue.files)
                    ) {

                        affectedFiles =
                            issue.files.map(
                                (file: any) =>
                                    String(file)
                            );

                    }
                    else if (issue.file) {

                        affectedFiles = [
                            String(issue.file)
                        ];

                    }


                    const filesHtml =
                        affectedFiles.length > 0

                            ? affectedFiles
                                .map((file) => {

                                    const absolutePath =
                                        file.match(
                                            /^[A-Za-z]:[\\/]/
                                        )
                                            ? file
                                            : vscode.Uri
                                                .joinPath(
                                                    vscode.Uri.file(
                                                        rootPath
                                                    ),
                                                    file
                                                )
                                                .fsPath;


                                    const relativePath =
                                        getRelativePath(
                                            rootPath,
                                            absolutePath
                                        );


                                    return `

<button
    class="dashboard-file"
    data-file="${escapeHtml(absolutePath)}"
>
    ${escapeHtml(relativePath)}
</button>

                                    `;

                                })
                                .join('')

                            : `
                                <div class="no-files">
                                    No specific files reported.
                                </div>
                            `;


                    return `

<div class="dashboard-issue">

    <div class="dashboard-issue-header">

        <span class="badge ${severityClass}">
            ${escapeHtml(severityClass)}
        </span>

        <span class="dashboard-issue-title">
            ${escapeHtml(String(title))}
        </span>

    </div>


    <div class="dashboard-description">
        ${escapeHtml(String(description))}
    </div>


    <div class="dashboard-files-title">
        Affected Files
    </div>


    ${filesHtml}

</div>

                    `;
                })
                .join('')

            : `
                <div class="dashboard-empty">
                    <div class="dashboard-empty-icon">
                        ✓
                    </div>

                    <div class="dashboard-empty-title">
                        Architecture looks healthy
                    </div>

                    <div class="dashboard-empty-text">
                        No architecture issues were detected.
                    </div>
                </div>
            `;


    return `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'none';
        style-src 'unsafe-inline';
        script-src 'unsafe-inline';
    "
>

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>


<style>

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    padding: 40px;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background: #F7F3F0;

    color: #2B2526;

}


/* ============================================================
   MAIN
   ============================================================ */

.container {

    max-width: 1150px;

    margin: 0 auto;

}


/* ============================================================
   HEADER
   ============================================================ */

.header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    margin-bottom: 30px;

}


.brand {

    display: flex;

    align-items: center;

    gap: 14px;

}


.brand-icon {

    width: 54px;

    height: 54px;

    border-radius: 15px;

    background: #8F3F4A;

    color: #FFFFFF;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 28px;

    box-shadow:
        0 8px 20px rgba(143, 63, 74, 0.20);

}


.title {

    font-size: 26px;

    font-weight: 800;

}


.subtitle {

    margin-top: 4px;

    color: #756D6E;

    font-size: 13px;

}


/* ============================================================
   TOP GRID
   ============================================================ */

.top-grid {

    display: grid;

    grid-template-columns: 1fr 2fr;

    gap: 18px;

    margin-bottom: 18px;

}


.card {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 18px;

    padding: 24px;

    box-shadow:
        0 5px 18px rgba(43, 37, 38, 0.05);

}


/* ============================================================
   HEALTH
   ============================================================ */

.health-card {

    display: flex;

    flex-direction: column;

    justify-content: center;

}


.health-title {

    font-size: 12px;

    text-transform: uppercase;

    letter-spacing: 0.8px;

    color: #756D6E;

    font-weight: 700;

}


.health-main {

    display: flex;

    align-items: center;

    gap: 18px;

    margin-top: 15px;

}


.score {

    font-size: 54px;

    font-weight: 850;

    color: #8F3F4A;

}


.health-status {

    display: inline-block;

    padding: 6px 10px;

    border-radius: 20px;

    font-size: 10px;

    font-weight: 800;

    text-transform: uppercase;

}


.health-status.healthy {

    background: #E8F2EC;

    color: #376B4B;

}


.health-status.attention {

    background: #F8EBDD;

    color: #8A5C29;

}


.health-status.critical {

    background: #F6E0E2;

    color: #8F3F4A;

}


.summary {

    margin-top: 10px;

    font-size: 12px;

    line-height: 1.6;

    color: #756D6E;

}


/* ============================================================
   METRICS
   ============================================================ */

.metrics {

    display: grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap: 10px;

}


.metric {

    background: #F9F6F4;

    border: 1px solid #E7DEDB;

    border-radius: 13px;

    padding: 17px;

}


.metric-value {

    font-size: 27px;

    font-weight: 800;

}


.metric-label {

    margin-top: 5px;

    font-size: 11px;

    color: #756D6E;

}


/* ============================================================
   SECTION
   ============================================================ */

.section {

    margin-top: 24px;

}


.section-header {

    display: flex;

    justify-content: space-between;

    align-items: center;

    margin-bottom: 11px;

}


.section-title {

    font-size: 16px;

    font-weight: 800;

}


.section-count {

    color: #8F3F4A;

    font-size: 11px;

    font-weight: 700;

}


/* ============================================================
   ISSUES
   ============================================================ */

.dashboard-issue {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 16px;

    padding: 20px;

    margin-bottom: 11px;

    box-shadow:
        0 3px 12px rgba(43, 37, 38, 0.04);

}


.dashboard-issue-header {

    display: flex;

    align-items: center;

    gap: 10px;

}


.badge {

    padding: 5px 8px;

    border-radius: 7px;

    font-size: 9px;

    text-transform: uppercase;

    font-weight: 800;

}


.badge.high {

    background: #F6E0E2;

    color: #8F3F4A;

}


.badge.warning {

    background: #F8EBDD;

    color: #8A5C29;

}


.badge.info {

    background: #E9EFF0;

    color: #586A6F;

}


.dashboard-issue-title {

    font-size: 14px;

    font-weight: 750;

}


.dashboard-description {

    margin-top: 10px;

    font-size: 12px;

    line-height: 1.6;

    color: #756D6E;

}


.dashboard-files-title {

    margin-top: 15px;

    margin-bottom: 7px;

    font-size: 10px;

    font-weight: 800;

    color: #756D6E;

    text-transform: uppercase;

    letter-spacing: 0.5px;

}


.dashboard-file {

    display: inline-block;

    margin: 4px 5px 0 0;

    padding: 7px 10px;

    border: 1px solid #E7DEDB;

    border-radius: 8px;

    background: #F9F6F4;

    color: #8F3F4A;

    cursor: pointer;

    font-size: 10px;

}


.dashboard-file:hover {

    background: #F2E6E7;

}


.no-files {

    color: #968D8E;

    font-size: 10px;

}


/* ============================================================
   EMPTY
   ============================================================ */

.dashboard-empty {

    background: #FFFFFF;

    border: 1px solid #E7DEDB;

    border-radius: 17px;

    padding: 45px;

    text-align: center;

}


.dashboard-empty-icon {

    width: 54px;

    height: 54px;

    margin: 0 auto 14px;

    border-radius: 50%;

    background: #E8F2EC;

    color: #376B4B;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 25px;

    font-weight: 800;

}


.dashboard-empty-title {

    font-size: 15px;

    font-weight: 800;

}


.dashboard-empty-text {

    margin-top: 6px;

    font-size: 12px;

    color: #756D6E;

}


/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 850px) {

    body {
        padding: 22px;
    }

    .top-grid {
        grid-template-columns: 1fr;
    }

    .metrics {
        grid-template-columns: 1fr 1fr;
    }

}

</style>

</head>


<body>


<div class="container">


<!-- ========================================================
     HEADER
     ======================================================== -->

<div class="header">

    <div class="brand">

        <div class="brand-icon">
            🛡
        </div>

        <div>

            <div class="title">
                Project Guardian
            </div>

            <div class="subtitle">
                Intelligent Architecture Protection
            </div>

        </div>

    </div>

</div>


<!-- ========================================================
     TOP
     ======================================================== -->

<div class="top-grid">


    <div class="card health-card">

        <div class="health-title">
            Project Health
        </div>


        <div class="health-main">

            <div class="score">
                ${score}
            </div>

            <div>

                <div class="health-status ${healthClass}">
                    ${escapeHtml(status)}
                </div>

                <div class="summary">
                    ${escapeHtml(
                        health?.summary ??
                        'Project health analysis completed.'
                    )}
                </div>

            </div>

        </div>

    </div>


    <div class="card">

        <div class="section-title">
            Project Metrics
        </div>

        <div
            class="metrics"
            style="margin-top: 15px;"
        >

            <div class="metric">

                <div class="metric-value">
                    ${Number(metrics?.fileCount ?? 0)}
                </div>

                <div class="metric-label">
                    Total Files
                </div>

            </div>


            <div class="metric">

                <div class="metric-value">
                    ${Number(metrics?.folderCount ?? 0)}
                </div>

                <div class="metric-label">
                    Folders
                </div>

            </div>


            <div class="metric">

                <div class="metric-value">
                    ${Number(metrics?.codeFileCount ?? 0)}
                </div>

                <div class="metric-label">
                    Code Files
                </div>

            </div>


            <div class="metric">

                <div class="metric-value">
                    ${Number(metrics?.importCount ?? 0)}
                </div>

                <div class="metric-label">
                    Imports
                </div>

            </div>

        </div>

    </div>

</div>


<!-- ========================================================
     ISSUES
     ======================================================== -->

<div class="section">

    <div class="section-header">

        <div class="section-title">
            Architecture Issues
        </div>

        <div class="section-count">
            ${issueList.length} detected
        </div>

    </div>


    ${issueCards}

</div>


</div>


<script>

const vscode = acquireVsCodeApi();


document
    .querySelectorAll('.dashboard-file')
    .forEach(button => {

        button.addEventListener('click', () => {

            const file =
                button.getAttribute('data-file');

            if (!file) {
                return;
            }

            vscode.postMessage({
                command: 'openFile',
                file: file
            });

        });

    });

</script>


</body>

</html>

    `;
}


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value: string): string {

    return String(value)

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#039;');
}


function getRelativePath(
    rootPath: string,
    filePath: string
): string {

    return filePath

        .replace(rootPath, '')

        .replace(/^[/\\]+/, '')

        .replace(/\\/g, '/');
}