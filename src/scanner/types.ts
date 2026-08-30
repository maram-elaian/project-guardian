export interface ProjectFile {

	name: string;

	path: string;

	extension: string;

	size: number;

	imports: string[];

	responsibilities: string[];

}

export interface ProjectFolder {

	name: string;

	path: string;

}

export interface ProjectAnalysis {

	rootPath: string;

	files: ProjectFile[];

	folders: ProjectFolder[];

}