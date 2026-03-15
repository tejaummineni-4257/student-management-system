import React, { useState } from 'react';
import { aiAPI } from '../utils/api';
import toast from 'react-hot-toast';

const ADMIN_AI_FEATURES = [
  {
    id: 'accreditation-report',
    icon: '📋',
    title: 'NAAC/NBA Accreditation Report',
    description: 'Generate formal accreditation-ready reports for student achievements. Perfect for NAAC/NBA documentation and criteria 5.3 compliance.',
    color: 'var(--purple)',
    btnLabel: 'Generate Report'
  },
  {
    id: 'institution-analysis',
    icon: '🏛️',
    title: 'Institution Analysis',
    description: 'Get AI-powered insights on overall student performance, achievement trends, and institutional strengths.',
    color: 'var(--accent)',
    btnLabel: 'Analyze Institution'
  },
  {
    id: 'achievement-insights',
    icon: '📊',
    title: 'Achievement Insights',
    description: 'Generate comprehensive analysis of achievement patterns across different categories, levels, and branches.',
    color: 'var(--green)',
    btnLabel: 'Get Insights'
  },
];

export default function AdminAIAssistant() {
  const [loading, setLoading] = useState(null);
  const [results, setResults] = useState({});
  const [reportForm, setReportForm] = useState({ academicYear: '2024-25', branch: '' });
  const [showReportForm, setShowReportForm] = useState(false);

  const handleFeature = async (id) => {
    if (id === 'accreditation-report') {
      setShowReportForm(true);
      return;
    }

    setLoading(id);
    try {
      let result;
      if (id === 'institution-analysis') {
        // Use accreditation report endpoint with no filters for overall analysis
        const res = await aiAPI.accreditationReport({});
        result = res.data.report;
      } else if (id === 'achievement-insights') {
        const res = await aiAPI.accreditationReport({ academicYear: reportForm.academicYear });
        result = res.data.report;
      }
      setResults(prev => ({ ...prev, [id]: result }));
      toast.success('AI analysis generated!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'AI request failed';
      if (err.response?.status === 500 && err.response?.data?.message?.includes('API')) {
        toast.error('Please configure your Anthropic API key in backend/.env');
        setResults(prev => ({ ...prev, [id]: '⚠️ Please add your ANTHROPIC_API_KEY to the backend .env file to use AI features.\n\nGet your API key from: https://console.anthropic.com' }));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateReport = async () => {
    setLoading('accreditation-report');
    setShowReportForm(false);
    try {
      const res = await aiAPI.accreditationReport(reportForm);
      setResults(prev => ({ ...prev, 'accreditation-report': res.data.report }));
      toast.success('Accreditation report generated!');
    } catch (err) {
      if (err.response?.status === 500 && err.response?.data?.message?.includes('API')) {
        toast.error('Please configure your Anthropic API key in backend/.env');
        setResults(prev => ({ ...prev, 'accreditation-report': '⚠️ Please add your ANTHROPIC_API_KEY to the backend .env file to use AI features.\n\nGet your API key from: https://console.anthropic.com' }));
      } else {
        toast.error('Failed to generate report');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">✨ AI Assistant</h1>
          <p className="page-subtitle">AI-powered tools for institutional analysis and accreditation reporting</p>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <span>🤖</span>
        <div>
          <strong>Admin AI Features</strong> — These tools help generate accreditation reports and analyze institutional data.
          Make sure your Anthropic API key is configured in the backend <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>.env</code> file.
        </div>
      </div>

      {/* Report Form Modal */}
      {showReportForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReportForm(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">Generate Accreditation Report</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReportForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select 
                  className="form-select" 
                  value={reportForm.academicYear} 
                  onChange={e => setReportForm(f => ({ ...f, academicYear: e.target.value }))}
                >
                  {['2024-25', '2023-24', '2022-23', '2021-22'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Branch (Optional)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g., CSE, ECE, MECH"
                  value={reportForm.branch}
                  onChange={e => setReportForm(f => ({ ...f, branch: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReportForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerateReport} disabled={loading === 'accreditation-report'}>
                {loading === 'accreditation-report' ? <><span className="spinner" /> Generating...</> : '✨ Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {ADMIN_AI_FEATURES.map(feature => (
          <div key={feature.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${feature.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, border: `1px solid ${feature.color}30`
              }}>
                {feature.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{feature.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{feature.description}</div>
              </div>
            </div>

            <button
              className="btn"
              style={{
                background: `${feature.color}20`,
                color: feature.color,
                border: `1px solid ${feature.color}30`,
                justifyContent: 'center',
                marginBottom: results[feature.id] ? 14 : 0,
              }}
              onClick={() => handleFeature(feature.id)}
              disabled={loading === feature.id}
            >
              {loading === feature.id ? (
                <><span className="spinner" style={{ borderTopColor: feature.color }} /> Generating...</>
              ) : (
                <>{feature.icon} {feature.btnLabel}</>
              )}
            </button>

            {results[feature.id] && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: feature.color }}>✨</span> AI Response
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(results[feature.id]);
                      toast.success('Copied to clipboard!');
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 11 }}
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="ai-response" style={{ borderLeftColor: feature.color, maxHeight: 400, overflow: 'auto' }}>
                  {results[feature.id]}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>💡 Tips for Admin AI Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '📋', tip: 'Generate accreditation reports at the end of each academic year for NAAC/NBA submissions' },
            { icon: '📊', tip: 'Use Institution Analysis to identify trends and improve student engagement strategies' },
            { icon: '✅', tip: 'Ensure achievements are verified before generating official reports' },
            { icon: '🔐', tip: 'Add your Anthropic API key to backend/.env for full AI capabilities' },
          ].map((item, i) => (
            <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
