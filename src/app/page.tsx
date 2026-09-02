'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'carebridge_active_plan';

export default function CaregiverCommandCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [followUpFiles, setFollowUpFiles] = useState<File[]>([]);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<{
    title: string;
    sources: Array<{ documentName: string; excerpt: string }>;
  } | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Client-side safe session restoration on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.analysisData) {
            setData(parsed.analysisData);
          }
          if (parsed.completedTasks) {
            setCompletedTasks(parsed.completedTasks);
          }
        }
      } catch (e) {
        console.error('Failed to load saved session from localStorage:', e);
      }
    }
  }, []);

  // Helper to persist state to local storage safely
  const saveToStorage = (newData: any, newCompletedTasks: Record<string, boolean>) => {
    if (typeof window !== 'undefined') {
      try {
        if (newData) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              analysisData: newData,
              completedTasks: newCompletedTasks,
            })
          );
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to save session to localStorage:', e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFollowUpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFollowUpFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFollowUpFile = (index: number) => {
    setFollowUpFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async (isFollowUp = false) => {
    const selectedDocList = isFollowUp ? followUpFiles : files;
    if (selectedDocList.length === 0) {
      setError('Please select or drag at least one medical document to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedDocList.forEach((file) => formData.append('files', file));

      if (isFollowUp && data) {
        formData.append('existingContext', JSON.stringify(data));
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to process medical documents.');
      }

      setData(json);

      if (isFollowUp) {
        setFollowUpFiles([]);
        setIsFollowUpOpen(false);
      } else {
        setFiles([]);
      }

      setCompletedTasks((prev) => {
        saveToStorage(json, prev);
        return prev;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const updated = {
        ...prev,
        [taskId]: !prev[taskId],
      };
      saveToStorage(data, updated);
      return updated;
    });
  };

  const handleReset = () => {
    setData(null);
    setFiles([]);
    setFollowUpFiles([]);
    setCompletedTasks({});
    setActiveSource(null);
    setIsFollowUpOpen(false);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Helper renderer for Medication Status Badges
  const renderMedStatusBadge = (statusStr?: string) => {
    const s = (statusStr || '').toUpperCase();
    if (s.includes('PAUSE') || s.includes('STOP') || s.includes('HOLD')) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 print:border-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 print:bg-rose-700" />
          PAUSED / STOPPED
        </span>
      );
    }
    if (s.includes('MODIFY') || s.includes('CHANGE') || s.includes('REVISE') || s.includes('REDUCE')) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 print:border-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 print:bg-amber-700" />
          MODIFIED / CHANGED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 print:border-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 print:bg-emerald-700" />
        ACTIVE
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans antialiased print:bg-white print:pb-0 print:text-slate-950">
      {/* Sticky Header with Glassmorphism */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs print:static print:bg-white print:border-b-2 print:border-slate-800 print:shadow-none print:py-2">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 print:px-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm print:bg-slate-900">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 print:text-2xl">
                  CareBridge <span className="text-blue-600 print:text-slate-900">AI</span>
                </h1>
                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] px-2.5 py-0.5 rounded-full font-semibold print:border-slate-300 print:text-slate-800">
                  Caregiver Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium print:text-slate-700">
                Post-Hospital Reconciliation & Integrated Patient Plan
              </p>

              {/* Only rendered AFTER analysis completes */}
              {data?.meta?.modelUsed && (
                <div className="mt-1 print:hidden">
                  {data.meta.isFallback ? (
                    <span
                      title="Primary engine quota reached. Automatically routed to a faster Gemini model to maintain uninterrupted processing."
                      className="text-[11px] text-amber-700 font-medium inline-flex items-center gap-1.5 cursor-help hover:underline decoration-amber-400 decoration-dotted"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Engine: Gemini 3.5 Flash-Lite (High-Availability)
                    </span>
                  ) : (
                    <span
                      title="Primary reasoning engine for multi-document analysis and care-plan generation."
                      className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5 cursor-help"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Engine: Gemini 3.6 Flash
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Patient Details & Action Panel */}
          <div className="flex flex-col md:items-end text-xs text-slate-600 space-y-1">
            {data?.patient ? (
              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 print:bg-white print:border-slate-400 print:px-0">
                <div>
                  Patient: <strong className="text-slate-900 font-semibold">{data.patient.name || 'Anonymous'}</strong>
                </div>
                {data.patient.dob && (
                  <span className="text-slate-400 print:text-slate-700">• DOB: <span className="text-slate-700 font-medium">{data.patient.dob}</span></span>
                )}
                {data.redFlags?.condition && (
                  <span className="text-slate-400 print:text-slate-700">• Dx: <strong className="text-slate-900">{data.redFlags.condition}</strong></span>
                )}
              </div>
            ) : (
              <div className="text-slate-400 italic print:hidden">No Active Patient Record Loaded</div>
            )}

            {data && (
              <div className="flex items-center gap-2 pt-0.5 print:hidden">
                <button
                  onClick={() => setIsFollowUpOpen(true)}
                  title="Upload additional medical records or lab results to reconcile with active plan"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="font-bold text-white text-sm leading-none">+</span> Upload Follow-Up Document
                </button>
                <button
                  onClick={handleReset}
                  title="Clear current patient plan from local storage and start a fresh document upload"
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 active:scale-98 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  🔄 Start New Analysis
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 active:scale-98 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Print or export clean clinical care summary to PDF"
                >
                  🖨️ Print / Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-8 space-y-8 print:max-w-none print:w-full print:px-0 print:mt-2 print:space-y-4">

        {/* Dynamic File Upload Card (rendered when NO active data exists) */}
        {!data && (
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-6 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upload Patient Medical Documents</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-4">
                Upload discharge summaries, specialist consultation notes, or laboratory scans. CareBridge AI will parse text and images, detect medication conflicts, and extract action items.
              </p>
            </div>

            {/* Drag & Drop Input Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-2xl p-8 text-center relative group cursor-pointer">
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-3 pointer-events-none">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                  📑
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag & drop patient files here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-page PDFs, image scans, and text documents
                  </p>
                </div>
                {/* Supported Format Badges */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold">.PDF</span>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold">.PNG</span>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold">.JPG</span>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold">.WEBP</span>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold">.TXT</span>
                </div>
              </div>
            </div>

            {/* Selected File Chips */}
            {files.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>📎</span> Selected Documents ({files.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-2xs"
                    >
                      <span className="font-semibold truncate max-w-[220px]">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer transition-colors"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={loading || files.length === 0}
                className={`px-7 py-3 rounded-xl font-semibold text-sm text-white shadow-sm transition-all flex items-center gap-2 ${
                  loading || files.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-98 cursor-pointer shadow-md'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting & Reconciling Clinical Context...
                  </>
                ) : (
                  <>⚡ Analyze Patient Documents</>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl text-sm flex items-start gap-3 shadow-xs print:hidden">
            <span className="text-xl">⚠️</span>
            <div className="space-y-0.5">
              <strong className="font-bold">System Notice:</strong>
              <p className="text-xs text-rose-800 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Pre-Analysis Placeholder State */}
        {!data && !loading && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4 shadow-xs print:hidden">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🩺
            </div>
            <div className="space-y-1">
              <h3 className="text-slate-900 font-bold text-base">Ready for Medical Record Analysis</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                Upload patient discharge summaries, lab scans, or specialist notes above to build an integrated caregiver action plan.
              </p>
            </div>
          </div>
        )}

        {/* Rendered Command Center */}
        {data && (
          <div className="space-y-8 animate-in fade-in duration-300 print:space-y-4">

            {/* Core Caregiver Question Banner */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:p-4 print:border-slate-300 print:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 print:bg-slate-900" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Caregiver Focus Summary</h2>
                </div>
                <div className="flex items-center gap-3 print:hidden">
                  <button
                    onClick={() => setIsFollowUpOpen(true)}
                    title="Upload additional medical records or lab results to reconcile with active plan"
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-blue-600 text-sm leading-none">+</span> Upload Follow-Up
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={handleReset}
                    title="Clear current patient plan from local storage and start a fresh document upload"
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Reset Record
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xl font-bold tracking-tight text-slate-900 print:text-lg">
                  What do I need to pay attention to and do next?
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  CareBridge identified <strong className="text-rose-700 print:text-slate-900">{data?.needsAttention?.length || 0} critical clinical conflict(s)</strong> and <strong className="text-amber-700 print:text-slate-900">{data?.gaps?.length || 0} information gap(s)</strong> requiring caregiver action.
                </p>
              </div>
            </section>

            {/* Executive KPI Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:break-inside-avoid print:grid-cols-4 print:gap-2">
              <div className="bg-rose-50/90 border border-rose-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow print:p-3 print:bg-white print:border-slate-300">
                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider print:text-slate-800">Conflicts Detected</p>
                <p className="text-3xl font-black text-rose-950 mt-1 print:text-2xl print:text-slate-900">{data?.needsAttention?.length || 0}</p>
                <p className="text-[10px] text-rose-700/80 mt-1 font-medium print:text-slate-600">Instruction discrepancies</p>
              </div>

              <div className="bg-amber-50/90 border border-amber-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow print:p-3 print:bg-white print:border-slate-300">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider print:text-slate-800">Information Gaps</p>
                <p className="text-3xl font-black text-amber-950 mt-1 print:text-2xl print:text-slate-900">{data?.gaps?.length || 0}</p>
                <p className="text-[10px] text-amber-700/80 mt-1 font-medium print:text-slate-600">Missing lab / follow-up data</p>
              </div>

              <div className="bg-blue-50/90 border border-blue-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow print:p-3 print:bg-white print:border-slate-300">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider print:text-slate-800">Actions Progress</p>
                <p className="text-3xl font-black text-blue-950 mt-1 print:text-2xl print:text-slate-900">
                  {Object.values(completedTasks).filter(Boolean).length} / {data?.actionNeeded?.length || 0}
                </p>
                <p className="text-[10px] text-blue-700/80 mt-1 font-medium print:text-slate-600">Checklist items completed</p>
              </div>

              <div className="bg-emerald-50/90 border border-emerald-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow print:p-3 print:bg-white print:border-slate-300">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider print:text-slate-800">Care Steps Planned</p>
                <p className="text-3xl font-black text-emerald-950 mt-1 print:text-2xl print:text-slate-900">{data?.timeline?.length || 0}</p>
                <p className="text-[10px] text-emerald-700/80 mt-1 font-medium print:text-slate-600">Sequential care timeline</p>
              </div>
            </div>

            {/* Triaged Columns */}
            <div className="grid md:grid-cols-3 gap-6 items-start print:grid-cols-1 print:gap-4">

              {/* 🔴 NEEDS ATTENTION (Conflicts & Gaps) */}
              <div className="space-y-4 print:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2 print:text-slate-900">
                    <span>🔴</span> Needs Attention
                  </h3>
                  <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    {(data?.needsAttention?.length || 0) + (data?.gaps?.length || 0)}
                  </span>
                </div>

                {/* Conflict Cards */}
                {data?.needsAttention?.map((item: any) => (
                  <div key={item.id} className="bg-white border border-rose-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-xs transition-shadow print:break-inside-avoid print:p-4 print:border-slate-400">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-rose-950 text-sm leading-snug print:text-slate-950">{item.title}</h4>
                      {renderMedStatusBadge(item.status || item.title)}
                    </div>
                    
                    <p className="text-xs text-slate-700 leading-relaxed">{item.summary}</p>

                    <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-1 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                      <strong className="font-bold text-rose-950 print:text-slate-950">Caregiver Action:</strong> {item.recommendation}
                    </div>

                    {((item.sources && item.sources.length > 0) || item.docASource) && (
                      <button
                        onClick={() => {
                          const sourceList = item.sources || [
                            { documentName: item.docASource, excerpt: item.docAExcerpt || item.docAQuote || item.docA },
                            { documentName: item.docBSource, excerpt: item.docBExcerpt || item.docBQuote || item.docB }
                          ].filter((s) => s.documentName);

                          setActiveSource({
                            title: item.title,
                            sources: sourceList,
                          });
                        }}
                        className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline cursor-pointer inline-flex items-center gap-1.5 pt-1 transition-colors print:hidden"
                      >
                        🔍 View Source Evidence ("Why?")
                      </button>
                    )}
                  </div>
                ))}

                {/* Missing Info Gap Cards */}
                {data?.gaps?.map((gap: any) => (
                  <div key={gap.id} className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-xs transition-shadow print:break-inside-avoid print:p-4 print:border-slate-400">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-amber-950 text-sm leading-snug print:text-slate-950">{gap.missingInfo}</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border border-amber-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                        Missing Info
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{gap.impact}</p>
                    <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-100 text-xs text-amber-900 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                      <strong className="font-bold text-amber-950 print:text-slate-950">Recommended Safe Path:</strong> {gap.recommendation}
                    </div>
                  </div>
                ))}
              </div>

              {/* 🟡 ACTION NEEDED (Daily Checklist) */}
              <div className="space-y-4 print:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2 print:text-slate-900">
                    <span>🟡</span> Action Needed Checklist
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    {data?.actionNeeded?.length || 0}
                  </span>
                </div>

                {data?.actionNeeded?.map((item: any, idx: number) => {
                  const taskId = item.id || `action-${idx}`;
                  const isDone = !!completedTasks[taskId];

                  return (
                    <div
                      key={taskId}
                      className={`border rounded-2xl p-5 space-y-3 shadow-2xs transition-all print:break-inside-avoid print:p-4 print:border-slate-400 ${
                        isDone
                          ? 'bg-slate-100/70 border-slate-200/80 opacity-60 print:opacity-100 print:bg-white'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm leading-snug ${isDone ? 'line-through text-slate-400 print:no-underline print:text-slate-950' : 'text-slate-900'}`}>
                            {item.task}
                          </h4>
                          {renderMedStatusBadge(item.status || item.task)}
                        </div>
                        {item.deadline && (
                          <span className="self-start text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-lg border border-amber-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                            ⏱️ Deadline: {item.deadline}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs leading-relaxed ${isDone ? 'text-slate-400 print:text-slate-700' : 'text-slate-600'}`}>{item.reason}</p>

                      <label className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-700 cursor-pointer select-none group print:border-none print:pt-0">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleTask(taskId)}
                          className="rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer transition-transform group-hover:scale-110 print:hidden"
                        />
                        <span className={isDone ? 'font-bold text-emerald-700 print:text-slate-900' : 'font-medium group-hover:text-slate-900'}>
                          {isDone ? '✓ Status: Completed' : 'Status: Pending Action'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* 🟢 UPCOMING MILESTONES */}
              <div className="space-y-4 print:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 print:text-slate-900">
                    <span>🟢</span> Upcoming Care Steps
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    {data?.upcoming?.length || 0}
                  </span>
                </div>

                {data?.upcoming?.map((item: any) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-xs transition-shadow print:break-inside-avoid print:p-4 print:border-slate-400">
                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.task}</h4>
                      {item.timeframe && (
                        <span className="self-start text-[11px] bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-lg border border-slate-200 print:border-slate-300">
                          📅 {item.timeframe}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
                  </div>
                ))}
              </div>

            </div>

            {/* High-Visibility Emergency Red Flag Callouts */}
            {data?.redFlags && (
              <section className="bg-gradient-to-r from-rose-50 to-red-50 p-6 rounded-2xl border border-rose-200 shadow-sm space-y-4 print:break-inside-avoid print:bg-white print:border-2 print:border-rose-600 print:p-4">
                <div className="flex items-center justify-between border-b border-rose-200/80 pb-3 print:pb-2 print:border-rose-400">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                      ⚠️
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-rose-950 tracking-tight">
                        Red-Flag Escalation Protocol
                      </h3>
                      <p className="text-xs text-rose-800/90 font-medium print:text-slate-900">
                        Symptom threshold guardrails derived for: <strong className="text-rose-950">{data.redFlags.condition}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-rose-600 text-white font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider shadow-2xs">
                    EMERGENCY GUIDANCE
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                  {/* 🚨 Emergency Triggers */}
                  <div className="bg-white/90 p-5 rounded-xl border border-rose-200 shadow-2xs space-y-2 print:p-3 print:border-rose-300">
                    <p className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 print:text-rose-950">
                      🚨 Call 911 / Emergency Services Immediately If:
                    </p>
                    <ul className="text-xs text-rose-950 space-y-2 list-disc list-inside leading-relaxed pl-1 font-medium">
                      {data.redFlags.emergencyTriggers?.map((trigger: string, idx: number) => (
                        <li key={idx} className="marker:text-rose-600">{trigger}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 📞 Clinic Triggers */}
                  <div className="bg-white/90 p-5 rounded-xl border border-amber-200 shadow-2xs space-y-2 print:p-3 print:border-amber-300">
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 print:text-amber-950">
                      📞 Contact Physician / Specialist Clinic If:
                    </p>
                    <ul className="text-xs text-amber-950 space-y-2 list-disc list-inside leading-relaxed pl-1 font-medium">
                      {data.redFlags.clinicTriggers?.map((trigger: string, idx: number) => (
                        <li key={idx} className="marker:text-amber-600">{trigger}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Care Timeline & Task Dependencies */}
            {data?.timeline && (
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 print:break-inside-avoid print:p-4 print:border-slate-300">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between print:pb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Care Timeline & Dependencies</h3>
                    <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
                      Sequential clinical milestones structured to avoid care oversights.
                    </p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-xl border border-blue-100 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    {data.timeline.length} Steps Sequence
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 print:grid-cols-1 print:gap-3">
                  {data.timeline.map((step: any, idx: number) => (
                    <div key={idx} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 relative space-y-2 hover:bg-slate-50 transition-colors print:p-3 print:bg-white print:border-slate-300">
                      <div className="flex items-center justify-between mb-1">
                        <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-2xs print:bg-slate-900">
                          {step.step}
                        </span>
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                          {step.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{step.event}</h4>
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 print:text-slate-800">
                        <strong className="text-slate-700 print:text-slate-900">Prerequisite Dependency:</strong> {step.dependency}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

      </div>

      {/* Modal / Overlay for Follow-Up Document Upload */}
      {isFollowUpOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Upload Follow-Up Medical Document</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach lab reports, revised prescriptions, or specialist notes to update active plan.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFollowUpOpen(false);
                  setFollowUpFiles([]);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Follow-up dropzone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 transition-all rounded-2xl p-6 text-center relative group cursor-pointer">
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFollowUpFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <span className="text-3xl block">📑</span>
                <p className="text-xs font-semibold text-slate-800">
                  Click or drag follow-up medical files here
                </p>
                <p className="text-[11px] text-slate-400">Supports PDF, PNG/JPG/WEBP Scans, and Text files</p>
              </div>
            </div>

            {/* Selected Follow-up Files */}
            {followUpFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">New Documents ({followUpFiles.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {followUpFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 font-medium"
                    >
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                      <button
                        onClick={() => removeFollowUpFile(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsFollowUpOpen(false);
                  setFollowUpFiles([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAnalyze(true)}
                disabled={loading || followUpFiles.length === 0}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-sm transition-all flex items-center gap-2 ${
                  loading || followUpFiles.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-98 cursor-pointer shadow-md'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reconciling Context...
                  </>
                ) : (
                  <>⚡ Reconcile & Update Plan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Source Evidence Modal ("Why?") */}
      {activeSource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Source Discrepancy Evidence</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeSource.title}</p>
              </div>
              <button
                onClick={() => setActiveSource(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeSource.sources.map((src, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                      📄 {src.documentName || `Document Source ${idx + 1}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                    "{src.excerpt || 'No explicit text snippet captured from document.'}"
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <strong className="font-bold text-amber-950">Clinical Guardrail:</strong>
              <p className="text-amber-900">CareBridge AI flags discrepancies without altering physician orders. Please verify with the prescribing clinician before making medication adjustments.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveSource(null)}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Close Evidence Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}