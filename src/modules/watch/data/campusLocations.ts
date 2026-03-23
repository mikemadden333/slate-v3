export interface Campus {
  id: number;
  name: string;
  short: string;
  addr: string;
  lat: number;
  lng: number;
  communityArea: string;
  areaNumber: number;
  enroll: number;
  arrH: number;
  arrM: number;
  dH: number;
  dM: number;
}

export const CAMPUS_LOCATIONS: Campus[] = [
  { id: 1,  name: 'Veritas Loop Academy',           short: 'Loop',           addr: '25 W. Monroe St',           lat: 41.8807, lng: -87.6299, communityArea: 'Loop',               areaNumber: 32, enroll: 987, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 2,  name: 'Veritas Englewood Academy',      short: 'Englewood',      addr: '641 W. 63rd St',            lat: 41.7797, lng: -87.6448, communityArea: 'Englewood',          areaNumber: 68, enroll: 742, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 3,  name: 'Veritas Woodlawn Academy',       short: 'Woodlawn',       addr: '6338 S. Cottage Grove Ave', lat: 41.7808, lng: -87.6063, communityArea: 'Woodlawn',           areaNumber: 42, enroll: 823, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 4,  name: 'Veritas Auburn Gresham Academy', short: 'Auburn Gresham', addr: '8039 S. Halsted St',        lat: 41.7468, lng: -87.6442, communityArea: 'Auburn Gresham',     areaNumber: 71, enroll: 678, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 5,  name: 'Veritas Roseland Academy',       short: 'Roseland',       addr: '10956 S. Michigan Ave',     lat: 41.6953, lng: -87.6228, communityArea: 'Roseland',           areaNumber: 49, enroll: 521, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 6,  name: 'Veritas Chatham Academy',        short: 'Chatham',        addr: '8201 S. Cottage Grove Ave', lat: 41.7444, lng: -87.6063, communityArea: 'Chatham',            areaNumber: 44, enroll: 891, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 7,  name: 'Veritas Austin Academy',         short: 'Austin',         addr: '231 N. Pine Ave',           lat: 41.8876, lng: -87.7696, communityArea: 'Austin',             areaNumber: 25, enroll: 711, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 8,  name: 'Veritas North Lawndale Academy', short: 'North Lawndale', addr: '1616 S. Millard Ave',       lat: 41.8555, lng: -87.7199, communityArea: 'North Lawndale',     areaNumber: 29, enroll: 329, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 9,  name: 'Veritas Garfield Park Academy',  short: 'Garfield Park',  addr: '2345 W. Congress Pkwy',     lat: 41.8752, lng: -87.6919, communityArea: 'East Garfield Park', areaNumber: 27, enroll: 652, arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 10, name: 'Veritas Humboldt Park Academy',  short: 'Humboldt Park',  addr: '3245 W. Division St',       lat: 41.9027, lng: -87.7165, communityArea: 'Humboldt Park',      areaNumber: 23, enroll: 489, arrH: 7, arrM: 30, dH: 15, dM: 10 },
];
