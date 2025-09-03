export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
export function keyOf(name: string, zip?: string) {
  return slugify(`${name}-${zip ?? ''}`);
}
export function distanceKm(a: {lat:number, lng:number}, b: {lat:number, lng:number}) {
  const R = 6371, toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}
