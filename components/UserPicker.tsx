import React, { useEffect, useRef, useState } from 'react';

export type PickedUser = { id: string; name: string | null; email: string };

const MIN_CHARS = 3;
const PAGE_SIZE = 5;

// Type-ahead search over /api/users (name or email). Searches once MIN_CHARS are typed and pages results PAGE_SIZE at a time.
export default function UserPicker({ value, onChange, placeholder = 'Search by name or email' }: { value: PickedUser | null; onChange: (u: PickedUser | null) => void; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PickedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = query.trim();
  const searching = term.length >= MIN_CHARS;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [term]);

  useEffect(() => {
    if (!searching) { setResults([]); setTotal(0); return; }
    let cancelled = false;
    setLoading(true);
    // debounce so we don't query on every keystroke
    const t = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(term)}&active=true&page=${page}&pageSize=${PAGE_SIZE}`)
        .then((r) => (r.ok ? r.json() : { users: [], total: 0 }))
        .then((j) => { if (!cancelled) { setResults(j.users || []); setTotal(j.total || 0); setActive(0); } })
        .catch(() => { if (!cancelled) { setResults([]); setTotal(0); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [term, page, searching]);

  function pick(u: PickedUser) {
    onChange(u);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !searching) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  if (value) {
    return (
      <div className="user-picked">
        <span className="avatar">{(value.name || value.email).charAt(0).toUpperCase()}</span>
        <span className="user-picked-text">
          <strong>{value.name || value.email}</strong>
          {value.name && <span className="hint">{value.email}</span>}
        </span>
        <button type="button" className="btn-sm" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus()); }} aria-label="Change user">Change</button>
      </div>
    );
  }

  return (
    <div className="user-picker">
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && searching}
        aria-autocomplete="list"
      />
      {open && term.length > 0 && (
        // mousedown preventDefault keeps focus in the input so onBlur doesn't close the list before a click lands
        <div className="user-picker-menu" onMouseDown={(e) => e.preventDefault()}>
          {!searching ? (
            <div className="user-picker-note">Type {MIN_CHARS - term.length} more character{MIN_CHARS - term.length === 1 ? '' : 's'} to search</div>
          ) : loading && results.length === 0 ? (
            <div className="user-picker-note">Searching…</div>
          ) : results.length === 0 ? (
            <div className="user-picker-note">No users match “{term}”</div>
          ) : (
            <>
              <ul role="listbox">
                {results.map((u, i) => (
                  <li key={u.id} role="option" aria-selected={i === active}
                    className={'user-picker-option' + (i === active ? ' active' : '')}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(u)}>
                    <span className="avatar">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                    <span className="user-picked-text">
                      <strong>{u.name || u.email}</strong>
                      {u.name && <span className="hint">{u.email}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {total > PAGE_SIZE && (
                <div className="user-picker-pager">
                  <button type="button" className="btn-sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>‹ Prev</button>
                  <span className="hint">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <button type="button" className="btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || loading}>Next ›</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
