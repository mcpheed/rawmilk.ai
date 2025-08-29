export function distanceKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R=6371, rad=(d:number)=>d*Math.PI/180;
  const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
  const k=s1*s1+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*s2*s2;
  return 2*R*Math.atan2(Math.sqrt(k), Math.sqrt(1-k));
}
