import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';

export default function AddBuildingPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floorCount, setFloorCount] = useState<number>(1);
  const [timezone, setTimezone] = useState('');
  // default to the admin's own zone; set after mount to avoid a hydration mismatch
  useEffect(() => { setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); }, []);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/buildings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, address, floorCount, timezone }) });
    const j = await res.json();
    if (res.ok) {
      setResult({ ok: true, text: 'Created building ' + j.name + ' with ' + (j.floors?.length || 0) + ' floors' });
      // optionally navigate to admin or edit page
      setTimeout(() => router.push('/admin'), 800);
    } else {
      setResult({ ok: false, text: JSON.stringify(j) });
    }
  }

  return (
    <div>
      <PageHeader title="Add building" subtitle="Floors are created automatically; upload a floorplan for each one afterwards." />
      <form onSubmit={submit} className="card" style={{ maxWidth: 520 }}>
        <div className="field">
          <label htmlFor="name">Building name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HQ North" required />
        </div>
        <div className="field">
          <label htmlFor="address">Address</label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" />
        </div>
        <div className="field">
          <label htmlFor="floors">Floor count</label>
          <input id="floors" type="number" value={floorCount} min={0} onChange={(e) => setFloorCount(Number(e.target.value))} style={{ maxWidth: 120 }} />
        </div>
        <div className="field">
          <label htmlFor="tz">Timezone</label>
          <input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/Chicago" />
          <span className="hint">Assigned-seat hours are interpreted in this timezone.</span>
        </div>
        <div className="actions">
          <button type="submit" className="btn-primary">Create building</button>
        </div>
        {result && <div className={'alert' + (result.ok ? '' : ' alert-error')}>{result.text}</div>}
      </form>
    </div>
  );
}
