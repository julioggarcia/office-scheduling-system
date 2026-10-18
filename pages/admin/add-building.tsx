import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function AddBuildingPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floorCount, setFloorCount] = useState<number>(1);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/buildings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, address, floorCount }) });
    const j = await res.json();
    if (res.ok) {
      setResult('Created building ' + j.name + ' with ' + (j.floors?.length || 0) + ' floors');
      // optionally navigate to admin or edit page
      setTimeout(() => router.push('/admin'), 800);
    } else {
      setResult(JSON.stringify(j));
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Add Building</h1>
      <form onSubmit={submit}>
        <div>
          <label>Building name</label>
          <br />
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Address</label>
          <br />
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Floor count</label>
          <br />
          <input type="number" value={floorCount} min={0} onChange={(e) => setFloorCount(Number(e.target.value))} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Create Building</button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: 12 }}>
          <h3>Result</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
