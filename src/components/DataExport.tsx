"use client";

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Data Export Component (Art. 15 / 20 DSGVO - Right of access & data portability)
 * Lets users download everything stored about them as JSON. The export is built by
 * /api/gdpr/export on the server, which can also include records the browser isn't
 * allowed to read directly (e.g. waitlist entries).
 */

interface ExportData {
  user: Record<string, unknown> | null;
  appointments: Record<string, unknown>[];
  alerts: Record<string, unknown>[];
  waitlist: Record<string, unknown>[];
  exportedAt: string;
  version: string;
}

async function fetchExport(getAuthHeaders: () => Promise<Record<string, string>>): Promise<ExportData> {
  const res = await fetch('/api/gdpr/export', { headers: await getAuthHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.data) throw new Error(body.error || 'Export fehlgeschlagen');
  return body.data as ExportData;
}

function downloadJson(data: ExportData, userId: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rebo-salon-datenexport-${userId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const Spinner = ({ className }: { className: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export function DataExportButton() {
  const { currentUser, addNotification, getAuthHeaders } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    try {
      downloadJson(await fetchExport(getAuthHeaders), currentUser.id);
      addNotification('Datenexport erfolgreich heruntergeladen!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      addNotification(`Export fehlgeschlagen: ${error instanceof Error ? error.message : error}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !currentUser}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <Spinner className="h-5 w-5" />
          <span>Export wird vorbereitet...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Meine Daten herunterladen (JSON)</span>
        </>
      )}
    </button>
  );
}

/**
 * Full Data Export Modal with preview
 */
export function DataExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, addNotification, getAuthHeaders } = useApp();
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isLoading = isOpen && !exportData && !loadError;

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    let cancelled = false;
    fetchExport(getAuthHeaders)
      .then(data => { if (!cancelled) setExportData(data); })
      .catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error)); });
    return () => { cancelled = true; };
    // Load once each time the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser?.id]);

  const close = () => {
    setExportData(null);
    setLoadError(null);
    onClose();
  };

  const handleDownload = () => {
    if (!exportData || !currentUser) return;
    downloadJson(exportData, currentUser.id);
    addNotification('Datenexport heruntergeladen!', 'success');
  };

  if (!isOpen) return null;
  const previewJson = exportData ? JSON.stringify(exportData, null, 2) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="data-export-title">
      <div className="w-full max-w-3xl max-h-[90vh] bg-black border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 id="data-export-title" className="text-lg font-bold text-white">Datenexport (Art. 20 DSGVO)</h3>
          <button onClick={close} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Schließen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <div className="mb-4">
            <p className="text-sm text-gray-300 mb-2">
              Hier können Sie alle Ihre personenbezogenen Daten in einem maschinenlesbaren Format (JSON) herunterladen.
              Der Export enthält: Profil, Termin-Historie, Benachrichtigungen, Wartelisten-Einträge.
            </p>
            <p className="text-xs text-gray-500">Rechtliche Grundlage: Art. 15 und Art. 20 DSGVO</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8 text-yellow-500" />
              <span className="ml-3 text-white">Daten werden geladen...</span>
            </div>
          ) : exportData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Profil', exportData.user ? 1 : 0],
                  ['Termine', exportData.appointments.length],
                  ['Benachrichtigungen', exportData.alerts.length],
                  ['Warteliste', exportData.waitlist.length],
                ].map(([label, count]) => (
                  <div key={label} className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{count}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
                  <span className="text-sm font-medium text-white">JSON-Vorschau</span>
                  <span className="text-xs text-gray-500">{Math.round(new Blob([previewJson]).size / 1024)} KB</span>
                </div>
                <pre className="p-4 max-h-96 overflow-auto text-xs text-gray-300 font-mono bg-black">{previewJson}</pre>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleDownload} className="flex-1 py-3 bg-yellow-500 text-black font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-yellow-400 transition-colors">
                  JSON herunterladen
                </button>
                <button onClick={close} className="flex-1 py-3 border border-white/30 text-white font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-white/10 transition-colors">
                  Schließen
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {loadError ? `Fehler beim Laden: ${loadError}` : 'Keine Daten verfügbar.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
