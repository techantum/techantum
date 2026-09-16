export interface PlacesOption {
  placeId: string;
  label: string;
  description?: string;
  types?: string[];
}

function option(id: string, label: string, description: string): PlacesOption {
  return { placeId: id, label, description, types: ['catalog'] };
}

const IN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];

const AE_STATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];

const IN_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Pasighat'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Kalaburagi', 'Udupi'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Navi Mumbai', 'Kolhapur'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali', 'Bathinda'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore'],
  'Telangana': [
    'Hyderabad',
    'Secunderabad',
    'Warangal',
    'Nizamabad',
    'Karimnagar',
    'Khammam',
    'Ramagundam',
    'Mahbubnagar',
    'Nalgonda',
    'Adilabad',
    'Siddipet',
    'Suryapet',
    'Miryalaguda',
    'Kothagudem',
  ],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Bareilly'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'Delhi': ['New Delhi', 'Delhi'],
  'Chandigarh': ['Chandigarh'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu'],
  'Ladakh': ['Leh', 'Kargil'],
  'Puducherry': ['Puducherry', 'Karaikal'],
  'Andaman and Nicobar Islands': ['Port Blair'],
};

const COUNTRY_STATES: Record<string, string[]> = {
  IN: IN_STATES,
  US: US_STATES,
  AE: AE_STATES,
};

function matchesQuery(label: string, query: string) {
  const q = query.trim().toLowerCase();
  return !q || label.toLowerCase().includes(q);
}

export function catalogStates(countryCode?: string | null, query = ''): PlacesOption[] {
  const code = (countryCode || '').toUpperCase();
  const rows = COUNTRY_STATES[code] || [];
  return rows
    .filter((name) => matchesQuery(name, query))
    .map((name) => option(`state:${code}:${name}`, name, code));
}

