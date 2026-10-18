import React, { useState } from 'react';

export default function StaffImportPage() {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/import/staff', { method: 'POST', body: csv, headers: { 'Content-Type': 'text/plain' } });
    const j = await res.json();
    setResult(JSON.stringify(j));
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Import Staff (CSV)</h1>
      <p>Expected headers: email,name,adObjectId</p>
      <form onSubmit={submit}>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={12} cols={80} />
        <div>
          <button type="submit">Import</button>
        </div>
      </form>
      {result && (
        <div>
          <h3>Result</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
