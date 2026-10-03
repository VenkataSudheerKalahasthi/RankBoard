import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import { Save, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

const ProfileLinkForm = ({ onSaved }) => {
  const { student, syncPlatforms, syncing } = useStudent();

  const [formData, setFormData] = useState({
    leetcodeUrl: '',
    gfgUrl: '',
    codeforcesUrl: '',
    codechefUrl: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (student?.platforms) {
      setFormData({
        leetcodeUrl: student.platforms.leetcode?.profileUrl || student.platforms.leetcode?.username || '',
        gfgUrl: student.platforms.gfg?.profileUrl || student.platforms.gfg?.username || '',
        codeforcesUrl: student.platforms.codeforces?.profileUrl || student.platforms.codeforces?.username || '',
        codechefUrl: student.platforms.codechef?.profileUrl || student.platforms.codechef?.username || '',
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await syncPlatforms(formData);
      if (response.success) {
        setSuccessMessage('Coding platform profiles saved and statistics updated successfully!');
        if (onSaved) onSaved(response.student);
      }
    } catch (err) {
      const errorDetails = err.response?.data?.errors;
      if (Array.isArray(errorDetails)) {
        setErrorMessage(errorDetails.map((e) => e.message || e).join(' '));
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to save coding platform profiles.');
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* LeetCode */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-bold text-xs text-slate-900">LeetCode Profile</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">leetcode.com/u/[username]</span>
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
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="font-bold text-xs text-slate-900">GeeksforGeeks Profile</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">geeksforgeeks.org/user/[username]/</span>
          </div>
          <Input
            name="gfgUrl"
            placeholder="e.g. https://www.geeksforgeeks.org/user/john_doe/ or john_doe"
            value={formData.gfgUrl}
            onChange={handleChange}
            helperText="Supports profile link or GFG handle"
          />
        </div>

        {/* Codeforces */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="font-bold text-xs text-slate-900">Codeforces Profile</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">codeforces.com/profile/[handle]</span>
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
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-700"></span>
              <span className="font-bold text-xs text-slate-900">CodeChef Profile</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">codechef.com/users/[handle]</span>
          </div>
          <Input
            name="codechefUrl"
            placeholder="e.g. https://www.codechef.com/users/john_doe or john_doe"
            value={formData.codechefUrl}
            onChange={handleChange}
            helperText="Supports user profile URL or handle"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
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
