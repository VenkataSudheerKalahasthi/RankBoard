import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  History,
  ArrowRight,
  FileCheck,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  UserCheck,
  UserPlus,
  Users,
  Link2,
} from 'lucide-react';
import { BulkPlatformUrlUpdateTab } from './BulkPlatformUrlUpdateTab';

const REQUIRED_HEADERS = [
  'Name',
  'Email',
  'Roll Number',
  'Branch',
  'Year',
  'LeetCode Profile',
  'GeeksforGeeks Profile',
  'HackerRank Profile',
  'Codeforces Profile',
  'CodeChef Profile',
];

const COLUMN_ALIASES = {
  'Name': ['name', 'student name', 'studentname', 'full name', 'fullname'],
  'Email': ['email', 'mail', 'email address', 'emailaddress', 'email id', 'emailid', 'student email'],
  'Roll Number': ['roll number', 'roll no', 'rollno', 'roll_number', 'rollnumber', 'roll', 'registration no', 'reg no'],
  'Branch': ['branch', 'department', 'dept', 'stream'],
  'Year': ['year', 'class year', 'academic year', 'batch year'],
  'LeetCode Profile': ['leetcode profile', 'leetcode', 'leetcode url', 'leetcode link', 'leetcode handle', 'leetcodeurl'],
  'GeeksforGeeks Profile': ['geeksforgeeks profile', 'geeksforgeeks', 'gfg profile', 'gfg', 'gfg url', 'gfgurl', 'geeksforgeeks url', 'geeks for geeks profile', 'geeks for geeks'],
  'HackerRank Profile': ['hackerrank profile', 'hackerrank', 'hr profile', 'hr', 'hackerrank url', 'hackerrankurl', 'hackerrank link', 'hacker rank profile', 'hacker rank'],
  'Codeforces Profile': ['codeforces profile', 'codeforces', 'cf profile', 'cf', 'codeforces url', 'codeforcesurl', 'codeforces link'],
  'CodeChef Profile': ['codechef profile', 'codechef', 'cc profile', 'cc', 'codechef url', 'codechefurl', 'codechef link'],
};

const normalizeStr = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[_\-–—]/g, ' ').replace(/\s+/g, ' ');
};

