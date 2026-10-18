import { safeStorage } from './storage';

export interface Project {
  id: string;
  name: string;
  code: string;
  lastModified: number;
}

const PROJECT_STORAGE_PREFIX = 'project:';

class ProjectManager {
  public getAllProjects(): Project[] {
    const allKeys = safeStorage.listAllKeys();
    const projectKeys = allKeys.filter(k => k.startsWith(PROJECT_STORAGE_PREFIX));
    return projectKeys.map(key => {
      const { found, value } = safeStorage.loadData(key);
      return found ? (value as Project) : null;
    }).filter(p => p !== null) as Project[];
  }

  public saveProject(project: Project): void {
    project.lastModified = Date.now();
    safeStorage.saveData(PROJECT_STORAGE_PREFIX + project.id, project);
  }

  public deleteProject(id: string): void {
    safeStorage.deleteData(PROJECT_STORAGE_PREFIX + id);
  }

  public createProject(name: string, code: string = ''): Project {
    const id = 'proj_' + Date.now();
    const project: Project = { id, name, code, lastModified: Date.now() };
    this.saveProject(project);
    return project;
  }
}

export const projectManager = new ProjectManager();
