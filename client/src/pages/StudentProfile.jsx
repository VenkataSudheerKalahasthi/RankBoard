import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ScrollReveal from '../components/common/ScrollReveal';
import ShareAchievementModal from '../components/showcase/ShareAchievementModal';
import { useStudent } from '../context/StudentContext';
import { showcaseService } from '../services/showcaseService';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  Share2,
  Camera,
  Layers,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENTS = [
   'ALL',
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Prime',
  'CIVIL',
  'CSIT',
  'AI',
  'AIML',
  'CSDS',
  'CSBS',
  'CSIOT',
  'VLSI',
];

const StudentProfile = ({ previewStudent }) => {
  const { student: ctxStudent, updateProfile } = useStudent();
  const student = previewStudent || ctxStudent;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    department: 'Computer Science and Engineering',
    year: '3',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        rollNumber: student.rollNumber || '',
        department: student.department || 'Computer Science and Engineering',
        year: String(student.year || '3'),
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setUploadingPhoto(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await showcaseService.uploadProfilePhoto(file);
      if (response.success && response.profilePhoto) {
        if (updateProfile) {
          updateProfile({ profilePhoto: response.profilePhoto });
        }
        setSuccessMsg('Profile photo updated successfully on Cloudinary CDN!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await updateProfile({
        name: formData.name,
        rollNumber: formData.rollNumber,
        department: formData.department,
        year: parseInt(formData.year, 10),
      });

      if (response.success) {
        setSuccessMsg('Academic profile details updated successfully.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update academic profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 m-0 space-y-6 sm:space-y-8 animate-fade-in student-profile-page">
      <ShareAchievementModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      {/* Page Header */}
      <ScrollReveal delay={0}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D9E4F2] dark:border-blue-900/40 pb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 mb-1">
              <User className="w-3.5 h-3.5" />
              Academic Profile
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Academic Profile Settings
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 mt-0.5 font-medium">
              Manage your student identity, Cloudinary profile photo, and institutional registration.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowcaseOpen(true)}
            icon={Share2}
            className="bg-brand-600 hover:bg-brand-700 shadow-sm text-xs shrink-0 w-full sm:w-auto font-semibold"
          >
            Share Achievement
          </Button>
        </div>
      </ScrollReveal>

      {/* Profile Photo Section (Cloudinary) */}
      <ScrollReveal delay={60}>
        <Card
          title="Profile Photo (Cloudinary CDN)"
          subtitle="Upload a photo to appear on your official DSA Rankboard achievement card."
          hoverable
          className="w-full min-w-0 student-profile-section"
        >
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 sm:gap-6 text-center sm:text-left">
            <div className="relative group shrink-0">
              {student?.profilePhoto ? (
                <img
                  src={student.profilePhoto}
                  alt={student.name || 'Student'}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-800"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-brand-500 to-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-md">
                  {(student?.name || 'ST').slice(0, 2).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                aria-label="Change photo"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold">Change</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold theme-text-primary">
                  Official Photo Identification
                </h3>
                {student?.profilePhoto ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3 h-3" /> CDN Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                    No Custom Photo
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm theme-text-secondary max-w-2xl">
                Upload a photo to appear on your official DSA Rankboard achievement showcase card.
              </p>
              <p className="text-[11px] theme-text-muted">
                Supported formats: JPEG, PNG, WEBP (Max 5 MB). Secured and optimized by Cloudinary.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <Button
              variant="secondary"
              size="sm"
              loading={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              icon={Upload}
              className="text-xs w-full sm:w-auto font-semibold"
            >
              {student?.profilePhoto ? 'Upload New Photo' : 'Upload Profile Photo'}
            </Button>
          </div>
        </div>
      </Card>
    </ScrollReveal>

      {/* College Student Identity Section */}
      <ScrollReveal delay={120}>
        <Card
          title="College Student Identity"
          subtitle="Your name and roll number appear on the official college rankboard."
          hoverable
          className="w-full min-w-0 student-profile-section"
        >
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label="College Roll Number"
              name="rollNumber"
              placeholder="e.g. 21CS042"
              value={formData.rollNumber}
              onChange={handleChange}
              required
              helperText="Must match your university student ID"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-slate-200 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-subtle">
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-[#D9E4F2] dark:border-blue-500/30 bg-white dark:bg-[#0D1830] text-[#0F172A] dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium transition-colors cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-slate-200 mb-1.5">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-subtle">
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-[#D9E4F2] dark:border-blue-500/30 bg-white dark:bg-[#0D1830] text-[#0F172A] dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium transition-colors cursor-pointer"
                >
                  <option value="1">Year 1 (Freshman)</option>
                  <option value="2">Year 2 (Sophomore)</option>
                  <option value="3">Year 3 (Junior)</option>
                  <option value="4">Year 4 (Senior)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/student/platforms"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1.5"
            >
              Configure Coding Profiles &rarr;
            </Link>

            <Button type="submit" loading={loading} icon={Save} size="md" className="w-full sm:w-auto">
              Save Academic Details
            </Button>
          </div>
        </form>
      </Card>
      </ScrollReveal>
    </div>
  );
};

export default StudentProfile;
