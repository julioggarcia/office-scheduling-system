import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';

export default function StaffImportPage() {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/import/staff', { method: 'POST', body: csv, headers: { 'Content-Type': 'text/plain' } });
    const j = await res.json();
    setResult(JSON.stringify(j, null, 2));
  }

  return (
    <div>
      <PageHeader title="Import staff" subtitle={<>Paste CSV with the headers <code>email,name,adObjectId</code>.</>} />
      <form onSubmit={submit} className="card" style={{ maxWidth: 820 }}>
        <div className="field">
          <label htmlFor="csv">CSV data</label>
          <textarea id="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={12} placeholder={'email,name,adObjectId\njane@example.com,Jane Doe,0000-...'} />
        </div>
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={!csv.trim()}>Import</button>
        </div>
        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="label" style={{ marginBottom: 6 }}>Result</div>
            <pre>{result}</pre>
          </div>
        )}
      </form>
    </div>
  );
}
