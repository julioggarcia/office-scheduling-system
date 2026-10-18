import type { NextPage } from 'next';
import Link from 'next/link';
import prisma from '../lib/prisma';

type Props = {
  buildings: { id: string; name: string; floorCount: number }[];
};

const Home: NextPage<Props> = ({ buildings }) => {
  return (
    <div style={{ padding: 20 }}>
      <h1>Office Reservation</h1>
      <nav>
        <Link href="/admin">Admin</Link> | <Link href="/map-editor">Map Editor</Link> | <Link href="/admin/upload-svg">Upload SVG</Link>
      </nav>
      <h2>Buildings</h2>
      <ul>
        {buildings.map((b) => (
          <li key={b.id}>{b.name} — {b.floorCount} floors</li>
        ))}
      </ul>
    </div>
  );
};

export async function getServerSideProps() {
  const buildings = await prisma.building.findMany({ include: { floors: { select: { id: true } } } });
  const out = buildings.map((b) => ({ id: b.id, name: b.name, floorCount: b.floors.length }));
  return { props: { buildings: out } };
}

export default Home;
