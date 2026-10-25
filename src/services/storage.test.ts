import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveActiveSession,
  loadActiveSession,
  saveNamedProject,
  listSavedProjects,
  loadSavedProject,
  deleteSavedProject,
  clearWorkspace,
  type WorkspaceSession,
} from './storage';

describe('IndexedDB Persistence Storage Service Unit Tests', () => {
  const dummySession: WorkspaceSession = {
    datasetTitle: '測試專案',
    geojson: { type: 'FeatureCollection', features: [] },
    csv: { fileName: 'test.csv', headers: ['code', 'val'], rows: [], totalRows: 0 },
    mergeConfig: {
      geoKey: 'code',
      csvKey: 'code',
      timeColumn: null,
      selectedTime: null,
      metricColumn: 'val',
      aliasMap: {},
    },
    classificationMethod: 'jenks',
    paletteId: 'viridis',
    paletteReversed: false,
    numClasses: 5,
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    await clearWorkspace();
  });

  it('saves and loads the active workspace session in IndexedDB', async () => {
    await saveActiveSession(dummySession);
    const loaded = await loadActiveSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.datasetTitle).toBe('測試專案');
    expect(loaded?.classificationMethod).toBe('jenks');
  });

  it('saves a named project, lists it, loads it, and deletes it', async () => {
    const id = await saveNamedProject('2024 年度全台統計', dummySession);
    expect(id).toMatch(/^proj_/);

    const list = await listSavedProjects();
    expect(list.some((p) => p.id === id && p.name === '2024 年度全台統計')).toBe(true);

    const project = await loadSavedProject(id);
    expect(project).not.toBeNull();
    expect(project?.datasetTitle).toBe('測試專案');

    await deleteSavedProject(id);
    const listAfterDelete = await listSavedProjects();
    expect(listAfterDelete.some((p) => p.id === id)).toBe(false);
  });
});
