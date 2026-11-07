import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import { Save, CheckCircle2, AlertCircle, Sparkles, AlertTriangle, ExternalLink, X, ArrowRight } from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

const ProfileLinkForm = ({ onSaved }) => {
  const { student, syncPlatforms, syncing } = useStudent();

  const [formData, setFormData] = useState({
    leetcodeUrl: '',
    gfgUrl: '',
    codeforcesUrl: '',
    codechefUrl: '',
    hackerrankUrl: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateConflicts, setDuplicateConflicts] = useState([]);

  useEffect(() => {
    if (student?.platforms) {
      setFormData({
        leetcodeUrl: student.platforms.leetcode?.profileUrl || student.platforms.leetcode?.username || '',
        gfgUrl: student.platforms.gfg?.profileUrl || student.platforms.gfg?.username || '',
        codeforcesUrl: student.platforms.codeforces?.profileUrl || student.platforms.codeforces?.username || '',
        codechefUrl: student.platforms.codechef?.profileUrl || student.platforms.codechef?.username || '',
        hackerrankUrl: student.platforms.hackerrank?.profileUrl || student.platforms.hackerrank?.username || '',
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleClearField = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: '' }));
    setDuplicateConflicts((prev) => prev.filter((c) => {
      if (fieldName === 'leetcodeUrl' && c.platform === 'leetcode') return false;
      if (fieldName === 'gfgUrl' && c.platform === 'gfg') return false;
      if (fieldName === 'hackerrankUrl' && c.platform === 'hackerrank') return false;
      if (fieldName === 'codeforcesUrl' && c.platform === 'codeforces') return false;
      if (fieldName === 'codechefUrl' && c.platform === 'codechef') return false;
      return true;
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDuplicateConflicts([]);

    try {
      const response = await syncPlatforms(formData);
      if (response.success) {
        setSuccessMessage('Coding platform profiles saved and statistics updated successfully!');
        setDuplicateConflicts([]);
        if (onSaved) onSaved(response.student);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'DUPLICATE_PLATFORM_IDENTITY' && Array.isArray(data.conflicts)) {
        setDuplicateConflicts(data.conflicts);
        setErrorMessage(data.message || 'One or more submitted coding profiles are already registered with another account.');
        return;
      }

      const errorDetails = data?.errors;
      if (Array.isArray(errorDetails)) {
        setErrorMessage(errorDetails.map((e) => e.message || e).join(' '));
      } else {
        setErrorMessage(data?.message || err.message || 'Failed to save coding platform profiles.');
      }
    }
  };

  return (
    <Card
      title="Connect Coding Platforms"
      subtitle="Enter your public profile URLs or handles. Statistics will be verified and fetched from each platform."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FEATURE 5 & 7: Duplicate Platform Conflict Warning Notification Banner */}
        {duplicateConflicts.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-xl space-y-3 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  ⚠️ Platform Identity Conflict Detected
                </h4>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  One or more coding profiles submitted are already registered with another student account. Coding profiles cannot be linked to multiple accounts.
                </p>
              </div>
            </div>

            {/* List of specific conflicting platforms */}
            <div className="space-y-2 pt-1 border-t border-amber-200/80 dark:border-amber-800/40">
              {duplicateConflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="font-bold text-amber-700 dark:text-amber-400">{c.platformLabel}:</span>
                      <span>Username <strong>"{c.username}"</strong> is already registered</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Existing registered email: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{c.existingOwnerMaskedEmail}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      To continue using this coding profile, please log in with the account associated with the existing registration.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        const fieldMap = {
                          leetcode: 'leetcodeUrl',
                          gfg: 'gfgUrl',
                          hackerrank: 'hackerrankUrl',
                          codeforces: 'codeforcesUrl',
                          codechef: 'codechefUrl',
                        };
                        handleClearField(fieldMap[c.platform] || `${c.platform}Url`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700/50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Change Link</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-amber-800 dark:text-amber-300/80 pt-1">
              💡 <em>Tip: You can clear or update the conflicting profile links above and submit your valid links without losing progress.</em>
            </div>
          </div>
        )}

        {errorMessage && duplicateConflicts.length === 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scoring Platforms Group */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">Official Scoring Platforms</span>
          </div>

          {/* LeetCode */}
          <div className="bg-slate-50 dark:bg-[#0D1830] p-4 rounded-xl border border-[#D9E4F2] dark:border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200/90 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                  <img src="/logos/leetcode.jpg" alt="LeetCode" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-[#0F172A] dark:text-white">LeetCode Profile</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">leetcode.com/u/[username]</span>
            </div>
            <Input
              name="leetcodeUrl"
              placeholder="e.g. https://leetcode.com/u/john_doe/ or john_doe"
              value={formData.leetcodeUrl}
              onChange={handleChange}
              helperText="Supports full URL or plain username"
            />
          </div>

          {/* GeeksforGeeks */}
          <div className="bg-slate-50 dark:bg-[#0D1830] p-4 rounded-xl border border-[#D9E4F2] dark:border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200/90 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                  <img src="/logos/gfg.jpg" alt="GeeksforGeeks" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-[#0F172A] dark:text-white">GeeksforGeeks Profile</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">geeksforgeeks.org/user/[username]/</span>
            </div>
            <Input
              name="gfgUrl"
              placeholder="e.g. https://www.geeksforgeeks.org/user/john_doe/ or john_doe"
              value={formData.gfgUrl}
              onChange={handleChange}
              helperText="Supports profile link or GFG handle"
            />
          </div>

          {/* HackerRank */}
          <div className="bg-slate-50 dark:bg-[#0D1830] p-4 rounded-xl border border-[#D9E4F2] dark:border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200/90 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                  <img src="/logos/hackerrank.jpg" alt="HackerRank" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-[#0F172A] dark:text-white">HackerRank Profile</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">hackerrank.com/profile/[username]</span>
            </div>
            <Input
              name="hackerrankUrl"
              placeholder="e.g. https://www.hackerrank.com/profile/john_doe or john_doe"
              value={formData.hackerrankUrl}
              onChange={handleChange}
              helperText="Supports user profile URL or username"
            />
          </div>
        </div>

        {/* Statistics-Only Platforms Group */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-300">Other Platforms</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Activity tracked for analytics</span>
          </div>

          {/* Codeforces */}
          <div className="bg-slate-50 dark:bg-[#0D1830] p-4 rounded-xl border border-[#D9E4F2] dark:border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200/90 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                  <img src="/logos/codeforces.jpg" alt="Codeforces" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-[#0F172A] dark:text-white">Codeforces Profile</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">codeforces.com/profile/[handle]</span>
            </div>
            <Input
              name="codeforcesUrl"
              placeholder="e.g. https://codeforces.com/profile/tourist or tourist"
              value={formData.codeforcesUrl}
              onChange={handleChange}
              helperText="Supports profile URL or Codeforces handle"
            />
          </div>

          {/* CodeChef */}
          <div className="bg-slate-50 dark:bg-[#0D1830] p-4 rounded-xl border border-[#D9E4F2] dark:border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200/90 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                  <img src="/logos/codechef.jpg" alt="CodeChef" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-[#0F172A] dark:text-white">CodeChef Profile</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">codechef.com/users/[handle]</span>
            </div>
            <Input
              name="codechefUrl"
              placeholder="e.g. https://www.codechef.com/users/john_doe or john_doe"
              value={formData.codechefUrl}
              onChange={handleChange}
              helperText="Supports user profile URL or handle"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#D9E4F2] dark:border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            Backend automatically parses handles, fetches problem statistics, and recalculates college rank.
          </span>

          <Button type="submit" loading={syncing} icon={Save} size="md">
            Save & Fetch Statistics
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileLinkForm;
