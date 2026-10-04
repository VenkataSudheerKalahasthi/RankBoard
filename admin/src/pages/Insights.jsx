import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Users,
  Compass,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

export const Insights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAiInsights();
      if (response.success) {
        setInsights(response.insights);
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setError(err.message || 'Failed to synthesize cohort insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !insights) {
    return <LoadingState message="Synthesizing college DSA analytics..." />;
  }

  if (error && !insights) {
    return <ErrorState message={error} onRetry={fetchInsights} />;
  }

  const { overview, scoreDistribution, departmentPerformance, platformEngagement, actionableRecommendations } = insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <span>AI Analytical Insights & Cohort Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated intelligence overview for department coordinators and competitive programming mentors.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchInsights} icon={RefreshCw}>
          Regenerate Insights
        </Button>
      </div>

      {/* Cohort Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Total Evaluated Cohort</div>
          <div className="text-2xl font-black text-slate-100 mt-1">{overview.activeStudentCount} active</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Of {overview.totalCohortSize} registered</div>
        </Card>

        <Card className="p-4 border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Problems Solved Combined</div>
          <div className="text-2xl font-black text-brand-300 mt-1">{overview.totalProblemsSolvedCombined}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across 4 connected platforms</div>
        </Card>

        <Card className="p-4 border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Leading Department</div>
          <div className="text-sm font-bold text-slate-200 mt-1 truncate">{overview.leadingDepartment}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Highest cohort average score</div>
        </Card>

        <Card className="p-4 border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Primary Platform</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{overview.leadingPlatform}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{platformEngagement.leetcodeShare}% of solved problems</div>
        </Card>
      </div>

      {/* Score Tier Distribution & Platform Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Tiers */}
        <Card>
          <CardHeader
            title="Performance Tier Distribution"
            subtitle="Student count categorized by composite score bands"
          />
          <CardContent className="p-5 space-y-4">
            {Object.entries(scoreDistribution || {}).map(([band, count]) => {
              const percent = overview.activeStudentCount > 0 ? Math.round((count / overview.activeStudentCount) * 100) : 0;
              return (
                <div key={band} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">{band}</span>
                    <span className="font-mono text-slate-400">{count} students ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-indigo-400 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Platform Share */}
        <Card>
          <CardHeader
            title="Platform Problem-Solving Engagement"
            subtitle="Volume percentage of problems solved on each platform"
          />
          <CardContent className="p-5 space-y-4">
            {/* LeetCode */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-amber-400">LeetCode</span>
                <span className="font-mono text-slate-300">{platformEngagement.rawSolves?.leetcode} solved ({platformEngagement.leetcodeShare}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${platformEngagement.leetcodeShare}%` }} />
              </div>
            </div>

            {/* GFG */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-400">GeeksforGeeks</span>
                <span className="font-mono text-slate-300">{platformEngagement.rawSolves?.gfg} solved ({platformEngagement.gfgShare}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${platformEngagement.gfgShare}%` }} />
              </div>
            </div>

            {/* Codeforces */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-sky-400">Codeforces</span>
                <span className="font-mono text-slate-300">{platformEngagement.rawSolves?.codeforces} solved ({platformEngagement.codeforcesShare}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${platformEngagement.codeforcesShare}%` }} />
              </div>
            </div>

            {/* CodeChef */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-rose-400">CodeChef</span>
                <span className="font-mono text-slate-300">{platformEngagement.rawSolves?.codechef} solved ({platformEngagement.codechefShare}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${platformEngagement.codechefShare}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Recommendations */}
      <Card>
        <CardHeader
          title="Administrative & Pedagogical Recommendations"
          subtitle="Data-driven suggestions to improve college rank & student participation"
        />
        <div className="p-5 space-y-3">
          {actionableRecommendations.map((rec, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-100">{rec.title}</h4>
                  <Badge variant={rec.priority === 'HIGH' ? 'danger' : rec.priority === 'MEDIUM' ? 'warning' : 'default'}>
                    {rec.priority} Priority
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Insights;
