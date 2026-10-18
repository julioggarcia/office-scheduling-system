import React from 'react';

export default function AddLocationPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Add Location (Polygon-driven)</h1>
      <p>
        Locations are created by drawing polygons over a floor SVG. Use the Map Editor to draw outlines around desks, cubicles, or offices and then save the polygon as a new location.
      </p>
      <ul>
        <li>
          <a href="/admin/upload-svg">Upload or paste a floor SVG</a> — attach an SVG to a building/floor.
        </li>
        <li>
          <a href="/map-editor">Map Editor</a> — open the SVG for the floor and draw polygons. After saving a polygon, use the API to create the Location tied to that polygon.
        </li>
      </ul>

      <p>
        If you need to create a building (name, address, floor count), use the API endpoint POST <code>/api/buildings</code> with JSON { name, address, floorCount } or the Manage Buildings UI (not implemented in this scaffold). The Add-Building form in the scaffold has been replaced by this polygon-driven Add Location flow.
      </p>

      <p>
        Note: The polygon saving flow currently logs polygon points to the console. Next step: wire the Map Editor's Save action to POST the polygon points to an API that creates a Location + LocationPolygon entry in the database. If you'd like, implement that now.
      </p>
    </div>
  );
}
