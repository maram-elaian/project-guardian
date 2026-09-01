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
// EXTENSION ACTIVATION
// ============================================================

export function activate(context: vscode.ExtensionContext) {

    console.log('Project Guardian is now active.');

    // --------------------------------------------------------
    // SIDEBAR PROVIDER
    // --------------------------------------------------------

    sidebarProvider = new GuardianSidebarProvider();

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'projectGuardian.sidebar',
            sidebarProvider
        )
    );


    // --------------------------------------------------------
    // ANALYZE PROJECT COMMAND
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

            try {

                const rootPath = workspaceFolder.uri.fsPath;

                // ------------------------------------------------
                // ANALYZE
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


                console.log(
                    'Project Analysis:',
                    result.analysis
                );

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
                // OPEN FULL DASHBOARD
                // ------------------------------------------------

                showDashboard(
                    context,
                    rootPath,
                    result.analysis,
                    result.issues,
                    lastMetrics,
                    lastHealth
                );

            } catch (error) {

                console.error(
                    'Project Guardian Error:',
                    error
                );

                vscode.window.showErrorMessage(
                    'Project Guardian failed to analyze the project.'
                );
            }
        }
    );


    context.subscriptions.push(analyzeCommand);
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

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {

        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html =
            this.getHtml(webviewView.webview);


        // ----------------------------------------------------
        // RECEIVE MESSAGES FROM SIDEBAR
        // ----------------------------------------------------

        webviewView.webview.onDidReceiveMessage(
            async message => {

                switch (message.command) {

                    case 'analyze':

                        await vscode.commands.executeCommand(
                            'project-guardian.analyzeProject'
                        );

                        break;


                    case 'openFile':

                        if (message.filePath) {

                            try {

                                const document =
                                    await vscode.workspace.openTextDocument(
                                        vscode.Uri.file(
                                            message.filePath
                                        )
                                    );

                                await vscode.window.showTextDocument(
                                    document
                                );

                            } catch (error) {

                                vscode.window.showErrorMessage(
                                    'Unable to open file.'
                                );
                            }
                        }

                        break;
                }
            }
        );
    }


    // --------------------------------------------------------
    // UPDATE SIDEBAR
    // --------------------------------------------------------

    public update() {

        if (!this.view) {
            return;
        }

        this.view.webview.html =
            this.getHtml(this.view.webview);
    }


    // --------------------------------------------------------
    // SIDEBAR HTML
    // --------------------------------------------------------

    private getHtml(
        webview: vscode.Webview
    ): string {

        const metrics = lastMetrics;
        const health = lastHealth;


        // ----------------------------------------------------
        // NO ANALYSIS YET
        // ----------------------------------------------------

        if (!metrics || !health) {

            return `
                <!DOCTYPE html>

                <html>

                <head>

                    <meta
                        charset="UTF-8"
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
                            padding: 18px;
                            background: #111111;
                            color: #eeeeee;
                            font-family:
                                -apple-system,
                                BlinkMacSystemFont,
                                "Segoe UI",
                                sans-serif;
                        }

                        .header {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin-bottom: 24px;
                        }

                        .logo {
                            width: 34px;
                            height: 34px;
                            border-radius: 9px;
                            object-fit: cover;
                        }

                        .title {
                            font-size: 16px;
                            font-weight: 700;
                        }

                        .subtitle {
                            color: #888888;
                            font-size: 11px;
                            margin-top: 2px;
                        }

                        .welcome {
                            border: 1px solid #292929;
                            background: #181818;
                            border-radius: 12px;
                            padding: 18px;
                            margin-bottom: 16px;
                        }

                        .welcome h2 {
                            margin: 0 0 8px 0;
                            font-size: 16px;
                        }

                        .welcome p {
                            color: #999999;
                            line-height: 1.5;
                            font-size: 12px;
                            margin: 0;
                        }

                        button {
                            width: 100%;
                            margin-top: 16px;
                            border: none;
                            border-radius: 8px;
                            padding: 10px;
                            background: #20c997;
                            color: #07110e;
                            font-weight: 700;
                            cursor: pointer;
                        }

                        button:hover {
                            opacity: 0.9;
                        }

                    </style>

                </head>

                <body>

                    <div class="header">

                        <img
                            class="logo"
                            src="${webview.asWebviewUri(
                                vscode.Uri.joinPath(
                                    vscode.Uri.file(
                                        vscode.extensions
                                            .getExtension(
                                                'maram-elaian.project-guardian'
                                            )?.extensionPath || ''
                                    ),
                                    'media',
                                    'icon.png'
                                )
                            )}"
                        >

                        <div>

                            <div class="title">
                                Project Guardian
                            </div>

                            <div class="subtitle">
                                Architecture Protection
                            </div>

                        </div>

                    </div>


                    <div class="welcome">

                        <h2>
                            🛡️ Welcome
                        </h2>

                        <p>
                            Analyze your project architecture
                            and detect structural problems,
                            dependency issues and organization risks.
                        </p>

                        <button
                            onclick="analyze()"
                        >
                            🔍 Analyze Project
                        </button>

                    </div>


                    <script>

                        const vscode =
                            acquireVsCodeApi();

                        function analyze() {

                            vscode.postMessage({
                                command: 'analyze'
                            });

                        }

                    </script>

                </body>

                </html>
            `;
        }


        // ----------------------------------------------------
        // ANALYSIS AVAILABLE
        // ----------------------------------------------------

        const score =
            Math.round(health.score);

        const statusLabel =
            health.label || 'Healthy';


        return `
            <!DOCTYPE html>

            <html>

            <head>

                <meta
                    charset="UTF-8"
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
                        padding: 14px;
                        background: #111111;
                        color: #eeeeee;
                        font-family:
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            sans-serif;
                    }

                    .header {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 18px;
                    }

                    .logo {
                        width: 34px;
                        height: 34px;
                        border-radius: 9px;
                        object-fit: cover;
                    }

                    .title {
                        font-size: 15px;
                        font-weight: 700;
                    }

                    .subtitle {
                        color: #777777;
                        font-size: 10px;
                        margin-top: 2px;
                    }

                    .score-card {
                        background: #181818;
                        border: 1px solid #292929;
                        border-radius: 12px;
                        padding: 18px;
                        text-align: center;
                        margin-bottom: 12px;
                    }

                    .score {
                        font-size: 42px;
                        font-weight: 800;
                        color: #20c997;
                    }

                    .score-label {
                        font-size: 12px;
                        color: #aaaaaa;
                        margin-top: 2px;
                    }

                    .summary {
                        color: #888888;
                        font-size: 11px;
                        line-height: 1.5;
                        margin-top: 10px;
                    }

                    .stats {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 12px;
                    }

                    .stat {
                        background: #181818;
                        border: 1px solid #292929;
                        border-radius: 10px;
                        padding: 12px;
                    }

                    .stat-value {
                        font-size: 20px;
                        font-weight: 700;
                    }

                    .stat-label {
                        font-size: 10px;
                        color: #777777;
                        margin-top: 3px;
                    }

                    .issues {
                        background: #181818;
                        border: 1px solid #292929;
                        border-radius: 12px;
                        padding: 14px;
                    }

                    .issues-title {
                        font-size: 12px;
                        font-weight: 700;
                        margin-bottom: 12px;
                    }

                    .issue-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid #252525;
                    }

                    .issue-row:last-child {
                        border-bottom: none;
                    }

                    .issue-name {
                        font-size: 11px;
                        color: #cccccc;
                    }

                    .issue-count {
                        font-weight: 700;
                        font-size: 12px;
                    }

                    .high {
                        color: #ff6b6b;
                    }

                    .warning {
                        color: #ffd166;
                    }

                    .info {
                        color: #4dabf7;
                    }

                    button {
                        width: 100%;
                        margin-top: 12px;
                        border: none;
                        border-radius: 8px;
                        padding: 10px;
                        background: #20c997;
                        color: #07110e;
                        font-weight: 700;
                        cursor: pointer;
                    }

                    button:hover {
                        opacity: 0.9;
                    }

                </style>

            </head>

            <body>

                <div class="header">

                    <img
                        class="logo"
                        src="${webview.asWebviewUri(
                            vscode.Uri.joinPath(
                                vscode.Uri.file(
                                    vscode.extensions
                                        .getExtension(
                                            'maram-elaian.project-guardian'
                                        )?.extensionPath || ''
                                ),
                                'media',
                                'icon.png'
                            )
                        )}"
                    >

                    <div>

                        <div class="title">
                            Project Guardian
                        </div>

                        <div class="subtitle">
                            Architecture Protection
                        </div>

                    </div>

                </div>


                <div class="score-card">

                    <div class="score">
                        ${score}
                    </div>

                    <div class="score-label">
                        ${escapeHtml(statusLabel)}
                    </div>

                    <div class="summary">
                        ${escapeHtml(
                            health.summary ||
                            'Project architecture analyzed.'
                        )}
                    </div>

                </div>


                <div class="stats">

                    <div class="stat">

                        <div class="stat-value">
                            ${metrics.fileCount}
                        </div>

                        <div class="stat-label">
                            Files
                        </div>

                    </div>


                    <div class="stat">

                        <div class="stat-value">
                            ${metrics.folderCount}
                        </div>

                        <div class="stat-label">
                            Folders
                        </div>

                    </div>


                    <div class="stat">

                        <div class="stat-value">
                            ${metrics.codeFileCount}
                        </div>

                        <div class="stat-label">
                            Code Files
                        </div>

                    </div>


                    <div class="stat">

                        <div class="stat-value">
                            ${metrics.importCount}
                        </div>

                        <div class="stat-label">
                            Imports
                        </div>

                    </div>

                </div>


                <div class="issues">

                    <div class="issues-title">
                        Architecture Issues
                    </div>


                    <div class="issue-row">

                        <span class="issue-name">
                            High
                        </span>

                        <span class="issue-count high">
                            ${metrics.highIssueCount}
                        </span>

                    </div>


                    <div class="issue-row">

                        <span class="issue-name">
                            Warning
                        </span>

                        <span class="issue-count warning">
                            ${metrics.warningIssueCount}
                        </span>

                    </div>


                    <div class="issue-row">

                        <span class="issue-name">
                            Info
                        </span>

                        <span class="issue-count info">
                            ${metrics.infoIssueCount}
                        </span>

                    </div>

                </div>


                <button
                    onclick="analyze()"
                >
                    🔍 Analyze Again
                </button>


                <script>

                    const vscode =
                        acquireVsCodeApi();

                    function analyze() {

                        vscode.postMessage({
                            command: 'analyze'
                        });

                    }

                </script>

            </body>

            </html>
        `;
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


    panel.webview.onDidReceiveMessage(
        async message => {

            if (
                message.command === 'openFile' &&
                message.filePath
            ) {

                try {

                    const document =
                        await vscode.workspace.openTextDocument(
                            vscode.Uri.file(
                                message.filePath
                            )
                        );

                    await vscode.window.showTextDocument(
                        document
                    );

                } catch (error) {

                    vscode.window.showErrorMessage(
                        'Unable to open file.'
                    );
                }
            }
        }
    );


    panel.webview.html =
        getDashboardHtml(
            rootPath,
            analysis,
            issues,
            metrics,
            health
        );
}


