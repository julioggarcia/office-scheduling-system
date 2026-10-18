import { getSession, useSession } from 'next-auth/react';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import type { NextPage } from 'next';

const Admin: NextPage = () => {
  const { data: session } = useSession();
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>
      <p>Signed in as: {session?.user?.email}</p>
      <ul>
        <li>
          <Link href="/admin/locations">Manage Locations</Link>
        </li>
        <li>
          <Link href="/admin/buildings">Add Building</Link>
        </li>
        <li>
          <Link href="/admin/staff-import">Import Staff (CSV)</Link>
        </li>
      </ul>
    </div>
  );
};

export default Admin;
