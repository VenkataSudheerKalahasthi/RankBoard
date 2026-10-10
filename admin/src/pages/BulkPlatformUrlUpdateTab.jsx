import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Search,
  Filter,
  FileCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sliders,
  Check,
  StopCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';

const PLATFORMS = [
  {
    key: 'leetcode',
    name: 'LeetCode',
    weight: '40% Score',
    color: 'amber',
    badgeVariant: 'warning',
    sampleUrl: 'https://leetcode.com/u/student_sample/',
  },
  {
    key: 'gfg',
    name: 'GeeksforGeeks',
    weight: '30% Score',
    color: 'emerald',
    badgeVariant: 'success',
    sampleUrl: 'https://www.geeksforgeeks.org/user/student_sample/',
  },
  {
    key: 'hackerrank',
    name: 'HackerRank',
    weight: '30% Score',
    color: 'emerald',
    badgeVariant: 'success',
    sampleUrl: 'https://www.hackerrank.com/profile/student_sample',
  },
  {
    key: 'codeforces',
    name: 'Codeforces',
    weight: '0% (Stats Only)',
    color: 'sky',
    badgeVariant: 'info',
    sampleUrl: 'https://codeforces.com/profile/student_sample',
  },
  {
    key: 'codechef',
    name: 'CodeChef',
    weight: '0% (Stats Only)',
    color: 'purple',
    badgeVariant: 'purple',
    sampleUrl: 'https://www.codechef.com/users/student_sample',
  },
];

const IDENTIFIER_ALIASES = {
  email: ['email', 'mail', 'email address', 'emailaddress', 'email id', 'emailid', 'student email', 'student mail'],
  rollNumber: ['roll number', 'roll no', 'rollno', 'roll_number', 'rollnumber', 'roll', 'registration no', 'reg no', 'htno', 'hall ticket'],
};

const PLATFORM_URL_ALIASES = {
  leetcode: ['leetcode profile', 'leetcode url', 'leetcode link', 'leetcode handle', 'leetcode', 'leetcode profile url'],
  gfg: ['geeksforgeeks profile', 'geeksforgeeks url', 'gfg profile', 'gfg url', 'geeksforgeeks', 'gfg', 'geeks for geeks profile', 'geeks for geeks', 'gfg link'],
  hackerrank: ['hackerrank profile', 'hackerrank url', 'hackerrank link', 'hackerrank handle', 'hackerrank', 'hr profile', 'hr url', 'hr', 'hacker rank profile', 'hacker rank'],
  codeforces: ['codeforces profile', 'codeforces url', 'codeforces link', 'codeforces handle', 'codeforces', 'cf profile', 'cf url', 'cf', 'codeforces link'],
  codechef: ['codechef profile', 'codechef url', 'codechef link', 'codechef handle', 'codechef', 'cc profile', 'cc url', 'cc', 'codechef link'],
};

const normalizeStr = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[_\-–—]/g, ' ').replace(/\s+/g, ' ');
};

