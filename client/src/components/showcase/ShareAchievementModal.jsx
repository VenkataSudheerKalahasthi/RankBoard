import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import AchievementCard from './AchievementCard';
import Button from '../common/Button';
import { showcaseService } from '../../services/showcaseService';
import { useStudent } from '../../context/StudentContext';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const ShareAchievementModal = ({ isOpen, onClose }) => {
  const { student, updateProfile } = useStudent();
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showcaseData, setShowcaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [downloading, setDownloading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadShowcase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await showcaseService.getMyShowcase();
      if (response.success && response.showcase) {
        setShowcaseData(response.showcase);
      }
    } catch (err) {
      console.error('Failed to load showcase data:', err);
      setError(err.response?.data?.message || 'Failed to generate achievement showcase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShowcase();
      setCopied(false);
      setSuccessMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const studentId = showcaseData?.studentId || student?.id || '';
  const shareUrl = `${window.location.origin}/showcase/${encodeURIComponent(studentId)}`;

  // 1. Download Achievement as PNG image
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // High-resolution capture (2.5x pixel ratio for crisp text & badges)
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.98,
        filter: (node) => !node.classList?.contains('exclude-from-download'),
      });

      const link = document.createElement('a');
      const safeName = (showcaseData?.name || 'student').toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.download = `rankboard_achievement_${safeName}.png`;
      link.href = dataUrl;
      link.click();
      setSuccessMessage('Achievement card image downloaded successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to generate image:', err);
      setError('Could not download achievement card. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Copy Public Share Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setSuccessMessage('Showcase link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setSuccessMessage('');
      }, 3500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // 3. Native Share action
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${showcaseData?.name}'s Coding Achievement`,
          text: `Check out my competitive programming performance on the College DSA Rankboard! Rank #${showcaseData?.rank} with ${showcaseData?.overallScore} score.`,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // 4. Handle Profile Image Upload to Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5 MB. Please select a smaller photo.');
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const response = await showcaseService.uploadProfilePhoto(file);
      if (response.success && response.profilePhoto) {
        setShowcaseData((prev) => ({
          ...prev,
          profilePhoto: response.profilePhoto,
        }));
        if (updateProfile) {
          updateProfile({ profilePhoto: response.profilePhoto });
        }
        setSuccessMessage('Profile photo updated on Cloudinary CDN!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Toggle Privacy (Public vs Private)
  const handleTogglePrivacy = async () => {
    const newIsPublic = !showcaseData?.isPublic;
    setSavingSettings(true);
    try {
      const response = await showcaseService.updateShowcaseSettings({
        isPublic: newIsPublic,
      });
      if (response.success) {
        setShowcaseData((prev) => ({
          ...prev,
          isPublic: newIsPublic,
        }));
        setSuccessMessage(
          newIsPublic
            ? 'Showcase is now PUBLIC and viewable via share link.'
            : 'Showcase is now PRIVATE. Public links will hide details.'
        );
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Privacy update failed:', err);
      setError('Failed to update privacy settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl text-slate-900 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Student Achievement Showcase
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official verified performance card generated from your Rankboard statistics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Messages */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2.5 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-6 py-2.5 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                Generating verified achievement showcase...
              </p>
            </div>
          ) : showcaseData ? (
            <div className="space-y-6">
              {/* Controls Toolbar: Image Upload & Privacy Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                {/* Profile Photo Upload */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      Profile Photo (Cloudinary)
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  <Button
                    variant="secondary"
                    size="sm"
                    loading={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    icon={Upload}
                    className="text-xs py-1 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Change Photo
                  </Button>
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    {showcaseData.isPublic ? (
                      <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block leading-tight">
                        {showcaseData.isPublic ? 'Public Showcase' : 'Private Showcase'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {showcaseData.isPublic ? 'Share link is active' : 'Hidden from public'}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    loading={savingSettings}
                    onClick={handleTogglePrivacy}
                    className={`text-xs py-1 px-2.5 border ${
                      showcaseData.isPublic
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    {showcaseData.isPublic ? 'Make Private' : 'Make Public'}
                  </Button>
                </div>
              </div>

              {/* Achievement Card Preview */}
              <div className="flex justify-center overflow-x-auto py-2">
                <AchievementCard ref={cardRef} showcase={showcaseData} />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Unable to generate showcase. Please try again.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {showcaseData && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-2 w-full sm:w-auto">
              <span className="font-mono text-[11px] truncate max-w-[240px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {shareUrl}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                icon={copied ? Check : Copy}
                className="text-xs bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                {copied ? 'Copied!' : 'Copy Share Link'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleNativeShare}
                icon={Share2}
                className="text-xs bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Share
              </Button>

              <Button
                variant="primary"
                size="sm"
                loading={downloading}
                onClick={handleDownloadImage}
                icon={Download}
                className="text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                Download Achievement
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareAchievementModal;
