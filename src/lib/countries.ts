export interface CountryInfo {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Afghanistan', code: 'AF', dialCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Andorra', code: 'AD', dialCode: '+376', flag: '🇦🇩' },
  { name: 'Angola', code: 'AO', dialCode: '+244', flag: '🇦🇴' },
  { name: 'Armenia', code: 'AM', dialCode: '+374', flag: '🇦🇲' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Belarus', code: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Bhutan', code: 'BT', dialCode: '+975', flag: '🇧🇹' },
  { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dialCode: '+387', flag: '🇧🇦' },
  { name: 'Brunei', code: 'BN', dialCode: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Cambodia', code: 'KH', dialCode: '+855', flag: '🇰🇭' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Cyprus', code: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Ethiopia', code: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'Georgia', code: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'Iceland', code: 'IS', dialCode: '+354', flag: '🇮🇸' },
  { name: 'Iran', code: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Kyrgyzstan', code: 'KG', dialCode: '+996', flag: '🇰🇬' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Luxembourg', code: 'LU', dialCode: '+352', flag: '🇱🇺' },
  { name: 'Maldives', code: 'MV', dialCode: '+960', flag: '🇲🇻' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Myanmar', code: 'MM', dialCode: '+95', flag: '🇲🇲' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Serbia', code: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼' },
  { name: 'Tajikistan', code: 'TJ', dialCode: '+992', flag: '🇹🇯' },
  { name: 'Tunisia', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'Uzbekistan', code: 'UZ', dialCode: '+998', flag: '🇺🇿' },
  { name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪' },
  { name: 'Yemen', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
  { name: 'Other Country', code: 'XX', dialCode: '+', flag: '🌐' }
];

export const COUNTRY_STATES: Record<string, string[]> = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry'
  ],
  'Pakistan': [
    'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan',
    'Islamabad Capital Territory', 'Azad Jammu and Kashmir', 'Gilgit-Baltistan'
  ],
  'Nepal': [
    'Bagmati Province', 'Gandaki Province', 'Karnali Province',
    'Koshi Province', 'Lumbini Province', 'Madhesh Province', 'Sudurpashchim Province'
  ],
  'United Arab Emirates': [
    'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
  ],
  'Saudi Arabia': [
    'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk',
    'Hail', 'Northern Borders', 'Jazan', 'Najran', 'Al Bahah', 'Al Jawf', 'Al Qassim'
  ],
  'Qatar': [
    'Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Al Daayen', 'Al Shamal', 'Al Shahaniya'
  ],
  'Kuwait': [
    'Al Asimah (Capital)', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Mubarak Al-Kabeer', 'Al Jahra'
  ],
  'Oman': [
    'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Al Dakhiliyah',
    'Al Batinah North', 'Al Batinah South', 'Al Sharqiyah North', 'Al Sharqiyah South', 'Al Dhahirah', 'Al Wusta'
  ],
  'Bahrain': [
    'Capital Governorate', 'Muharraq Governorate', 'Northern Governorate', 'Southern Governorate'
  ],
  'Malaysia': [
    'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan', 'Pahang', 'Penang',
    'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
    'Kuala Lumpur', 'Putrajaya', 'Labuan'
  ],
  'Singapore': [
    'Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'
  ],
  'Indonesia': [
    'Jakarta', 'West Java', 'Central Java', 'East Java', 'Banten', 'Bali',
    'North Sumatra', 'West Sumatra', 'South Sumatra', 'Riau', 'Lampung',
    'West Kalimantan', 'East Kalimantan', 'South Sulawesi', 'North Sulawesi', 'Papua', 'Yogyakarta'
  ],
  'Thailand': [
    'Bangkok', 'Chiang Mai', 'Chonburi', 'Phuket', 'Nonthaburi', 'Pathum Thani',
    'Nakhon Ratchasima', 'Khon Kaen', 'Songkhla', 'Surat Thani', 'Samut Prakan'
  ],
  'Philippines': [
    'Metro Manila (NCR)', 'Calabarzon', 'Central Luzon', 'Central Visayas',
    'Western Visayas', 'Davao Region', 'Northern Mindanao', 'Ilocos Region',
    'Bicol Region', 'Eastern Visayas', 'Zamboanga Peninsula', 'Cordillera (CAR)'
  ],
  'Vietnam': [
    'Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong', 'Can Tho',
    'Binh Duong', 'Dong Nai', 'Quang Ninh', 'Thua Thien Hue', 'Khanh Hoa'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming', 'District of Columbia'
  ],
  'United Kingdom': [
    'England - Greater London', 'England - South East', 'England - North West',
    'England - West Midlands', 'England - Yorkshire & Humber', 'England - East Midlands',
    'England - South West', 'England - East of England', 'England - North East',
    'Scotland', 'Wales', 'Northern Ireland'
  ],
  'Canada': [
    'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan',
    'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island',
    'Northwest Territories', 'Nunavut', 'Yukon'
  ],
  'Australia': [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
    'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  'Germany': [
    'Bavaria', 'Baden-Württemberg', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
    'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia',
    'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
  ],
  'France': [
    'Île-de-France (Paris)', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie',
    'Hauts-de-France', 'Provence-Alpes-Côte d’Azur', 'Grand Est', 'Pays de la Loire',
    'Brittany', 'Normandy', 'Bourgogne-Franche-Comté', 'Centre-Val de Loire', 'Corsica'
  ],
  'Italy': [
    'Lombardy (Milan)', 'Lazio (Rome)', 'Campania (Naples)', 'Veneto', 'Sicily',
    'Piedmont (Turin)', 'Emilia-Romagna', 'Tuscany (Florence)', 'Apulia', 'Calabria'
  ],
  'Spain': [
    'Madrid', 'Catalonia (Barcelona)', 'Andalusia', 'Valencia', 'Galicia',
    'Castile and León', 'Basque Country', 'Canary Islands', 'Balearic Islands', 'Murcia'
  ],
  'Turkey': [
    'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Sanliurfa', 'Kocaeli'
  ],
  'Brazil': [
    'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul',
    'Pernambuco', 'Ceará', 'Santa Catarina', 'Goiás', 'Maranhão', 'Amazonas', 'Espírito Santo'
  ],
  'Argentina': [
    'Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Entre Ríos', 'Salta', 'Misiones'
  ],
  'Egypt': [
    'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Gharbia', 'Qalyubia', 'Asyut', 'Suez', 'Port Said'
  ],
  'South Africa': [
    'Gauteng (Johannesburg/Pretoria)', 'Western Cape (Cape Town)', 'KwaZulu-Natal (Durban)',
    'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'
  ],
  'Nigeria': [
    'Lagos', 'Abuja (FCT)', 'Kano', 'Rivers (Port Harcourt)', 'Oyo (Ibadan)', 'Kaduna', 'Enugu', 'Delta'
  ],
  'Japan': [
    'Tokyo', 'Osaka', 'Kanagawa', 'Aichi (Nagoya)', 'Hokkaido', 'Fukuoka', 'Hyogo (Kobe)', 'Kyoto', 'Saitama', 'Chiba'
  ],
  'South Korea': [
    'Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Gyeonggi-do', 'Gangwon-do', 'Jeju-do'
  ]
};

export const getCountryStates = (countryName?: string): string[] | null => {
  if (!countryName) return null;
  const match = Object.keys(COUNTRY_STATES).find(
    k => k.toLowerCase() === countryName.trim().toLowerCase()
  );
  return match ? COUNTRY_STATES[match] : null;
};

export const getCountryByCodeOrName = (val?: string): CountryInfo => {
  if (!val) return COUNTRIES[0]; // Default Bangladesh
  const trimmed = val.trim().toLowerCase();
  const found = COUNTRIES.find(c => 
    c.name.toLowerCase() === trimmed || 
    c.code.toLowerCase() === trimmed
  );
  return found || { name: val, code: 'XX', dialCode: '+', flag: '🌐' };
};

/**
 * Strips all country dial codes, multiple country code prefixes, and formatting symbols
 * to return a clean local number for form inputs.
 * For Bangladesh, it always returns standard 11-digit format starting with '01' (e.g., 01850036508).
 */
export const stripCountryDialCode = (rawMobile?: string | null, countryNameOrCode: string = 'Bangladesh'): string => {
  if (!rawMobile) return '';
  let clean = String(rawMobile).replace(/[\s\-\(\)\.]/g, '').trim();
  if (!clean) return '';

  const countryInfo = getCountryByCodeOrName(countryNameOrCode || 'Bangladesh');
  const isBD = countryInfo.name === 'Bangladesh' || countryNameOrCode === 'Bangladesh' || countryInfo.code === 'BD';

  if (isBD) {
    // Repeatedly strip all variations of +880, +88, 880, 88 prefix
    let prev = '';
    while (prev !== clean) {
      prev = clean;
      clean = clean.replace(/^(\+880|\+88|880|88)/, '');
    }
    // If it starts with 1 and is 10 digits, prepend 0 (e.g. 1850036508 -> 01850036508)
    if (clean.length === 10 && clean.startsWith('1')) {
      clean = '0' + clean;
    }
    return clean;
  }

  // Non-BD International
  const dial = countryInfo.dialCode; // e.g. "+91"
  const digitsOfDial = dial.replace(/\D/g, ''); // e.g. "91"
  
  let prev = '';
  while (prev !== clean) {
    prev = clean;
    if (dial && clean.startsWith(dial)) {
      clean = clean.slice(dial.length);
    } else if (digitsOfDial && clean.startsWith('+' + digitsOfDial)) {
      clean = clean.slice(digitsOfDial.length + 1);
    } else if (digitsOfDial && clean.startsWith(digitsOfDial) && clean.length > digitsOfDial.length + 4) {
      clean = clean.slice(digitsOfDial.length);
    }
  }

  return clean;
};

/**
 * Formats a local number with the single exact country dial code for storing in the database.
 * Prevents duplicate country codes like +880+880... or +88+88...
 */
export const formatMobileWithDialCode = (rawMobile?: string | null, countryNameOrCode: string = 'Bangladesh'): string => {
  if (!rawMobile) return '';
  const countryInfo = getCountryByCodeOrName(countryNameOrCode || 'Bangladesh');
  const isBD = countryInfo.name === 'Bangladesh' || countryNameOrCode === 'Bangladesh' || countryInfo.code === 'BD';
  const clean = stripCountryDialCode(rawMobile, countryNameOrCode);

  if (!clean) return '';

  if (isBD) {
    let standard11 = clean;
    if (standard11.length === 10 && standard11.startsWith('1')) {
      standard11 = '0' + standard11;
    }
    const withoutZero = standard11.startsWith('0') ? standard11.slice(1) : standard11;
    return `+880${withoutZero}`;
  }

  const dial = countryInfo.dialCode;
  const numWithoutLeadingZero = clean.replace(/^0+/, '');
  return `${dial}${numWithoutLeadingZero}`;
};