// ============================================================
// FULL DASHBOARD HTML
// ============================================================

function getDashboardHtml(
    rootPath: string,
    analysis: any,
    issues: any[],
    metrics: any,
    health: any
): string {

    const issueCards = issues
        .map(issue => {

            const severity =
                issue.severity || 'info';

            const affectedFiles =
                issue.affectedFiles || [];


            const filesHtml =
                affectedFiles
                    .map((file: string) => {

                        const absolutePath =
                            vscode.Uri.file(
                                file
                            ).fsPath;

                        return `
                            <button
                                class="file-button"
                                onclick="openFile(${JSON.stringify(
                                    absolutePath
                                )})"
                            >
                                📄 ${escapeHtml(
                                    getRelativePath(
                                        rootPath,
                                        file
                                    )
                                )}
                            </button>
                        `;

                    })
                    .join('');


            return `
                <div class="issue-card">

                    <div class="issue-header">

                        <span class="severity ${severity}">
                            ${escapeHtml(
                                severity.toUpperCase()
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                issue.title ||
                                issue.rule ||
                                'Architecture Issue'
                            )}
                        </h3>

                    </div>

                    <p>
                        ${escapeHtml(
                            issue.message ||
                            issue.description ||
                            ''
                        )}
                    </p>

                    ${
                        filesHtml
                            ? `
                                <div class="affected">
                                    <strong>
                                        Affected Files
                                    </strong>

                                    ${filesHtml}
                                </div>
                            `
                            : ''
                    }

                </div>
            `;

        })
        .join('');


    return `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

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
                    background: #0d0d0d;
                    color: #eeeeee;
                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .container {
                    max-width: 1200px;
                    margin: auto;
                }

                .header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 35px;
                }

                .shield {
                    width: 55px;
                    height: 55px;
                    background: #20c997;
                    color: #07110e;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 27px;
                    font-weight: 800;
                }

                h1 {
                    margin: 0;
                    font-size: 28px;
                }

                .subtitle {
                    color: #777777;
                    margin-top: 5px;
                }

                .overview {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            4,
                            1fr
                        );
                    gap: 15px;
                    margin-bottom: 30px;
                }

                .metric {
                    background: #171717;
                    border: 1px solid #292929;
                    border-radius: 14px;
                    padding: 22px;
                }

                .metric-value {
                    font-size: 30px;
                    font-weight: 800;
                }

                .metric-label {
                    color: #777777;
                    margin-top: 5px;
                    font-size: 13px;
                }

                .health {
                    display: flex;
                    align-items: center;
                    gap: 35px;
                    background: #171717;
                    border: 1px solid #292929;
                    border-radius: 16px;
                    padding: 30px;
                    margin-bottom: 30px;
                }

                .score-circle {
                    width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    border: 10px solid #20c997;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .score-number {
                    font-size: 42px;
                    font-weight: 800;
                }

                .score-text {
                    color: #777777;
                    font-size: 12px;
                }

                .health h2 {
                    margin-top: 0;
                }

                .health p {
                    color: #999999;
                    line-height: 1.6;
                }

                .issues-title {
                    margin-bottom: 18px;
                }

                .issue-card {
                    background: #171717;
                    border: 1px solid #292929;
                    border-radius: 14px;
                    padding: 22px;
                    margin-bottom: 14px;
                }

                .issue-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .issue-header h3 {
                    margin: 0;
                    font-size: 17px;
                }

                .severity {
                    font-size: 10px;
                    font-weight: 800;
                    padding: 5px 8px;
                    border-radius: 5px;
                    background: #252525;
                }

                .severity.high {
                    color: #ff6b6b;
                }

                .severity.warning {
                    color: #ffd166;
                }

                .severity.info {
                    color: #4dabf7;
                }

                .issue-card p {
                    color: #999999;
                    line-height: 1.6;
                }

                .affected {
                    margin-top: 15px;
                }

                .affected strong {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 12px;
                    color: #bbbbbb;
                }

                .file-button {
                    background: #222222;
                    border: 1px solid #333333;
                    color: #bbbbbb;
                    padding: 8px 10px;
                    border-radius: 6px;
                    margin: 3px;
                    cursor: pointer;
                }

                .file-button:hover {
                    border-color: #20c997;
                    color: #20c997;
                }

                @media (
                    max-width: 800px
                ) {

                    .overview {
                        grid-template-columns:
                            repeat(
                                2,
                                1fr
                            );
                    }

                    .health {
                        flex-direction: column;
                        text-align: center;
                    }

                }

            </style>

        </head>


        <body>

            <div class="container">

                <div class="header">

                    <div class="shield">
                        🛡
                    </div>

                    <div>

                        <h1>
                            Project Guardian
                        </h1>

                        <div class="subtitle">
                            Intelligent Architecture Protection
                        </div>

                    </div>

                </div>


                <div class="health">

                    <div class="score-circle">

                        <div class="score-number">
                            ${Math.round(
                                health.score
                            )}
                        </div>

                        <div class="score-text">
                            HEALTH
                        </div>

                    </div>


                    <div>

                        <h2>
                            ${escapeHtml(
                                health.label ||
                                'Project Health'
                            )}
                        </h2>

                        <p>
                            ${escapeHtml(
                                health.summary ||
                                'Your project has been analyzed.'
                            )}
                        </p>

                    </div>

                </div>


                <div class="overview">

                    <div class="metric">

                        <div class="metric-value">
                            ${metrics.fileCount}
                        </div>

                        <div class="metric-label">
                            Total Files
                        </div>

                    </div>


                    <div class="metric">

                        <div class="metric-value">
                            ${metrics.codeFileCount}
                        </div>

                        <div class="metric-label">
                            Code Files
                        </div>

                    </div>


                    <div class="metric">

                        <div class="metric-value">
                            ${metrics.folderCount}
                        </div>

                        <div class="metric-label">
                            Folders
                        </div>

                    </div>


                    <div class="metric">

                        <div class="metric-value">
                            ${metrics.importCount}
                        </div>

                        <div class="metric-label">
                            Imports
                        </div>

                    </div>

                </div>


                <h2 class="issues-title">
                    Architecture Issues
                </h2>


                ${
                    issueCards ||
                    `
                        <div class="issue-card">
                            <p>
                                🎉 No architecture issues detected.
                            </p>
                        </div>
                    `
                }

            </div>


            <script>

                const vscode =
                    acquireVsCodeApi();


                function openFile(
                    filePath
                ) {

                    vscode.postMessage({

                        command:
                            'openFile',

                        filePath:
                            filePath

                    });

                }

            </script>

        </body>

        </html>
    `;
}


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(
    value: string
): string {

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