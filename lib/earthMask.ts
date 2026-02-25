export type LonLat = { lon: number; lat: number };

// Rough continent polygons in lon/lat degrees (readable, recognizable).
const POLYGONS: LonLat[][] = [
  // North America
  [
    { lon: -168, lat: 72 }, { lon: -140, lat: 72 }, { lon: -120, lat: 68 }, { lon: -110, lat: 60 },
    { lon: -100, lat: 50 }, { lon: -95, lat: 45 }, { lon: -90, lat: 40 }, { lon: -85, lat: 30 },
    { lon: -95, lat: 18 }, { lon: -110, lat: 18 }, { lon: -125, lat: 28 }, { lon: -140, lat: 40 },
    { lon: -160, lat: 52 }, { lon: -168, lat: 65 }
  ],
  // South America
  [
    { lon: -82, lat: 12 }, { lon: -70, lat: 10 }, { lon: -62, lat: 6 }, { lon: -52, lat: -4 },
    { lon: -50, lat: -20 }, { lon: -55, lat: -34 }, { lon: -62, lat: -52 }, { lon: -70, lat: -52 },
    { lon: -76, lat: -40 }, { lon: -80, lat: -20 }, { lon: -82, lat: -5 }
  ],
  // Europe + Asia (Eurasia)
  [
    { lon: -10, lat: 36 }, { lon: 10, lat: 35 }, { lon: 30, lat: 40 }, { lon: 50, lat: 50 },
    { lon: 70, lat: 55 }, { lon: 100, lat: 58 }, { lon: 130, lat: 50 }, { lon: 150, lat: 45 },
    { lon: 170, lat: 55 }, { lon: 170, lat: 70 }, { lon: 120, lat: 70 }, { lon: 70, lat: 70 },
    { lon: 30, lat: 65 }, { lon: 10, lat: 60 }, { lon: -10, lat: 55 }
  ],
  // Africa
  [
    { lon: -18, lat: 34 }, { lon: 10, lat: 35 }, { lon: 32, lat: 30 }, { lon: 40, lat: 20 },
    { lon: 50, lat: 5 }, { lon: 45, lat: -15 }, { lon: 35, lat: -25 }, { lon: 20, lat: -35 },
    { lon: 5, lat: -35 }, { lon: -5, lat: -25 }, { lon: -10, lat: -5 }, { lon: -15, lat: 10 }
  ],
  // Australia
  [
    { lon: 112, lat: -10 }, { lon: 155, lat: -10 }, { lon: 155, lat: -40 }, { lon: 140, lat: -45 },
    { lon: 115, lat: -35 }
  ],
  // Greenland
  [
    { lon: -60, lat: 60 }, { lon: -20, lat: 60 }, { lon: -10, lat: 75 }, { lon: -35, lat: 83 }, { lon: -55, lat: 78 }
  ],
  // Antarctica band
  [
    { lon: -180, lat: -60 }, { lon: 180, lat: -60 }, { lon: 180, lat: -90 }, { lon: -180, lat: -90 }
  ]
];

const toRadians = (deg: number) => (deg * Math.PI) / 180;

function pointInPoly(point: LonLat, poly: LonLat[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lon, yi = poly[i].lat;
    const xj = poly[j].lon, yj = poly[j].lat;
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi + 0.000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isLand(lat: number, lon: number) {
  const lonDeg = lon * (180 / Math.PI);
  const latDeg = lat * (180 / Math.PI);
  for (let i = 0; i < POLYGONS.length; i++) {
    if (pointInPoly({ lon: lonDeg, lat: latDeg }, POLYGONS[i])) return true;
  }
  return false;
}

export function isNearLand(lat: number, lon: number) {
  if (isLand(lat, lon)) return true;
  const offsets = [0.03, -0.03, 0.06, -0.06];
  for (let i = 0; i < offsets.length; i++) {
    for (let j = 0; j < offsets.length; j++) {
      if (isLand(lat + offsets[i], lon + offsets[j])) return true;
    }
  }
  return false;
}
