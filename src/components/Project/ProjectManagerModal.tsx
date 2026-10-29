import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  listSavedProjects,
  saveNamedProject,
  loadSavedProject,
  deleteSavedProject,
  type SavedProjectMeta,
  type WorkspaceSession,
} from '../../services/storage';
import { downloadFile } from '../../utils/exportUtils';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: WorkspaceSession;
  onLoadSession: (session: WorkspaceSession) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onLoadSession,
}) => {
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [projectNameInput, setProjectNameInput] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [importError, setImportError] = useState<string>('');

  const refreshList = async () => {
    const list = await listSavedProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setProjectNameInput(`${currentSession.datasetTitle} - ${new Date().toLocaleDateString()}`);
      setSaveSuccessMsg('');
      setImportError('');
    }
  }, [isOpen, currentSession.datasetTitle]);

  const handleSaveProject = async () => {
    const name = projectNameInput.trim() || currentSession.datasetTitle;
    await saveNamedProject(name, currentSession);
    setSaveSuccessMsg(`專案「${name}」已儲存至瀏覽器 IndexedDB！`);
    refreshList();
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleLoad = async (id: string) => {
    const proj = await loadSavedProject(id);
    if (proj) {
      onLoadSession(proj);
      onClose();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`確定要刪除儲存的專案「${name}」嗎？此操作無法復原。`)) {
      await deleteSavedProject(id);
      refreshList();
    }
  };

  // Export current session as portable JSON file
  const handleExportWorkspace = () => {
    const jsonStr = JSON.stringify(currentSession, null, 2);
    downloadFile(jsonStr, `workspace-${Date.now()}.geodata.json`, 'application/json');
  };

  // Import workspace from JSON file
  const handleImportWorkspace = (file: File) => {
    setImportError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.geojson || !parsed.csv || !parsed.mergeConfig) {
          throw new Error('此檔案非標準 Geo Data Explorer 專案工作區備份檔');
        }
        onLoadSession(parsed);
        onClose();
      } catch (err: any) {
        setImportError(err.message || '無法解析專案檔案');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-sky-500/10 text-slate-700 dark:text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">專案儲存與 IndexedDB 資料持久化</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">儲存專案至本機 IndexedDB 資料庫，或匯出/匯入備份檔</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Section 1: Save current project */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <label className="text-slate-800 dark:text-slate-300 font-bold block text-xs flex items-center gap-1.5">
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              儲存目前工作區至本機 IndexedDB
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder="輸入專案名稱..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-900 dark:focus:border-sky-400"
              />
              <button
                onClick={handleSaveProject}
                className="px-3.5 py-1.5 bg-emerald-700 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                儲存專案
              </button>
            </div>
            {saveSuccessMsg && (
              <div className="text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveSuccessMsg}
              </div>
            )}
          </div>

          {/* Section 2: Portable Backup File (Export / Import) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-slate-800 dark:text-slate-300 font-bold block text-xs">專案檔攜帶與備份 (JSON)</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">可匯出完整工作區狀態至本機檔案，或由檔案還原</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportWorkspace}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-sky-400" /> 匯出 JSON
              </button>
              <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> 載入 JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleImportWorkspace(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          {importError && (
            <div className="text-rose-700 dark:text-rose-400 text-[11px] flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-3.5 h-3.5" /> {importError}
            </div>
          )}

          {/* Section 3: List of Saved Projects in IndexedDB */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">本機 IndexedDB 專案清單 ({projects.length})</span>
              <span className="text-slate-400 text-[10px]">資料安全留存在使用者瀏覽器內</span>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                目前尚無儲存的專案。您可點擊上方按鈕將目前工作區保存至 IndexedDB。
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/60 overflow-hidden">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-2.5 flex items-center justify-between hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-xs">{proj.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" /> {proj.featureCount} 圖徵 • {proj.csvRowCount} 筆數據
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" /> {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLoad(proj.id)}
                        className="px-2.5 py-1 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white rounded font-medium cursor-pointer transition-colors shadow-xs"
                      >
                        開啟
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id, proj.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="刪除此專案"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium cursor-pointer transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
