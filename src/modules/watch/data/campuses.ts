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
  // Financial & enrollment metrics
  perPupil: number;
  deltaFromAvg: number;
  retention: number;
  applications: number;
  conversionRate: number;
  ehh: number;        // Enrollment headcount
  mlFund: number;     // ML fund allocation (thousands)
}

export const CAMPUSES: Campus[] = [
  { id: 1,  name: "Veritas Loop Academy",             short: "Loop",            addr: "25 W. Monroe St",             lat: 41.8807, lng: -87.6299, communityArea: "Loop",              areaNumber: 32, enroll: 987, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 11200, deltaFromAvg: 750,   retention: 0.94, applications: 2100, conversionRate: 0.47, ehh: 994,  mlFund: 128 },
  { id: 2,  name: "Veritas Englewood Academy",        short: "Englewood",       addr: "641 W. 63rd St",              lat: 41.7797, lng: -87.6448, communityArea: "Englewood",         areaNumber: 68, enroll: 742, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10180, deltaFromAvg: -270,  retention: 0.89, applications: 1240, conversionRate: 0.60, ehh: 748,  mlFund: 96  },
  { id: 3,  name: "Veritas Woodlawn Academy",         short: "Woodlawn",        addr: "6338 S. Cottage Grove Ave",   lat: 41.7808, lng: -87.6063, communityArea: "Woodlawn",          areaNumber: 42, enroll: 823, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10390, deltaFromAvg: -60,   retention: 0.91, applications: 1380, conversionRate: 0.60, ehh: 831,  mlFund: 107 },
  { id: 4,  name: "Veritas Auburn Gresham Academy",   short: "Auburn Gresham",  addr: "8039 S. Halsted St",          lat: 41.7468, lng: -87.6442, communityArea: "Auburn Gresham",    areaNumber: 71, enroll: 678, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10050, deltaFromAvg: -400,  retention: 0.88, applications: 980,  conversionRate: 0.69, ehh: 671,  mlFund: 88  },
  { id: 5,  name: "Veritas Roseland Academy",         short: "Roseland",        addr: "10956 S. Michigan Ave",       lat: 41.6953, lng: -87.6228, communityArea: "Roseland",          areaNumber: 49, enroll: 521, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 9820,  deltaFromAvg: -630,  retention: 0.87, applications: 740,  conversionRate: 0.70, ehh: 514,  mlFund: 67  },
  { id: 6,  name: "Veritas Chatham Academy",          short: "Chatham",         addr: "8201 S. Cottage Grove Ave",   lat: 41.7444, lng: -87.6063, communityArea: "Chatham",           areaNumber: 44, enroll: 891, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10620, deltaFromAvg: 170,   retention: 0.93, applications: 1620, conversionRate: 0.55, ehh: 882,  mlFund: 116 },
  { id: 7,  name: "Veritas Austin Academy",           short: "Austin",          addr: "231 N. Pine Ave",             lat: 41.8876, lng: -87.7696, communityArea: "Austin",            areaNumber: 25, enroll: 711, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10290, deltaFromAvg: -160,  retention: 0.90, applications: 1150, conversionRate: 0.62, ehh: 704,  mlFund: 92  },
  { id: 8,  name: "Veritas North Lawndale Academy",   short: "North Lawndale",  addr: "1616 S. Millard Ave",         lat: 41.8555, lng: -87.7199, communityArea: "North Lawndale",    areaNumber: 29, enroll: 329, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10780, deltaFromAvg: 330,   retention: 0.86, applications: 420,  conversionRate: 0.78, ehh: 322,  mlFund: 42  },
  { id: 9,  name: "Veritas Garfield Park Academy",    short: "Garfield Park",   addr: "2345 W. Congress Pkwy",       lat: 41.8752, lng: -87.6919, communityArea: "East Garfield Park", areaNumber: 27, enroll: 652, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10440, deltaFromAvg: -10,   retention: 0.91, applications: 980,  conversionRate: 0.67, ehh: 645,  mlFund: 84  },
  { id: 10, name: "Veritas Humboldt Park Academy",    short: "Humboldt Park",   addr: "3245 W. Division St",         lat: 41.9027, lng: -87.7165, communityArea: "Humboldt Park",     areaNumber: 23, enroll: 489, arrH: 7, arrM: 30, dH: 15, dM: 10, perPupil: 10550, deltaFromAvg: 100,   retention: 0.90, applications: 720,  conversionRate: 0.68, ehh: 481,  mlFund: 63  },
];

export const CAMPUS_STATS = {
  networkAvgPerPupil: 10450,
  totalEHH: 6792,
  totalPreTilt: 68.2,
  perPupilSpread: 1380,
  highestPerPupil: { name: "Loop", value: 11200 },
  lowestPerPupil: { name: "Roseland", value: 9820 },
  mlFundTotal: 0.9,
};
