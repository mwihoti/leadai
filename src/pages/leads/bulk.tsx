// ============================================================
// Linked Lead AI — Bulk Lead Import Page
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardPaste, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function BulkLeadImportPage() {
  const { state, bulkImportLeads, dispatch } = useApp();
  const [rawText, setRawText] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    const count = await bulkImportLeads(rawText);
    setImportedCount(count || null);
    if (count > 0) {
      setRawText('');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/leads" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Paste Leads</h1>
          <p className="text-gray-500 mt-1">Paste LinkedIn search results or hiring posts and let Claude extract opportunities</p>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-red-700">{state.error}</span>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="text-red-500 hover:text-red-700 text-sm">
            Dismiss
          </button>
        </div>
      )}

      {importedCount && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Imported {importedCount} lead{importedCount !== 1 ? 's' : ''}</span>
          </div>
          <Link to="/leads" className="text-sm text-green-700 hover:text-green-800 font-medium">
            View leads
          </Link>
        </div>
      )}

      <form onSubmit={handleImport} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Paste Source Text</h2>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={18}
          placeholder={`Paste multiple LinkedIn posts or search results here...

Example:
Feed post
Weather-AI
We're Hiring: Software Developer (Full Remote)
Company: Weather-AI Labs
Requirements: JavaScript, Python, Node.js
Apply directly here: https://...`}
          className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-y font-mono leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Claude will deduplicate posts, score opportunities, flag trust issues, and create analyzed leads.
          </p>
          <button
            type="submit"
            disabled={!rawText.trim() || state.aiLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {state.aiLoading ? 'Importing...' : 'Import with Claude'}
          </button>
        </div>
      </form>
    </div>
  );
}
