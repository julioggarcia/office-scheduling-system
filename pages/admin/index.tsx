import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { NextPage } from 'next';
import PageHeader from '../../components/PageHeader';

const TOOLS = [
  { href: '/admin/buildings', icon: '🏢', title: 'Add building', desc: 'Create a building with its address and floors.' },
  { href: '/admin/upload-svg', icon: '🗺️', title: 'Upload floorplan', desc: 'Attach an image or SVG floorplan to a floor.' },
  { href: '/map-editor', icon: '✎', title: 'Map editor', desc: 'Draw desks, cubicles and offices on a floorplan.' },
  { href: '/admin/locations', icon: '📍', title: 'Manage locations', desc: 'Browse every bookable space across buildings.' },
  { href: '/admin/staff-import', icon: '👥', title: 'Import staff', desc: 'Bulk-load staff from a CSV export.' },
];

const Admin: NextPage = () => {
  const { data: session } = useSession();
  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        subtitle={session?.user?.email ? <>Signed in as <strong>{session.user.email}</strong></> : 'Set up buildings, floorplans and bookable spaces.'}
      />
      <div className="grid-cards">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card link-card">
            <div className="icon" aria-hidden>{t.icon}</div>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Admin;