export const ImportStudents = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyWarning } = useNotifications();
  const fileInputRef = useRef(null);

  // Mode: 'FULL_IMPORT' (Mode A) | 'PLATFORM_URL_UPDATE' (Mode B)
  const [activeMode, setActiveMode] = useState('FULL_IMPORT');

  // Flow Step: 'UPLOAD' -> 'PREVIEW' -> 'RESULT'
  const [step, setStep] = useState('UPLOAD');
  const [fileName, setFileName] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Filter & Search in Preview
  const [previewFilter, setPreviewFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID'
  const [previewSearch, setPreviewSearch] = useState('');

  // Import options
  const [updateDuplicates, setUpdateDuplicates] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Import History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await adminService.getImportHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSettingsConfig = async () => {
    try {
      const res = await adminService.getSettings();
      if (res.success && res.settings) {
        const autoSyncEnabled = res.settings.autoSyncAfterImport !== undefined
          ? res.settings.autoSyncAfterImport
          : (res.settings.enableAutoSyncOnImport ?? false);
        setAutoSync(Boolean(autoSyncEnabled));
      }
    } catch (err) {
      console.warn('Could not pre-load autoSync setting:', err.message);
    }
  };

  useEffect(() => {
    fetchHistory();
    loadSettingsConfig();
  }, []);

  const handleDownloadTemplate = () => {
    const headers = [
      'Name',
      'Email',
      'Roll Number',
      'Branch',
      'Year',
      'LeetCode Profile',
      'GeeksforGeeks Profile',
      'HackerRank Profile',
      'Codeforces Profile',
      'CodeChef Profile',
    ];

    const sampleRows = [
      [
        'Aarav Sharma',
        'aarav.sharma@college.edu',
        '21CS001',
        'CSE',
        4,
        'https://leetcode.com/u/aarav_coder/',
        'https://www.geeksforgeeks.org/user/aaravsharma21/',
        'https://www.hackerrank.com/profile/aarav_hr',
        'https://codeforces.com/profile/aarav_cf',
        'https://www.codechef.com/users/aarav_cc',
      ],
      [
        'Priya Patel',
        'priya.patel@college.edu',
        '21IT045',
        'IT',
        4,
        'https://leetcode.com/u/priya_p/',
        'https://www.geeksforgeeks.org/user/priyapatel/',
        'https://www.hackerrank.com/profile/priya_hr',
        '',
        '',
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    
    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 22 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Roll Number
      { wch: 12 }, // Branch
      { wch: 8 },  // Year
      { wch: 38 }, // LeetCode
      { wch: 45 }, // GFG
      { wch: 40 }, // HackerRank
      { wch: 38 }, // Codeforces
      { wch: 38 }, // CodeChef
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_import_template.xlsx');
    notifySuccess('Excel template downloaded successfully.');
  };

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
        
        // Read raw 2D array of cells
        const rawSheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawSheetData || rawSheetData.length < 2) {
          notifyError('The uploaded file must contain a header row and at least one student data row.');
          return;
        }

        const headerRow = rawSheetData[0].map((h) => String(h).trim());
        
        // 1. Validate headers
        const headerMap = {};
        for (const reqHeader of REQUIRED_HEADERS) {
          let foundIndex = -1;
          const aliases = COLUMN_ALIASES[reqHeader] || [];
          const reqNorm = normalizeStr(reqHeader);

          for (let i = 0; i < headerRow.length; i++) {
            const hNorm = normalizeStr(headerRow[i]);
            if (hNorm === reqNorm || aliases.includes(hNorm)) {
              foundIndex = i;
              break;
            }
          }

          if (foundIndex === -1) {
            notifyError(`Invalid Excel format. Missing column: ${reqHeader}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          headerMap[reqHeader] = foundIndex;
        }

        // 2. Parse data rows into standard format
        const rowsToValidate = [];
        for (let rIdx = 1; rIdx < rawSheetData.length; rIdx++) {
          const rowArr = rawSheetData[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          // Check if completely empty
          const isEmpty = rowArr.every((c) => c === undefined || c === null || String(c).trim() === '');
          if (isEmpty) continue;

          rowsToValidate.push({
            rowNumber: rIdx,
            rowIndex: rIdx,
            name: String(rowArr[headerMap['Name']] || '').trim(),
            email: String(rowArr[headerMap['Email']] || '').trim().toLowerCase(),
            rollNumber: String(rowArr[headerMap['Roll Number']] || '').trim(),
            branch: String(rowArr[headerMap['Branch']] || '').trim(),
            year: rowArr[headerMap['Year']] !== undefined ? rowArr[headerMap['Year']] : '',
            leetcodeUrl: String(rowArr[headerMap['LeetCode Profile']] || '').trim(),
            gfgUrl: String(rowArr[headerMap['GeeksforGeeks Profile']] || '').trim(),
            hackerrankUrl: String(rowArr[headerMap['HackerRank Profile']] || '').trim(),
            codeforcesUrl: String(rowArr[headerMap['Codeforces Profile']] || '').trim(),
            codechefUrl: String(rowArr[headerMap['CodeChef Profile']] || '').trim(),
          });
        }

        if (rowsToValidate.length === 0) {
          notifyError('No non-empty student rows found in the uploaded file.');
          return;
        }

        // 3. Send to backend validation
        setValidating(true);
        try {
          const response = await adminService.validateImportData(rowsToValidate);
          if (response.success) {
            setValidationResult(response);
            setStep('PREVIEW');
            notifySuccess(`File analyzed: ${response.summary.totalRows} student rows validated.`);
          }
        } catch (err) {
          notifyError(err.message || 'Validation failed on the server.');
        } finally {
          setValidating(false);
        }
      } catch (err) {
        notifyError('Failed to parse spreadsheet: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.rows) return;
    setImporting(true);
    try {
      const response = await adminService.confirmImport({
        rows: validationResult.rows,
        updateDuplicates,
        autoSync,
        fileName,
      });

      if (response.success) {
        setImportResult(response.results);
        setStep('RESULT');
        notifySuccess(response.message || 'Bulk student import completed successfully.');
        fetchHistory();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to execute student import.');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadFailedReport = () => {
    if (!importResult || !importResult.failedRows || importResult.failedRows.length === 0) return;

    const exportRows = importResult.failedRows.map((f) => ({
      'Row Number': f.rowNumber,
      'Student Name': f.name,
      'Email': f.email,
      'Roll Number': f.rollNumber,
      'Failure Reason': f.reason,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');
    XLSX.writeFile(workbook, `failed_import_report_${Date.now()}.xlsx`);
    notifySuccess('Failed rows report downloaded.');
  };

  const resetImport = () => {
    setStep('UPLOAD');
    setFileName('');
    setValidationResult(null);
    setImportResult(null);
    setPreviewFilter('ALL');
    setPreviewSearch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter preview rows
  const filteredPreviewRows = (validationResult?.rows || []).filter((r) => {
    // Status Filter
    if (previewFilter === 'VALID' && (r.status !== 'VALID' || !r.isValid)) return false;
    if (previewFilter === 'DUPLICATE' && r.status !== 'DUPLICATE') return false;
    if (previewFilter === 'INVALID' && r.status !== 'INVALID') return false;

    // Search Filter
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchEmail = (r.email || '').toLowerCase().includes(q);
      const matchRoll = (r.rollNumber || '').toLowerCase().includes(q);
      const matchBranch = (r.branch || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchRoll || matchBranch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>{activeMode === 'FULL_IMPORT' ? 'Bulk Student Excel Import' : "Update Existing Students' Platform URLs"}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800">
              {activeMode === 'FULL_IMPORT' ? 'Full Ingestion' : 'Targeted Update'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeMode === 'FULL_IMPORT'
              ? 'Ingest student records, validate 10 required platform columns, resolve duplicates, and trigger live ranking updates.'
              : 'Targeted updates for a single coding platform URL for existing students. Protects all other student data and rankings.'}
          </p>
        </div>

        {activeMode === 'FULL_IMPORT' && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={Download}
            >
              Download Excel Template
            </Button>
          </div>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-800 gap-2 sm:gap-6">
        <button
          type="button"
          onClick={() => setActiveMode('FULL_IMPORT')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeMode === 'FULL_IMPORT'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mode A — Full Student Import</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hidden sm:inline">
            10 Columns
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('PLATFORM_URL_UPDATE')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeMode === 'PLATFORM_URL_UPDATE'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Mode B — Update Existing Students' Platform URLs</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 hidden sm:inline">
            Targeted URL
          </span>
        </button>
      </div>

      {/* MODE B: BULK PLATFORM URL UPDATE */}
      {activeMode === 'PLATFORM_URL_UPDATE' && (
        <BulkPlatformUrlUpdateTab
          onImportComplete={fetchHistory}
          initialAutoSync={autoSync}
        />
      )}

      {/* MODE A: FULL STUDENT IMPORT WORKFLOW */}
      {activeMode === 'FULL_IMPORT' && (
        <>
          {/* STEP 1: FILE UPLOAD ZONE */}
          {step === 'UPLOAD' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto shadow-inner border border-brand-500/20">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Upload Student Spreadsheet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select an <span className="text-slate-200 font-mono font-semibold">.xlsx</span>, <span className="text-slate-200 font-mono font-semibold">.xls</span>, or <span className="text-slate-200 font-mono font-semibold">.csv</span> file following the 10-column Rankboard template.
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
                Choose Excel File & Validate
              </Button>
            </div>

            <div className="text-[11px] text-slate-400 pt-5 border-t border-slate-800/80 text-left space-y-2 bg-slate-950/40 p-4 rounded-xl border">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
                Required 10 Excel Columns (in exact order):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[10px] text-slate-300">
                <span className="p-1 bg-slate-900 rounded border border-slate-800">1. Name</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">2. Email</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">3. Roll Number</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">4. Branch</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">5. Year</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">6. LeetCode Profile</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">7. GeeksforGeeks Profile</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">8. HackerRank Profile</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">9. Codeforces Profile</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">10. CodeChef Profile</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: PREVIEW & DUPLICATE VALIDATION SUMMARY */}
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
              <div className="text-[11px] font-semibold text-emerald-400">Valid Rows</div>
              <div className="text-2xl font-black text-emerald-300 mt-0.5">
                {validationResult.summary.validRows ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-blue-900/50 bg-blue-950/20">
              <div className="text-[11px] font-semibold text-blue-400">New Students</div>
              <div className="text-2xl font-black text-blue-300 mt-0.5">
                {validationResult.summary.newStudents ?? validationResult.summary.validRows ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-amber-900/50 bg-amber-950/20">
              <div className="text-[11px] font-semibold text-amber-400">Existing Students</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                {validationResult.summary.duplicateRows ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-amber-900/40 bg-amber-950/10">
              <div className="text-[11px] font-semibold text-amber-300">Duplicate Rows</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {validationResult.summary.duplicateRows ?? 0}
              </div>
            </Card>

            <Card className="p-3.5 border-rose-900/50 bg-rose-950/20">
              <div className="text-[11px] font-semibold text-rose-400">Invalid Rows</div>
              <div className="text-2xl font-black text-rose-300 mt-0.5">
                {validationResult.summary.invalidRows ?? 0}
              </div>
            </Card>
          </div>

          {/* Import Settings & Actions Bar */}
          <Card className="p-4 bg-slate-900/90 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateDuplicates}
                  onChange={(e) => setUpdateDuplicates(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-medium text-slate-200">
                  Update existing students (updates profile info & platform profile URLs)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4"
                />
                <span>Auto-fetch coding platform stats & calculate scores upon import</span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={resetImport}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                loading={importing}
                icon={CheckCircle2}
              >
                Confirm Import ({((validationResult.summary.validRows ?? 0) + (updateDuplicates ? (validationResult.summary.duplicateRows ?? 0) : 0))} Students)
              </Button>
            </div>
          </Card>

          {/* Preview Table Header & Filters */}
          <Card>
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Import Preview:</span>
                  <span className="font-mono text-brand-400 font-normal">{fileName}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Review student rows and platform links before persisting records into Supabase.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search preview..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-2.5 py-1 rounded ${previewFilter === 'ALL' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    All ({validationResult.rows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('VALID')}
                    className={`px-2.5 py-1 rounded ${previewFilter === 'VALID' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    New ({validationResult.summary.validRows || 0})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('DUPLICATE')}
                    className={`px-2.5 py-1 rounded ${previewFilter === 'DUPLICATE' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Existing ({validationResult.summary.duplicateRows || 0})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('INVALID')}
                    className={`px-2.5 py-1 rounded ${previewFilter === 'INVALID' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Invalid ({validationResult.summary.invalidRows || 0})
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr>
                    <th className="table-th w-10">#</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Roll Number</th>
                    <th className="table-th">Branch</th>
                    <th className="table-th">Year</th>
                    <th className="table-th">LeetCode</th>
                    <th className="table-th">GFG</th>
                    <th className="table-th">HackerRank</th>
                    <th className="table-th">Codeforces</th>
                    <th className="table-th">CodeChef</th>
                    <th className="table-th">Status Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-xs text-slate-500">
                        No rows match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((row) => {
                      const rowNum = row.rowNumber || row.rowIndex;
                      const isDup = row.isDuplicate || row.status === 'DUPLICATE';
                      const isInvalid = (row.errors && row.errors.length > 0) || row.status === 'INVALID' || !row.isValid;

                      return (
                        <tr key={rowNum} className="hover:bg-slate-800/30 transition-colors text-xs">
                          <td className="table-td text-slate-500 font-mono">{rowNum}</td>
                          <td className="table-td whitespace-nowrap">
                            {isInvalid ? (
                              <Badge variant="danger">Invalid</Badge>
                            ) : isDup ? (
                              <Badge variant="warning">Existing Student</Badge>
                            ) : (
                              <Badge variant="success">New Student</Badge>
                            )}
                          </td>
                          <td className="table-td font-semibold text-slate-100 whitespace-nowrap">{row.name || '—'}</td>
                          <td className="table-td font-mono text-[11px] text-slate-300">{row.email || '—'}</td>
                          <td className="table-td font-mono text-[11px] text-slate-300">{row.rollNumber || '—'}</td>
                          <td className="table-td text-slate-300">{row.branch || row.department || '—'}</td>
                          <td className="table-td text-slate-400 font-mono">{row.year || '—'}</td>
                          
                          {/* LeetCode */}
                          <td className="table-td">
                            {row.leetcodeUrl || row.leetcodeHandle ? (
                              <span className="px-1.5 py-0.5 bg-amber-950/70 text-amber-300 rounded border border-amber-800/50 font-mono text-[10px]" title={row.leetcodeUrl}>
                                {row.leetcodeHandle || 'LC'}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* GFG */}
                          <td className="table-td">
                            {row.gfgUrl || row.gfgHandle ? (
                              <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-300 rounded border border-emerald-800/50 font-mono text-[10px]" title={row.gfgUrl}>
                                {row.gfgHandle || 'GFG'}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* HackerRank */}
                          <td className="table-td">
                            {row.hackerrankUrl || row.hackerrankHandle ? (
                              <span className="px-1.5 py-0.5 bg-emerald-900/80 text-emerald-200 rounded border border-emerald-700/60 font-mono text-[10px] font-semibold" title={row.hackerrankUrl}>
                                {row.hackerrankHandle || 'HR'}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* Codeforces */}
                          <td className="table-td">
                            {row.codeforcesUrl || row.codeforcesHandle ? (
                              <span className="px-1.5 py-0.5 bg-sky-950/70 text-sky-300 rounded border border-sky-800/50 font-mono text-[10px]" title={row.codeforcesUrl}>
                                {row.codeforcesHandle || 'CF'}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* CodeChef */}
                          <td className="table-td">
                            {row.codechefUrl || row.codechefHandle ? (
                              <span className="px-1.5 py-0.5 bg-orange-950/70 text-orange-300 rounded border border-orange-800/50 font-mono text-[10px]" title={row.codechefUrl}>
                                {row.codechefHandle || 'CC'}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* Status / Validation Notes */}
                          <td className="table-td">
                            {row.errors && row.errors.length > 0 ? (
                              <span className="text-rose-400 text-[11px] font-medium">{row.errors.join('; ')}</span>
                            ) : row.duplicateReason ? (
                              <span className="text-amber-400 text-[11px]">{row.duplicateReason}</span>
                            ) : (
                              <span className="text-emerald-400 text-[11px]">Ready to import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 3: FINAL IMPORT RESULTS */}
      {step === 'RESULT' && importResult && (
        <div className="space-y-5">
          <Card className="p-8">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
                <FileCheck className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-100">Import Completed</h3>
              <p className="text-xs text-slate-400">
                Student records and coding platform URLs have been persisted to Supabase and queued for live synchronization.
              </p>

              {/* Results Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Total Rows</div>
                  <div className="text-xl font-black text-slate-100 mt-0.5">{importResult.totalRows ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/50 bg-emerald-950/10">
                  <div className="text-[11px] text-emerald-400 font-medium">Imported (New)</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{importResult.createdCount ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-amber-900/50 bg-amber-950/10">
                  <div className="text-[11px] text-amber-400 font-medium">Updated</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">{importResult.updatedCount ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Skipped</div>
                  <div className="text-xl font-black text-slate-300 mt-0.5">{importResult.skippedCount ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/50 bg-rose-950/10">
                  <div className="text-[11px] text-rose-400 font-medium">Failed</div>
                  <div className="text-xl font-black text-rose-400 mt-0.5">{importResult.failedCount ?? 0}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={resetImport}>
                  Import Another File
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

          {/* Failed Rows Section if any */}
          {importResult.failedRows && importResult.failedRows.length > 0 && (
            <Card className="border-rose-900/40">
              <CardHeader
                title={`Failed Rows Breakdown (${importResult.failedRows.length})`}
                subtitle="The following rows could not be imported. Review the error reasons below."
                action={
                  <Button variant="outline" size="xs" onClick={handleDownloadFailedReport} icon={Download}>
                    Download Failed Report
                  </Button>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="table-th w-12">Row #</th>
                      <th className="table-th">Name</th>
                      <th className="table-th">Email</th>
                      <th className="table-th">Roll Number</th>
                      <th className="table-th">Error Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {importResult.failedRows.map((f, idx) => (
                      <tr key={idx} className="hover:bg-rose-950/10 transition-colors">
                        <td className="table-td font-mono text-rose-400">{f.rowNumber}</td>
                        <td className="table-td font-semibold text-slate-200">{f.name || '—'}</td>
                        <td className="table-td font-mono text-[11px] text-slate-300">{f.email || '—'}</td>
                        <td className="table-td font-mono text-[11px] text-slate-300">{f.rollNumber || '—'}</td>
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
    </>
  )}

      {/* IMPORT HISTORY SECTION */}
      <Card>
        <CardHeader
          title="Spreadsheet Import History"
          subtitle="Audit log of previous bulk spreadsheet uploads from Supabase"
          action={
            <Button variant="ghost" size="xs" onClick={fetchHistory} loading={loadingHistory} icon={RefreshCw}>
              Refresh History
            </Button>
          }
        />
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No previous spreadsheet imports recorded in database.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="table-th">Import Date</th>
                    <th className="table-th">File Name</th>
                    <th className="table-th">Total Rows</th>
                    <th className="table-th">Imported / Updated</th>
                    <th className="table-th">Skipped / Failed</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Imported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(h.createdAt || h.timestamp).toLocaleString()}
                      </td>
                      <td className="table-td font-semibold text-slate-200">{h.fileName}</td>
                      <td className="table-td font-bold text-slate-300">{h.totalRows}</td>
                      <td className="table-td">
                        <span className="text-emerald-400 font-semibold">{h.importedCount} imported</span>
                      </td>
                      <td className="table-td">
                        <span className="text-slate-400">{h.skippedCount || 0} skipped</span>
                        <span className="text-slate-500"> • </span>
                        <span className="text-rose-400">{h.failedCount || 0} failed</span>
                      </td>
                      <td className="table-td">
                        {h.status === 'SUCCESS' ? (
                          <Badge variant="success">Success</Badge>
                        ) : h.status === 'COMPLETED_WITH_ERRORS' ? (
                          <Badge variant="warning">Partial</Badge>
                        ) : (
                          <Badge variant="danger">Failed</Badge>
                        )}
                      </td>
                      <td className="table-td text-slate-400 text-[11px] font-mono">
                        {h.adminEmail || h.adminId || 'Admin'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportStudents;
