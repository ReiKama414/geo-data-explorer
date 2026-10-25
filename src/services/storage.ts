import { openDB, type IDBPDatabase } from 'idb';
import type {
  CustomFeatureCollection,
  CsvDataset,
  MergeConfig,
  ClassificationMethod,
  PaletteId,
} from '../types';

export interface WorkspaceSession {
  id?: string;
  datasetTitle: string;
  geojson: CustomFeatureCollection;
  csv: CsvDataset;
  mergeConfig: MergeConfig;
  classificationMethod: ClassificationMethod;
  paletteId: PaletteId;
  paletteReversed: boolean;
  numClasses: number;
  updatedAt: number;
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  datasetTitle: string;
  featureCount: number;
  csvRowCount: number;
  updatedAt: number;
}

const DB_NAME = 'GeoDataExplorerDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workspace')) {
          db.createObjectStore('workspace');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

// Auto-save active session
export async function saveActiveSession(session: WorkspaceSession): Promise<void> {
  try {
    const db = await getDB();
    await db.put('workspace', { ...session, updatedAt: Date.now() }, 'active_session');
  } catch (err) {
    console.warn('Failed to save session to IndexedDB:', err);
  }
}

// Load active session
export async function loadActiveSession(): Promise<WorkspaceSession | null> {
  try {
    const db = await getDB();
    const session = await db.get('workspace', 'active_session');
    return session || null;
  } catch (err) {
    console.warn('Failed to load session from IndexedDB:', err);
    return null;
  }
}

// Save project with custom name
export async function saveNamedProject(name: string, session: WorkspaceSession): Promise<string> {
  const db = await getDB();
  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    ...session,
    id,
    name,
    updatedAt: Date.now(),
  };
  await db.put('projects', record);
  return id;
}

// List all saved projects
export async function listSavedProjects(): Promise<SavedProjectMeta[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('projects');
    return all
      .map((p) => ({
        id: p.id,
        name: p.name || p.datasetTitle,
        datasetTitle: p.datasetTitle,
        featureCount: p.geojson?.features?.length || 0,
        csvRowCount: p.csv?.totalRows || 0,
        updatedAt: p.updatedAt || Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('Failed to list projects from IndexedDB:', err);
    return [];
  }
}

// Load a specific project
export async function loadSavedProject(id: string): Promise<WorkspaceSession | null> {
  try {
    const db = await getDB();
    const proj = await db.get('projects', id);
    return proj || null;
  } catch (err) {
    console.warn('Failed to load project from IndexedDB:', err);
    return null;
  }
}

// Delete project
export async function deleteSavedProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

// Clear all data
export async function clearWorkspace(): Promise<void> {
  const db = await getDB();
  await db.clear('workspace');
}