const IN_AREAS: Record<string, { name: string; pin?: string }[]> = {
  Hyderabad: [
    { name: 'Madhapur', pin: '500081' },
    { name: 'Hitech City', pin: '500081' },
    { name: 'Kondapur', pin: '500084' },
    { name: 'Gachibowli', pin: '500032' },
    { name: 'Financial District', pin: '500032' },
    { name: 'Nanakramguda', pin: '500032' },
    { name: 'Kokapet', pin: '500075' },
    { name: 'Manikonda', pin: '500089' },
    { name: 'Jubilee Hills', pin: '500033' },
    { name: 'Banjara Hills', pin: '500034' },
    { name: 'Film Nagar', pin: '500096' },
    { name: 'Ameerpet', pin: '500016' },
    { name: 'Begumpet', pin: '500016' },
    { name: 'Punjagutta', pin: '500082' },
    { name: 'Somajiguda', pin: '500082' },
    { name: 'Kukatpally', pin: '500072' },
    { name: 'KPHB', pin: '500072' },
    { name: 'Miyapur', pin: '500049' },
    { name: 'Chandanagar', pin: '500050' },
    { name: 'Hafeezpet', pin: '500049' },
    { name: 'Bachupally', pin: '500090' },
    { name: 'Kompally', pin: '500014' },
    { name: 'Secunderabad', pin: '500003' },
    { name: 'Trimulgherry', pin: '500015' },
    { name: 'Dilsukhnagar', pin: '500060' },
    { name: 'LB Nagar', pin: '500074' },
    { name: 'Uppal', pin: '500039' },
    { name: 'Himayatnagar', pin: '500029' },
    { name: 'Abids', pin: '500001' },
    { name: 'Koti', pin: '500095' },
    { name: 'Mehdipatnam', pin: '500028' },
    { name: 'Tolichowki', pin: '500008' },
    { name: 'Attapur', pin: '500048' },
    { name: 'Shamshabad', pin: '501218' },
    { name: 'Tellapur', pin: '502032' },
    { name: 'Narsingi', pin: '500075' },
  ],
  Secunderabad: [
    { name: 'Secunderabad', pin: '500003' },
    { name: 'Trimulgherry', pin: '500015' },
    { name: 'Sainikpuri', pin: '500094' },
    { name: 'Alwal', pin: '500010' },
    { name: 'Malkajgiri', pin: '500047' },
  ],
  Bengaluru: [
    { name: 'Koramangala', pin: '560034' },
    { name: 'Indiranagar', pin: '560038' },
    { name: 'Whitefield', pin: '560066' },
    { name: 'HSR Layout', pin: '560102' },
    { name: 'Jayanagar', pin: '560041' },
    { name: 'Electronic City', pin: '560100' },
    { name: 'Marathahalli', pin: '560037' },
    { name: 'Bellandur', pin: '560103' },
    { name: 'Hebbal', pin: '560024' },
    { name: 'MG Road', pin: '560001' },
    { name: 'JP Nagar', pin: '560078' },
    { name: 'Yelahanka', pin: '560064' },
  ],
  Mumbai: [
    { name: 'Andheri', pin: '400053' },
    { name: 'Bandra', pin: '400050' },
    { name: 'Powai', pin: '400076' },
    { name: 'BKC', pin: '400051' },
    { name: 'Lower Parel', pin: '400013' },
    { name: 'Worli', pin: '400018' },
    { name: 'Juhu', pin: '400049' },
    { name: 'Malad', pin: '400064' },
    { name: 'Goregaon', pin: '400063' },
    { name: 'Thane', pin: '400601' },
  ],
  Pune: [
    { name: 'Hinjewadi', pin: '411057' },
    { name: 'Baner', pin: '411045' },
    { name: 'Kothrud', pin: '411038' },
    { name: 'Viman Nagar', pin: '411014' },
    { name: 'Kharadi', pin: '411014' },
    { name: 'Wakad', pin: '411057' },
    { name: 'Hadapsar', pin: '411028' },
  ],
  Chennai: [
    { name: 'T Nagar', pin: '600017' },
    { name: 'Anna Nagar', pin: '600040' },
    { name: 'Adyar', pin: '600020' },
    { name: 'Velachery', pin: '600042' },
    { name: 'OMR', pin: '600119' },
    { name: 'Tambaram', pin: '600045' },
    { name: 'Nungambakkam', pin: '600034' },
  ],
  Delhi: [
    { name: 'Connaught Place', pin: '110001' },
    { name: 'Karol Bagh', pin: '110005' },
    { name: 'Saket', pin: '110017' },
    { name: 'Dwarka', pin: '110075' },
    { name: 'Rohini', pin: '110085' },
    { name: 'South Extension', pin: '110049' },
    { name: 'Lajpat Nagar', pin: '110024' },
  ],
  'New Delhi': [
    { name: 'Connaught Place', pin: '110001' },
    { name: 'Karol Bagh', pin: '110005' },
    { name: 'Saket', pin: '110017' },
    { name: 'Dwarka', pin: '110075' },
  ],
};

export function catalogCities(countryCode?: string | null, stateName?: string | null, query = ''): PlacesOption[] {
  const code = (countryCode || '').toUpperCase();
  const state = (stateName || '').trim();
  const rows =
    code === 'IN'
      ? IN_CITIES[state] || (state ? [] : Object.values(IN_CITIES).flat())
      : [];
  return rows
    .filter((name) => matchesQuery(name, query))
    .map((name) => option(`city:${code}:${state || 'all'}:${name}`, name, state || code));
}

const CITY_ALIASES: Record<string, string> = {
  Bangalore: 'Bengaluru',
  'Bangalore Urban': 'Bengaluru',
  Gurugram: 'Delhi',
  Gurgaon: 'Delhi',
  Noida: 'Delhi',
};

export function catalogAreas(cityName?: string | null, query = ''): PlacesOption[] {
  const rawCity = (cityName || '').trim();
  const city = CITY_ALIASES[rawCity] || rawCity;
  const rows = IN_AREAS[city] || [];
  const q = query.trim().toLowerCase();
  return rows
    .filter((item) => !q || item.name.toLowerCase().includes(q) || (item.pin || '').includes(q))
    .map((item) => option(`area:${city}:${item.name}`, item.name, item.pin || city));
}

export function mergePlaceOptions(primary: PlacesOption[], secondary: PlacesOption[]) {
  const seen = new Set(primary.map((row) => row.label.toLowerCase()));
  return [...primary, ...secondary.filter((row) => !seen.has(row.label.toLowerCase()))];
}
