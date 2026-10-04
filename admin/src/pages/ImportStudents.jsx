import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
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
} from 'lucide-react';

export const ImportStudents = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();
  const fileInputRef = useRef(null);

  // Flow Step: 'UPLOAD' -> 'PREVIEW' -> 'RESULT'
  const [step, setStep] = useState('UPLOAD');
  const [fileName, setFileName] = useState('');
  const [rawRecords, setRawRecords] = useState([]);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          notifyError('The selected spreadsheet contains no student data rows.');
          return;
        }

        setRawRecords(data);
        validateRecords(data, file.name);
      } catch (err) {
        notifyError('Failed to parse spreadsheet file: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validateRecords = async (records, fName) => {
    setValidating(true);
    try {
      const response = await adminService.validateImportData(records);
      if (response.success) {
        setValidationResult(response);
        setStep('PREVIEW');
        notifySuccess(`File analyzed: ${response.summary.totalRows} rows evaluated.`);
      }
    } catch (err) {
      notifyError(err.message || 'Validation failed on the backend server.');
    } finally {
      setValidating(false);
    }
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
        notifySuccess(response.message || 'Bulk student import completed.');
        fetchHistory();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to execute student import.');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'name',
      'email',
      'rollNumber',
      'department',
      'year',
      'leetcodeUrl',
      'gfgUrl',
      'codeforcesUrl',
      'codechefUrl',
    ];

    const sampleData = [
      {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@college.edu',
        rollNumber: '21CS001',
        department: 'Computer Science and Engineering',
        year: 3,
        leetcodeUrl: 'https://leetcode.com/u/aarav_coder/',
        gfgUrl: 'https://www.geeksforgeeks.org/user/aaravsharma21/',
        codeforcesUrl: 'https://codeforces.com/profile/aarav_cf',
        codechefUrl: 'https://www.codechef.com/users/aarav_cc',
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@college.edu',
        rollNumber: '21IT045',
        department: 'Information Technology',
        year: 3,
        leetcodeUrl: 'https://leetcode.com/u/priya_p/',
        gfgUrl: 'https://www.geeksforgeeks.org/user/priyapatel/',
        codeforcesUrl: 'https://codeforces.com/profile/priya_patel',
        codechefUrl: 'https://www.codechef.com/users/priyacc',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'dsa_students_import_template.xlsx');
  };

  const resetImport = () => {
    setStep('UPLOAD');
    setFileName('');
    setRawRecords([]);
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>Bulk Student Import</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800">
              Excel / CSV
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest hundreds of student profiles with automated duplicate resolution & platform validation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            icon={Download}
          >
            Download Template
          </Button>
        </div>
      </div>

      {/* STEP 1: FILE UPLOAD ZONE */}
      {step === 'UPLOAD' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Upload Student Spreadsheet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select an <span className="text-slate-200 font-mono">.xlsx</span>, <span className="text-slate-200 font-mono">.xls</span>, or <span className="text-slate-200 font-mono">.csv</span> file with student credentials and coding profile links.
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
                Browse & Validate File
              </Button>
            </div>

            <div className="text-[11px] text-slate-500 pt-4 border-t border-slate-800/80">
              Expected columns: <code className="text-slate-400">name, email, rollNumber, department, year, leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl</code>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: PREVIEW & DUPLICATE VALIDATION SUMMARY */}
      {step === 'PREVIEW' && validationResult && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-800">
              <div className="text-xs font-semibold text-slate-400">Total Rows Detected</div>
              <div className="text-2xl font-black text-slate-100 mt-1">
                {validationResult.summary.totalRows}
              </div>
            </Card>

            <Card className="p-4 border-emerald-900/50 bg-emerald-950/20">
              <div className="text-xs font-semibold text-emerald-400">Valid Records</div>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {validationResult.summary.validCount}
              </div>
            </Card>

            <Card className="p-4 border-amber-900/50 bg-amber-950/20">
              <div className="text-xs font-semibold text-amber-400">Existing Duplicates</div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {validationResult.summary.duplicateCount}
              </div>
            </Card>

            <Card className="p-4 border-rose-900/50 bg-rose-950/20">
              <div className="text-xs font-semibold text-rose-400">Invalid Rows</div>
              <div className="text-2xl font-black text-rose-300 mt-1">
                {validationResult.summary.invalidCount}
              </div>
            </Card>
          </div>

          {/* Import Settings & Actions Bar */}
          <Card className="p-4 bg-slate-900/90 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDuplicates}
                  onChange={(e) => setUpdateDuplicates(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500"
                />
                <span>Update existing duplicate student records</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500"
                />
                <span>Auto-trigger background platform statistics sync</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
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
                Confirm & Import {validationResult.summary.validCount + (updateDuplicates ? validationResult.summary.duplicateCount : 0)} Students
              </Button>
            </div>
          </Card>

          {/* Preview Table */}
          <Card>
            <CardHeader
              title={`Import Preview: ${fileName}`}
              subtitle="Inspect validated records before committing changes into Firestore"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="table-th w-12">#</th>
                    <th className="table-th">Validation Status</th>
                    <th className="table-th">Student Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Roll Number</th>
                    <th className="table-th">Department</th>
                    <th className="table-th">Platforms Parsed</th>
                    <th className="table-th">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {validationResult.rows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-800/30 transition-colors text-xs">
                      <td className="table-td text-slate-500 font-mono">{row.rowNumber}</td>
                      <td className="table-td">
                        {row.status === 'VALID' ? (
                          <Badge variant="success">Valid</Badge>
                        ) : row.status === 'DUPLICATE' ? (
                          <Badge variant="warning">Duplicate</Badge>
                        ) : (
                          <Badge variant="danger">Invalid</Badge>
                        )}
                      </td>
                      <td className="table-td font-semibold text-slate-100">{row.name}</td>
                      <td className="table-td font-mono text-[11px] text-slate-300">{row.email}</td>
                      <td className="table-td font-mono text-[11px] text-slate-300">{row.rollNumber}</td>
                      <td className="table-td text-slate-400 truncate max-w-[140px]">{row.department}</td>
                      <td className="table-td">
                        <div className="flex gap-1 text-[10px] font-mono">
                          {row.leetcodeHandle && <span className="px-1 bg-amber-950/60 text-amber-300 rounded">LC</span>}
                          {row.gfgHandle && <span className="px-1 bg-emerald-950/60 text-emerald-300 rounded">GFG</span>}
                          {row.codeforcesHandle && <span className="px-1 bg-sky-950/60 text-sky-300 rounded">CF</span>}
                          {row.codechefHandle && <span className="px-1 bg-rose-950/60 text-rose-300 rounded">CC</span>}
                        </div>
                      </td>
                      <td className="table-td">
                        {row.errors.length > 0 ? (
                          <span className="text-rose-400 text-[11px]">{row.errors.join(', ')}</span>
                        ) : row.duplicateReason ? (
                          <span className="text-amber-400 text-[11px]">{row.duplicateReason}</span>
                        ) : (
                          <span className="text-emerald-400 text-[11px]">Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 3: FINAL IMPORT RESULTS */}
      {step === 'RESULT' && importResult && (
        <Card className="p-8">
          <div className="max-w-lg mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <FileCheck className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-100">Import Completed Successfully</h3>
            <p className="text-xs text-slate-400">
              Student records have been saved to Firestore and college rankings have been recalculated.
            </p>

            {/* Results Grid */}
            <div className="grid grid-cols-4 gap-3 text-center pt-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Imported</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{importResult.importedCount}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Updated</div>
                <div className="text-xl font-bold text-amber-400 mt-0.5">{importResult.updatedCount}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Skipped</div>
                <div className="text-xl font-bold text-slate-400 mt-0.5">{importResult.skippedCount}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Failed</div>
                <div className="text-xl font-bold text-rose-400 mt-0.5">{importResult.failedCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" onClick={resetImport}>
                Import Another File
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/students')}>
                View Students List →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* IMPORT HISTORY SECTION */}
      <Card>
        <CardHeader
          title="Spreadsheet Import History"
          subtitle="Audit log of previous bulk spreadsheet uploads"
          action={
            <Button variant="ghost" size="xs" onClick={fetchHistory} icon={RefreshCw}>
              Refresh History
            </Button>
          }
        />
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No previous spreadsheet imports found.</p>
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
                    <th className="table-th">Imported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td className="table-td font-semibold text-slate-200">{h.fileName}</td>
                      <td className="table-td font-bold text-slate-300">{h.totalRows}</td>
                      <td className="table-td">
                        <span className="text-emerald-400 font-semibold">{h.importedCount} new</span>
                        <span className="text-slate-500"> • </span>
                        <span className="text-amber-400">{h.updatedCount} updated</span>
                      </td>
                      <td className="table-td">
                        <span className="text-slate-400">{h.skippedCount} skipped</span>
                        <span className="text-slate-500"> • </span>
                        <span className="text-rose-400">{h.failedCount} failed</span>
                      </td>
                      <td className="table-td text-slate-400 text-[11px] font-mono">
                        {h.importedBy}
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
