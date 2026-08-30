
import { ArchitectureIssue } from '../scanner/rules';
import { ProjectMetrics } from './projectMetrics';

export type HealthStatus =
    | 'healthy'
    | 'needs-attention'
    | 'critical';

export interface HealthScoreResult {
    score: number;
    status: HealthStatus;
    label: string;
    summary: string;
    deductions: {
        high: number;
        warning: number;
        info: number;
    };
}

export function calculateHealthScore(
    metrics: ProjectMetrics,
    issues: ArchitectureIssue[]
): HealthScoreResult {

    let score = 100;

    const highIssues = issues.filter(
        issue => issue.severity === 'high'
    ).length;

    const warningIssues = issues.filter(
        issue => issue.severity === 'warning'
    ).length;

    const infoIssues = issues.filter(
        issue => issue.severity === 'info'
    ).length;

    // High-severity issues
    const highDeduction = highIssues * 20;

    // Warning-severity issues
    const warningDeduction = warningIssues * 8;

    // Informational issues
    const infoDeduction = infoIssues * 2;

    score -= highDeduction;
    score -= warningDeduction;
    score -= infoDeduction;

    // Additional complexity penalty
    if (metrics.fileCount > 100) {
        score -= 5;
    }

    if (metrics.folderCount > 30) {
        score -= 5;
    }

    if (metrics.importCount > 300) {
        score -= 5;
    }

    // Keep score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    let status: HealthStatus;
    let label: string;
    let summary: string;

    if (score >= 80) {
        status = 'healthy';
        label = 'Healthy';
        summary =
            'The project structure is generally healthy with few architectural concerns.';
    } else if (score >= 60) {
        status = 'needs-attention';
        label = 'Needs Attention';
        summary =
            'The project has some architectural issues that should be reviewed.';
    } else {
        status = 'critical';
        label = 'Critical';
        summary =
            'The project contains significant architectural issues that should be addressed.';
    }

    return {
        score,
        status,
        label,
        summary,
        deductions: {
            high: highDeduction,
            warning: warningDeduction,
            info: infoDeduction
        }
    };
}

