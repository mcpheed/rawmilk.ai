import { geocodeAddress } from '../src/lib/geocode';

(async () => {
  for (const q of [
    'Fenway Park, Boston, MA',
    'Boston, MA',
    'Greenfield, MA',
    'Hadley, MA, USA'
  ]) {
    const g = await geocodeAddress(q);
    console.log(q, '->', g);
  }
})();
