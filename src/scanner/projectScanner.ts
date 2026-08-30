import * as fs from 'fs';
import * as path from 'path';

import {
	ProjectAnalysis,
	ProjectFile,
	ProjectFolder
} from './types';

const IGNORED_DIRECTORIES = new Set([
	'node_modules',
	'.git',
	'out',
	'dist',
	'.vscode-test'
]);

const SUPPORTED_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx'
]);

function extractImports(content: string): string[] {
	const imports: string[] = [];

	const importRegex =
		/import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

	const requireRegex =
		/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

	let match: RegExpExecArray | null;

	while ((match = importRegex.exec(content)) !== null) {
		imports.push(match[1]);
	}

	while ((match = requireRegex.exec(content)) !== null) {
		imports.push(match[1]);
	}

	return [...new Set(imports)];
}

function extractResponsibilities(content: string): string[] {
	const responsibilities: string[] = [];

	// API / HTTP
	if (
		/\b(express|fastify|router|app\.get|app\.post|app\.put|app\.delete|fetch|axios)\b/i.test(
			content
		)
	) {
		responsibilities.push('api');
	}

	// Database
	if (
		/\b(prisma|mongoose|sequelize|typeorm|mongodb|postgres|mysql|sqlite|SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+)\b/i.test(
			content
		)
	) {
		responsibilities.push('database');
	}

	// File system
	if (
		/\b(fs\.|readFile|writeFile|readdir|mkdir|unlink|createReadStream|createWriteStream)\b/i.test(
			content
		)
	) {
		responsibilities.push('filesystem');
	}

	// Authentication / Authorization
	if (
		/\b(jwt|jsonwebtoken|bcrypt|bcryptjs|passport|authenticate|authorization|authorize)\b/i.test(
			content
		)
	) {
		responsibilities.push('authentication');
	}

	// UI / React
	if (
		/\b(React|useState|useEffect|useContext|useMemo|useCallback|JSX|<div|<button)\b/i.test(
			content
		)
	) {
		responsibilities.push('ui');
	}

	// Testing
	if (
		/\b(describe|it\(|test\(|expect\(|jest|vitest|mocha|chai|assert)\b/i.test(
			content
		)
	) {
		responsibilities.push('testing');
	}

	return [...new Set(responsibilities)];
}

export function scanProject(rootPath: string): ProjectAnalysis {
	const files: ProjectFile[] = [];
	const folders: ProjectFolder[] = [];

	function scanDirectory(directoryPath: string): void {
		const entries = fs.readdirSync(directoryPath, {
			withFileTypes: true
		});

		for (const entry of entries) {
			const fullPath = path.join(
				directoryPath,
				entry.name
			);

			if (entry.isDirectory()) {
				if (IGNORED_DIRECTORIES.has(entry.name)) {
					continue;
				}

				folders.push({
					name: entry.name,
					path: fullPath
				});

				scanDirectory(fullPath);
			} else {
				const stats = fs.statSync(fullPath);
				const extension = path.extname(entry.name);

				let imports: string[] = [];
				let responsibilities: string[] = [];

				if (SUPPORTED_EXTENSIONS.has(extension)) {
					try {
						const content = fs.readFileSync(
							fullPath,
							'utf-8'
						);

						imports = extractImports(content);
						responsibilities =
							extractResponsibilities(content);
					} catch (error) {
						console.error(
							`Could not read file: ${fullPath}`,
							error
						);
					}
				}

				files.push({
					name: entry.name,
					path: fullPath,
					extension: extension || '(none)',
					size: stats.size,
					imports,
					responsibilities
				});
			}
		}
	}

	scanDirectory(rootPath);

	return {
		rootPath,
		files,
		folders
	};
}