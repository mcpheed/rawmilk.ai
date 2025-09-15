import data from '../data/locations.json';
const locs = (data as any).locations || [];
const withLL = locs.filter((l:any)=> l.lat!=null && l.lng!=null).length;
console.log(`Total: ${locs.length}, with lat/lng: ${withLL}`);
