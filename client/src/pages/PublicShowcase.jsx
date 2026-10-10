import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { showcaseService } from '../services/showcaseService';
import AchievementCard from '../components/showcase/AchievementCard';
import AchievementExportCard from '../components/showcase/AchievementExportCard';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import {
  exportAchievementCard,
  buildAchievementFilename,
} from '../utils/exportAchievementCard';
import {
  Trophy,
  Share2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowRight,
  Code2,
  Sparkles,
  Monitor,
  Smartphone,
} from 'lucide-react';

const PublicShowcase = () => {
  const { studentId } = useParams();
  const cardRef = useRef(null);
  const exportCardRef = useRef(null);

  const [showcase, setShowcase] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedLayout, setSelectedLayout] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop'
  );

  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchShowcase = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await showcaseService.getPublicShowcase(studentId);
      if (response.success) {
        if (response.isPublic === false) {
          setIsPrivate(true);
          setStudentName(response.name || 'Student');
        } else {
          setShowcase(response.showcase);
          setIsPrivate(false);
        }
      } else {
        setError(response.message || 'Achievement showcase not found.');
      }
    } catch (err) {
      console.error('Failed to load showcase:', err);
      setError(err.response?.data?.message || 'Achievement showcase not found or has been removed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcase();
  }, [studentId]);

  const shareUrl = window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToastMsg('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setToastMsg('');
      }, 3500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${showcase?.name}'s Coding Achievement`,
          text: `Check out ${showcase?.name}'s competitive programming performance on the College DSA Rankboard! Rank #${showcase?.rank} with ${showcase?.overallScore} score.`,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadImage = async () => {
    if (downloading) return;
    const targetElement = exportCardRef.current || cardRef.current;
    if (!targetElement) return;

    setDownloading(true);
    try {
      const filename = buildAchievementFilename(
        showcase?.name,
        showcase?.rank,
        selectedLayout
      );

      const targetWidth = selectedLayout === 'mobile' ? 472 : 872;

      await exportAchievementCard(targetElement, {
        filename,
        width: targetWidth,
        pixelRatio: 2.5,
      });

      setToastMsg(`Achievement card downloaded (${selectedLayout === 'mobile' ? 'Portrait' : 'Landscape'})!`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      console.error('Download failed:', err);
      setToastMsg('Could not download image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <LoadingState message="Retrieving verified achievement showcase..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <ErrorState
          title="Achievement Showcase Unavailable"
          message={error}
          onRetry={fetchShowcase}
        />
      </div>
    );
  }

  // Private Showcase State
  if (isPrivate) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-slate-200">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Showcase is Private
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {studentName} has marked their competitive programming achievement showcase as private.
          </p>
          <div className="pt-3">
            <Link to="/leaderboard">
              <Button variant="primary" size="md" icon={Trophy} className="w-full">
                View Public Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profiles = showcase?.platformProfiles || {};

  const activeProfiles = [
    { key: 'leetcode', name: 'LeetCode', url: profiles.leetcode, dot: 'bg-amber-500' },
    { key: 'gfg', name: 'GeeksforGeeks', url: profiles.gfg, dot: 'bg-emerald-600' },
    { key: 'hackerrank', name: 'HackerRank', url: profiles.hackerrank, dot: 'bg-emerald-400' },
    { key: 'codeforces', name: 'Codeforces', url: profiles.codeforces, dot: 'bg-blue-600' },
    { key: 'codechef', name: 'CodeChef', url: profiles.codechef, dot: 'bg-orange-600' },
  ].filter((p) => p.url && p.url.trim() !== '');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 hover:text-brand-600 transition">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-indigo-600 block leading-tight">
                COLLEGE DSA
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                Rankboard
              </span>
            </div>
          </Link>

          <Link to="/leaderboard">
            <Button
              variant="secondary"
              size="sm"
              icon={Trophy}
              className="text-xs bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            >
              Full Leaderboard
            </Button>
          </Link>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMsg}
          </div>
        )}

        {/* Layout Format Selector Tabs */}
        <div className="flex items-center justify-center gap-2">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedLayout('desktop')}
              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl text-xs font-bold transition ${
                selectedLayout === 'desktop'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Landscape View (840px)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLayout('mobile')}
              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl text-xs font-bold transition ${
                selectedLayout === 'mobile'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Portrait View (440px)</span>
            </button>
          </div>
        </div>

        {/* Achievement Card Component Preview */}
        <div className="flex justify-center overflow-x-auto py-2">
          <AchievementCard
            ref={cardRef}
            showcase={showcase}
            layout={selectedLayout}
            forExport={false}
          />
        </div>

        {/* Dedicated Off-Screen Export Container - Unclipped and explicit export dimensions */}
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: selectedLayout === 'mobile' ? '472px' : '872px',
            zIndex: -9999,
            pointerEvents: 'none',
            visibility: 'visible',
            overflow: 'visible',
          }}
          aria-hidden="true"
        >
          <AchievementExportCard
            ref={exportCardRef}
            showcase={showcase}
            layout={selectedLayout}
          />
        </div>

        {/* Action Toolbar */}
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <Button
            variant="primary"
            size="md"
            loading={downloading}
            onClick={handleDownloadImage}
            icon={Download}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            {downloading ? 'Exporting...' : `Download ${selectedLayout === 'mobile' ? 'Portrait' : 'Landscape'} Card`}
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleCopyLink}
            icon={copied ? Check : Copy}
            className="text-xs bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            {copied ? 'Copied!' : 'Copy Share Link'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleNativeShare}
            icon={Share2}
            className="text-xs bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Share
          </Button>
        </div>

        {/* Public Platform Profiles Links */}
        {activeProfiles.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
              Student Public Coding Profiles
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {activeProfiles.map((p) => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500/50 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
                >
                  <span className={`w-2 h-2 rounded-full ${p.dot}`}></span>
                  {p.name}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicShowcase;
