import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useStudent } from '../context/StudentContext';
import { Save, CheckCircle2, AlertCircle, User, Award, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
];

const StudentProfile = () => {
  const { student, updateProfile } = useStudent();

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    department: 'Computer Science and Engineering',
    year: '3',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Academic Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your student identity and institutional department registration.
        </p>
      </div>

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