export const BulkPlatformUrlUpdateTab = ({ onImportComplete, initialAutoSync = false }) => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyWarning } = useNotifications();
  const fileInputRef = useRef(null);
  const cancelRequestedRef = useRef(false);

  // Selected Platform & Identifier Strategy
  const [selectedPlatform, setSelectedPlatform] = useState('hackerrank');
  const [identifierType, setIdentifierType] = useState('auto'); // 'auto' | 'email' | 'rollNumber'

  // Step: 'UPLOAD' -> 'PREVIEW' -> 'PROCESSING' -> 'RESULT'
  const [step, setStep] = useState('UPLOAD');
  const [fileName, setFileName] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Preview Options & Confirmation
  const [confirmReplacements, setConfirmReplacements] = useState(false);
  const [autoSync, setAutoSync] = useState(initialAutoSync);

  // Preview Filtering & Pagination
  const [previewFilter, setPreviewFilter] = useState('ALL'); // 'ALL' | 'READY' | 'REPLACEMENTS' | 'UNCHANGED' | 'NOT_FOUND' | 'INVALID'
  const [previewSearch, setPreviewSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Processing & Progress Tracking
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    remaining: 0,
    percent: 0,
  });
  const [importResult, setImportResult] = useState(null);

  const currentPlatformObj = PLATFORMS.find((p) => p.key === selectedPlatform) || PLATFORMS[2];

  // 1. Download Platform-Specific Template
  const handleDownloadTemplate = () => {
    const pName = currentPlatformObj.name;
    const headers = ['Email', `${pName} URL`];
    const sampleRows = [
      ['student1@college.edu', currentPlatformObj.sampleUrl.replace('sample', 'john_doe')],
      ['student2@college.edu', currentPlatformObj.sampleUrl.replace('sample', 'priya_p')],
      ['student3@college.edu', currentPlatformObj.sampleUrl.replace('sample', 'alex_coder')],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 45 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${pName} URLs`);
    XLSX.writeFile(workbook, `${selectedPlatform}_url_update_template.xlsx`);
    notifySuccess(`Excel template for ${pName} downloaded successfully.`);
  };

  // 2. Parse Spreadsheet on Client and Send to Backend Validation
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      notifyError('Please upload a valid Excel spreadsheet (.xlsx, .xls) or CSV file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          notifyError('The selected spreadsheet contains no sheets.');
          return;
        }

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawSheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawSheetData || rawSheetData.length < 2) {
          notifyError('The uploaded file must contain a header row and at least one student data row.');
          return;
        }

        const headerRow = rawSheetData[0].map((h) => String(h).trim());
        const normHeaders = headerRow.map((h) => normalizeStr(h));

        // Detect Identifier Column (Email or Roll Number)
        let idColIdx = -1;
        let idTypeDetected = 'email';

        for (let i = 0; i < normHeaders.length; i++) {
          if (IDENTIFIER_ALIASES.email.includes(normHeaders[i])) {
            idColIdx = i;
            idTypeDetected = 'email';
            break;
          }
        }

        if (idColIdx === -1) {
          for (let i = 0; i < normHeaders.length; i++) {
            if (IDENTIFIER_ALIASES.rollNumber.includes(normHeaders[i])) {
              idColIdx = i;
              idTypeDetected = 'rollNumber';
              break;
            }
          }
        }

        if (idColIdx === -1) {
          notifyError('Missing required identifier column. Please include an "Email" or "Roll Number" column.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Detect Platform URL Column
        const targetAliases = PLATFORM_URL_ALIASES[selectedPlatform] || [];
        let urlColIdx = -1;

        for (let i = 0; i < normHeaders.length; i++) {
          const h = normHeaders[i];
          if (targetAliases.includes(h) || h === selectedPlatform || h.includes(selectedPlatform)) {
            urlColIdx = i;
            break;
          }
        }

        if (urlColIdx === -1) {
          notifyError(
            `Missing column for ${currentPlatformObj.name}. Accepted column headers: "${currentPlatformObj.name} URL", "${currentPlatformObj.name} Profile", or "${currentPlatformObj.name}".`
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Extract student rows
        const parsedRows = [];
        for (let rIdx = 1; rIdx < rawSheetData.length; rIdx++) {
          const rowArr = rawSheetData[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          const rawId = String(rowArr[idColIdx] || '').trim();
          const rawUrl = String(rowArr[urlColIdx] || '').trim();

          // Skip completely empty rows
          if (!rawId && !rawUrl) continue;

          parsedRows.push({
            rowNumber: rIdx,
            rowIndex: rIdx,
            identifier: rawId,
            url: rawUrl,
          });
        }

        if (parsedRows.length === 0) {
          notifyError('No non-empty student URL rows found in the uploaded file.');
          return;
        }

        // Send to backend validation endpoint
        setValidating(true);
        try {
          const response = await adminService.validateBulkPlatformUrls({
            platform: selectedPlatform,
            identifierType: identifierType !== 'auto' ? identifierType : idTypeDetected,
            rows: parsedRows,
          });

          if (response.success) {
            setValidationResult(response);
            setConfirmReplacements(false);
            setCurrentPage(1);
            setStep('PREVIEW');
            notifySuccess(
              `File analyzed: ${response.summary.totalRows} rows processed. ${response.summary.readyToUpdate} ready to update.`
            );
          }
        } catch (err) {
          notifyError(err.message || 'Validation failed on the backend server.');
        } finally {
          setValidating(false);
        }
      } catch (err) {
        notifyError('Failed to parse spreadsheet: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // 3. Execute Updates in Controlled Batches with Real-Time Progress
  const handleConfirmUpdate = async () => {
    if (!validationResult || !validationResult.rows) return;

    // Filter rows that are eligible for update
    const rowsToProcess = validationResult.rows.filter((r) => {
      if (!r.isValid || !r.studentId) return false;
      if (r.status === 'UNCHANGED' || r.changeType === 'IDENTICAL') return false;
      if (r.changeType === 'REPLACEMENT' && !confirmReplacements) return false;
      return true;
    });

    if (rowsToProcess.length === 0) {
      notifyWarning('No valid student rows are queued for URL update.');
      return;
    }

    setStep('PROCESSING');
    cancelRequestedRef.current = false;

    const total = rowsToProcess.length;
    const batchSize = 50; // Controlled batch size prevents overloading connection/memory
    let processed = 0;
    let updated = 0;
    let unchanged = validationResult.summary.unchanged || 0;
    let skipped = 0;
    let failed = 0;
    const failedRows = [...(validationResult.rows.filter((r) => !r.isValid) || [])];
    const updatedRows = [];

    setProgress({
      total,
      processed: 0,
      updated: 0,
      unchanged,
      skipped: 0,
      failed: failedRows.length,
      remaining: total,
      percent: 0,
    });

    for (let i = 0; i < rowsToProcess.length; i += batchSize) {
      if (cancelRequestedRef.current) {
        notifyWarning('Import cancelled by Administrator. Partial updates were preserved.');
        break;
      }

      const chunk = rowsToProcess.slice(i, i + batchSize);

      try {
        const batchRes = await adminService.executeBulkPlatformUrlsBatch({
          platform: selectedPlatform,
          rows: chunk,
          confirmReplacements,
          autoSync,
        });

        if (batchRes.success) {
          updated += batchRes.updatedCount || 0;
          unchanged += batchRes.unchangedCount || 0;
          skipped += batchRes.skippedCount || 0;
          failed += batchRes.failedCount || 0;

          if (batchRes.failedRows) {
            failedRows.push(...batchRes.failedRows);
          }
          if (batchRes.updatedRows) {
            updatedRows.push(...batchRes.updatedRows);
          }
        }
      } catch (chunkErr) {
        console.error('[Bulk Update Batch Error]:', chunkErr.message);
        failed += chunk.length;
        chunk.forEach((c) => {
          failedRows.push({
            rowNumber: c.rowNumber,
            identifier: c.identifier,
            submittedUrl: c.submittedUrl,
            reason: chunkErr.message || 'Batch update failure',
          });
        });
      }

      processed += chunk.length;
      const percent = Math.min(100, Math.round((processed / total) * 100));

      setProgress({
        total,
        processed,
        updated,
        unchanged,
        skipped,
        failed,
        remaining: Math.max(0, total - processed),
        percent,
      });

      // Brief yield to keep UI responsive
      await new Promise((res) => setTimeout(res, 50));
    }

    // Wrap up final results
    const finalReport = {
      platform: selectedPlatform,
      platformName: currentPlatformObj.name,
      totalRows: validationResult.summary.totalRows,
      updatedCount: updated,
      unchangedCount: unchanged,
      skippedCount: skipped + (validationResult.summary.studentsNotFound || 0),
      failedCount: failed + (validationResult.summary.invalidUrls || 0),
      failedRows,
      updatedRows,
      autoSyncTriggered: autoSync,
    };

    setImportResult(finalReport);
    setStep('RESULT');
    notifySuccess(
      `Platform URL update complete: ${updated} updated, ${unchanged} unchanged, ${failed} failed.`
    );

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleCancelOperation = () => {
    cancelRequestedRef.current = true;
  };

  // 4. Download Failed / Skipped Rows Report
  const handleDownloadFailedReport = () => {
    if (!importResult || !importResult.failedRows || importResult.failedRows.length === 0) return;

    const exportRows = importResult.failedRows.map((f) => ({
      'Row Number': f.rowNumber,
      'Identifier': f.identifier,
      'Submitted URL': f.submittedUrl,
      'Platform': currentPlatformObj.name,
      'Failure Reason': f.reason || 'Validation or database error',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');
    XLSX.writeFile(workbook, `failed_${selectedPlatform}_urls_report_${Date.now()}.xlsx`);
    notifySuccess('Failed rows report downloaded.');
  };

  const resetModeB = () => {
    setStep('UPLOAD');
    setFileName('');
    setValidationResult(null);
    setImportResult(null);
    setPreviewFilter('ALL');
    setPreviewSearch('');
    setCurrentPage(1);
    setConfirmReplacements(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter & Search Preview Rows
  const allPreviewRows = validationResult?.rows || [];
  const filteredPreviewRows = allPreviewRows.filter((r) => {
    if (previewFilter === 'READY' && (r.status !== 'READY_TO_UPDATE' || r.changeType !== 'NEW_LINK')) return false;
    if (previewFilter === 'REPLACEMENTS' && (r.status !== 'REPLACEMENT' && r.changeType !== 'REPLACEMENT')) return false;
    if (previewFilter === 'UNCHANGED' && r.status !== 'UNCHANGED') return false;
    if (previewFilter === 'NOT_FOUND' && r.status !== 'STUDENT_NOT_FOUND') return false;
    if (previewFilter === 'INVALID' && (r.status === 'READY_TO_UPDATE' || r.status === 'UNCHANGED' || r.status === 'REPLACEMENT')) return false;

    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const matchId = (r.identifier || '').toLowerCase().includes(q);
      const matchName = (r.student?.name || '').toLowerCase().includes(q);
      const matchRoll = (r.student?.rollNumber || '').toLowerCase().includes(q);
      const matchUrl = (r.submittedUrl || '').toLowerCase().includes(q);
      return matchId || matchName || matchRoll || matchUrl;
    }
    return true;
  });

  // Paginated Preview Rows
  const totalPages = Math.max(1, Math.ceil(filteredPreviewRows.length / pageSize));
  const paginatedRows = filteredPreviewRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const replacementsCount = validationResult?.summary?.replacements || 0;
  const readyCount = (validationResult?.summary?.readyToUpdate || 0) - (confirmReplacements ? 0 : replacementsCount);

  return (
    <div className="space-y-6">
      {/* Platform & Identifier Configuration Bar */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Platform Selector Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Select Coding Platform:</span>
              <span className="text-[11px] text-slate-400">
                (Updates only this platform's profile URL)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PLATFORMS.map((p) => {
                const isSelected = selectedPlatform === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={step !== 'UPLOAD'}
                    onClick={() => {
                      setSelectedPlatform(p.key);
                      resetModeB();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white disabled:opacity-50'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.weight}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identifier Strategy & Template Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Matching By:</span>
              <select
                value={identifierType}
                onChange={(e) => setIdentifierType(e.target.value)}
                disabled={step !== 'UPLOAD'}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-50"
              >
                <option value="auto">Auto-detect (Email or Roll Number)</option>
                <option value="email">Email Address</option>
                <option value="rollNumber">Roll Number</option>
              </select>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={Download}
            >
              {currentPlatformObj.name} Template (.xlsx)
            </Button>
          </div>
        </div>

        {/* Zero Regression Safety Notice */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-300 font-semibold">Zero-Regression Safety:</strong> Updating{' '}
            <span className="text-brand-300 font-medium">{currentPlatformObj.name}</span> will{' '}
            <strong className="text-emerald-300">never modify</strong> student names, roll numbers, departments, years,
            or any other coding platform URLs/statistics.
          </span>
        </div>
      </Card>

      {/* STEP 1: FILE UPLOAD ZONE */}
      {step === 'UPLOAD' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto shadow-inner border border-brand-500/20">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">
                Upload {currentPlatformObj.name} Spreadsheet
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload an <span className="text-slate-200 font-mono font-semibold">.xlsx</span>,{' '}
                <span className="text-slate-200 font-mono font-semibold">.xls</span>, or{' '}
                <span className="text-slate-200 font-mono font-semibold">.csv</span> file containing only{' '}
                <span className="text-brand-300 font-semibold">Email</span> (or Roll Number) and{' '}
                <span className="text-brand-300 font-semibold">{currentPlatformObj.name} URL</span>.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                loading={validating}
                icon={FileSpreadsheet}
              >
                Choose File & Validate {currentPlatformObj.name} URLs
              </Button>
            </div>

            <div className="text-[11px] text-slate-400 pt-5 border-t border-slate-800/80 text-left space-y-2 bg-slate-950/40 p-4 rounded-xl border">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
                Required 2 Columns Only:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Column 1 (Identifier):</div>
                  <div className="font-semibold text-slate-200 mt-0.5">Email (or Roll Number)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">e.g. student1@example.com</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Column 2 (URL):</div>
                  <div className="font-semibold text-brand-300 mt-0.5">{currentPlatformObj.name} URL</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{currentPlatformObj.sampleUrl}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: PREVIEW & CONFIRMATION */}
      {step === 'PREVIEW' && validationResult && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400">Total Rows</div>
              <div className="text-2xl font-black text-slate-100 mt-0.5">
                {validationResult.summary.totalRows ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-emerald-900/50 bg-emerald-950/20">
              <div className="text-[11px] font-semibold text-emerald-400">Matched Students</div>
              <div className="text-2xl font-black text-emerald-300 mt-0.5">
                {validationResult.summary.matchedExisting ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-blue-900/50 bg-blue-950/20">
              <div className="text-[11px] font-semibold text-blue-400">Ready to Update (New)</div>
              <div className="text-2xl font-black text-blue-300 mt-0.5">
                {validationResult.summary.readyToUpdate - (validationResult.summary.replacements || 0)}
              </div>
            </Card>

            <Card className="p-3.5 border-amber-900/50 bg-amber-950/20">
              <div className="text-[11px] font-semibold text-amber-400">URLs to Replace</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                {validationResult.summary.replacements ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-slate-800 bg-slate-900/40">
              <div className="text-[11px] font-semibold text-slate-400">Unchanged (Identical)</div>
              <div className="text-2xl font-black text-slate-300 mt-0.5">
                {validationResult.summary.unchanged ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-rose-900/50 bg-rose-950/20">
              <div className="text-[11px] font-semibold text-rose-400">Failed / Not Found</div>
              <div className="text-2xl font-black text-rose-300 mt-0.5">
                {(validationResult.summary.invalidUrls || 0) +
                  (validationResult.summary.studentsNotFound || 0) +
                  (validationResult.summary.missingValues || 0) +
                  (validationResult.summary.duplicatesInFile || 0)}
              </div>
            </Card>
          </div>

          {/* Replacement Warning Banner if replacements exist */}
          {replacementsCount > 0 && (
            <Card className="p-4 border-amber-900/60 bg-amber-950/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-200">
                      Explicit Confirmation Required: {replacementsCount} Existing URL(s) Will Be Replaced
                    </h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Some matched students already have a different {currentPlatformObj.name} URL linked in the database.
                      Check the box to confirm replacing them with the new URLs from the spreadsheet.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-amber-900/30 px-3 py-2 rounded-lg border border-amber-800/60 shrink-0">
                  <input
                    type="checkbox"
                    checked={confirmReplacements}
                    onChange={(e) => setConfirmReplacements(e.target.checked)}
                    className="rounded bg-slate-950 border-amber-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-amber-200">
                    Confirm replacing {replacementsCount} existing URL(s)
                  </span>
                </label>
              </div>
            </Card>
          )}

          {/* Options & Action Bar */}
          <Card className="p-4 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4"
                />
                <span className="text-slate-200">
                  Auto-fetch {currentPlatformObj.name} statistics & recalculate rankings upon update
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={resetModeB}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmUpdate}
                disabled={readyCount === 0 && (!confirmReplacements || replacementsCount === 0)}
                icon={CheckCircle2}
              >
                Confirm URL Update ({confirmReplacements ? validationResult.summary.readyToUpdate : validationResult.summary.readyToUpdate - replacementsCount} Students)
              </Button>
            </div>
          </Card>

          {/* Preview Table Header & Filters */}
          <Card>
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Update Preview:</span>
                  <span className="font-mono text-brand-400 font-normal">{fileName}</span>
                  <Badge variant={currentPlatformObj.badgeVariant} size="xs">
                    {currentPlatformObj.name}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-400">
                  Review matched students, existing URLs, and proposed changes before persisting into Supabase.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search student or URL..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => {
                      setPreviewFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      previewFilter === 'ALL' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({allPreviewRows.length})
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFilter('READY');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      previewFilter === 'READY' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    New ({validationResult.summary.readyToUpdate - (validationResult.summary.replacements || 0)})
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFilter('REPLACEMENTS');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      previewFilter === 'REPLACEMENTS' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Replacements ({validationResult.summary.replacements || 0})
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFilter('UNCHANGED');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      previewFilter === 'UNCHANGED' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Identical ({validationResult.summary.unchanged || 0})
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFilter('INVALID');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      previewFilter === 'INVALID' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Errors ({validationResult.summary.failedRows || 0})
                  </button>
                </div>
              </div>
            </div>

            {/* Virtualized/Paginated Table */}
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr>
                    <th className="table-th w-10">#</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Student Name</th>
                    <th className="table-th">Identifier</th>
                    <th className="table-th">Roll Number</th>
                    <th className="table-th">Existing {currentPlatformObj.name} URL</th>
                    <th className="table-th">Proposed New URL</th>
                    <th className="table-th">Outcome / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                        No student rows match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r) => {
                      const isReplacement = r.changeType === 'REPLACEMENT';
                      const isIdentical = r.status === 'UNCHANGED';
                      const isInvalid = !r.isValid;

                      return (
                        <tr key={r.rowNumber} className="hover:bg-slate-800/30 transition-colors">
                          <td className="table-td font-mono text-slate-500">{r.rowNumber}</td>
                          <td className="table-td whitespace-nowrap">
                            {isInvalid ? (
                              <Badge variant="danger">{r.status}</Badge>
                            ) : isReplacement ? (
                              <Badge variant="warning">Replacement</Badge>
                            ) : isIdentical ? (
                              <Badge variant="default">Unchanged</Badge>
                            ) : (
                              <Badge variant="success">Ready to Link</Badge>
                            )}
                          </td>
                          <td className="table-td font-semibold text-slate-100 whitespace-nowrap">
                            {r.student?.name || '—'}
                          </td>
                          <td className="table-td font-mono text-[11px] text-slate-300">
                            {r.identifier}
                          </td>
                          <td className="table-td font-mono text-[11px] text-slate-400">
                            {r.student?.rollNumber || '—'}
                          </td>
                          <td className="table-td font-mono text-[11px] max-w-[200px] truncate text-slate-400">
                            {r.existingUrl ? (
                              <span title={r.existingUrl}>{r.existingUrl}</span>
                            ) : (
                              <span className="text-slate-600">— (None linked)</span>
                            )}
                          </td>
                          <td className="table-td font-mono text-[11px] max-w-[220px] truncate text-brand-300">
                            <span title={r.canonicalUrl || r.submittedUrl}>
                              {r.canonicalUrl || r.submittedUrl}
                            </span>
                          </td>
                          <td className="table-td text-[11px]">
                            {isInvalid ? (
                              <span className="text-rose-400 font-medium">{r.reason}</span>
                            ) : isReplacement ? (
                              <span className="text-amber-300">{r.reason}</span>
                            ) : isIdentical ? (
                              <span className="text-slate-400">{r.reason}</span>
                            ) : (
                              <span className="text-emerald-400 font-medium">Ready to update</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPreviewRows.length}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </Card>
        </div>
      )}

      {/* STEP 2B: CONTROLLED PROCESSING STATE */}
      {step === 'PROCESSING' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto shadow-inner border border-brand-500/20 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">
                Updating {currentPlatformObj.name} URLs...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Executing targeted database updates in controlled batches with backpressure protection.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>
                  Processed {progress.processed} of {progress.total} rows
                </span>
                <span className="font-bold text-brand-400">{progress.percent}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            {/* Real-time counters */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-emerald-900/40">
                <div className="text-[10px] text-emerald-400">Updated</div>
                <div className="text-base font-bold text-emerald-300">{progress.updated}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Unchanged</div>
                <div className="text-base font-bold text-slate-300">{progress.unchanged}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-amber-900/40">
                <div className="text-[10px] text-amber-400">Skipped</div>
                <div className="text-base font-bold text-amber-300">{progress.skipped}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-rose-900/40">
                <div className="text-[10px] text-rose-400">Failed</div>
                <div className="text-base font-bold text-rose-300">{progress.failed}</div>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="danger" size="sm" onClick={handleCancelOperation} icon={StopCircle}>
                Cancel Remaining Batches
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: FINAL RESULTS */}
      {step === 'RESULT' && importResult && (
        <div className="space-y-5">
          <Card className="p-8">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
                <FileCheck className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-100">
                {currentPlatformObj.name} URL Update Completed
              </h3>
              <p className="text-xs text-slate-400">
                Targeted platform profiles have been updated in Supabase. All student records, personal info,
                and other platform links were protected and remain intact.
              </p>

              {/* Result Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/50 bg-emerald-950/10">
                  <div className="text-[11px] text-emerald-400 font-medium">Successfully Updated</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    {importResult.updatedCount ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Unchanged</div>
                  <div className="text-xl font-black text-slate-300 mt-0.5">
                    {importResult.unchangedCount ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-amber-900/50 bg-amber-950/10">
                  <div className="text-[11px] text-amber-400 font-medium">Skipped</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">
                    {importResult.skippedCount ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/50 bg-rose-950/10">
                  <div className="text-[11px] text-rose-400 font-medium">Failed</div>
                  <div className="text-xl font-black text-rose-400 mt-0.5">
                    {importResult.failedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* AutoSync notification if triggered */}
              {importResult.autoSyncTriggered && (
                <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-left flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="text-xs text-blue-200">
                    <span className="font-semibold">Selective Synchronization Initiated:</span> Background scraping
                    and score recalculation running for affected students on{' '}
                    <strong className="text-white">{currentPlatformObj.name}</strong> only.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={resetModeB}>
                  Update Another Platform
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/students')}>
                  View Students Directory →
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/leaderboard')}>
                  View Live Leaderboard →
                </Button>
              </div>
            </div>
          </Card>

          {/* Failed / Skipped Rows Breakdown if any */}
          {importResult.failedRows && importResult.failedRows.length > 0 && (
            <Card className="border-rose-900/40">
              <CardHeader
                title={`Failed & Skipped Rows Breakdown (${importResult.failedRows.length})`}
                subtitle="Review failed records and error reasons below. Downloadable report available."
                action={
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleDownloadFailedReport}
                    icon={Download}
                  >
                    Download Failed Report (.xlsx)
                  </Button>
                }
              />
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                    <tr>
                      <th className="table-th w-12">Row #</th>
                      <th className="table-th">Identifier</th>
                      <th className="table-th">Submitted URL</th>
                      <th className="table-th">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {importResult.failedRows.map((f, idx) => (
                      <tr key={idx} className="hover:bg-rose-950/10 transition-colors">
                        <td className="table-td font-mono text-rose-400">{f.rowNumber}</td>
                        <td className="table-td font-mono text-[11px] text-slate-200">{f.identifier || '—'}</td>
                        <td className="table-td font-mono text-[11px] text-slate-400 max-w-[250px] truncate">
                          {f.submittedUrl || '—'}
                        </td>
                        <td className="table-td text-rose-400 font-medium">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
