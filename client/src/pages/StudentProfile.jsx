import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Prime',
];

const StudentProfile = () => {
  const { student, updateProfile } = useStudent();
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <ShareAchievementModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Academic Profile Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your student identity, Cloudinary profile photo, and institutional registration.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowcaseOpen(true)}
          icon={Share2}
          className="bg-brand-600 hover:bg-brand-700 shadow-sm text-xs"
        >
          Share Achievement
        </Button>
      </div>

      {/* Profile Photo Section (Cloudinary) */}
      <Card
        title="Profile Photo (Cloudinary CDN)"
        subtitle="Upload a photo to appear on your official DSA Rankboard achievement card."
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            {student?.profilePhoto ? (
              <img
                src={student.profilePhoto}
                alt={student.name || 'Student'}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md bg-slate-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-slate-800 border-2 border-slate-200 flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {(student?.name || 'ST').slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200"
            >
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">Change</span>
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Photo Identification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Supported formats: JPEG, PNG, WEBP (Max 5 MB). Secured and optimized by Cloudinary.
              </p>
            </div>

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
              className="text-xs"
            >
              {student?.profilePhoto ? 'Upload New Photo' : 'Upload Profile Photo'}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title="College Student Identity"
        subtitle="Your name and roll number appear on the official college rankboard."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="block w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="block w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/student/platforms"
              className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
            >
              Configure Coding Profiles &rarr;
            </Link>

            <Button type="submit" loading={loading} icon={Save} size="md">
              Save Academic Details
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StudentProfile;
