// The city's districts. Each one is a rectangle of the city, given as
// fractions of its half-width (`x`, -1 to 1) and half-length (`z`, -1 at
// the start-line end, 1 at the far end). On the map, +x is drawn on the
// left: it's the driver's left heading away from the start.
//
// To dedicate a part of the city to something, add or edit an entry here.
// The map and the "Now entering" banner pick it up.

export type District = {
  id: string
  name: string
  blurb: string
  color: string
  x: [number, number]
  z: [number, number]
}

export const DISTRICTS: District[] = [
  {
    id: 'gregarious-square',
    name: 'Gregarious Square',
    blurb: 'Where every race starts. Home of the high-score board.',
    color: '#ffc34d',
    x: [-1, 1],
    z: [-1, -0.5],
  },
  {
    id: 'midtown',
    name: 'Midtown',
    blurb: 'Towers, taxis and the tallest crown signs.',
    color: '#7fd8ff',
    x: [-1, 1],
    z: [-0.5, 0],
  },
  {
    id: 'snoopy-town',
    name: 'Snoopy Town',
    blurb: 'Reserved. Something good is coming here.',
    color: '#ff6b8a',
    x: [0, 1],
    z: [0, 0.5],
  },
  {
    id: 'arcade-row',
    name: 'Arcade Row',
    blurb: 'Reserved for the arcade cabinets.',
    color: '#b18cff',
    x: [-1, 0],
    z: [0, 0.5],
  },
  {
    id: 'uptown',
    name: 'Uptown',
    blurb: 'The quiet end of the city, past the last ring.',
    color: '#8fe388',
    x: [-1, 1],
    z: [0.5, 1],
  },
]

// The district at (x, z), in metres in the city's coordinates, or null
// outside the city.
export function districtAt(x: number, z: number, halfWidth: number, halfLength: number) {
  const fx = x / halfWidth
  const fz = z / halfLength
  if (Math.abs(fx) > 1 || Math.abs(fz) > 1) return null
  return DISTRICTS.find((d) => fx >= d.x[0] && fx <= d.x[1] && fz >= d.z[0] && fz <= d.z[1]) ?? null
}
