import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { COUNTRIES } from '../lib/countries';
import { 
  Users, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  ArrowLeft, 
  Search, 
  Filter, 
  Loader2,
  ChevronDown,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

// Country short codes mapping helper for prompt requirements (e.g. BD for Bangladesh, UK for United Kingdom, UAE for United Arab Emirates)
const COUNTRY_SHORT_CODES: Record<string, { code: string; flag: string; full: string }> = {
  'bangladesh': { code: 'BD', flag: '🇧🇩', full: 'Bangladesh' },
  'bd': { code: 'BD', flag: '🇧🇩', full: 'Bangladesh' },
  'united kingdom': { code: 'UK', flag: '🇬🇧', full: 'United Kingdom' },
  'uk': { code: 'UK', flag: '🇬🇧', full: 'United Kingdom' },
  'gb': { code: 'UK', flag: '🇬🇧', full: 'United Kingdom' },
  'great britain': { code: 'UK', flag: '🇬🇧', full: 'United Kingdom' },
  'england': { code: 'UK', flag: '🇬🇧', full: 'United Kingdom' },
  'united arab emirates': { code: 'UAE', flag: '🇦🇪', full: 'United Arab Emirates' },
  'uae': { code: 'UAE', flag: '🇦🇪', full: 'United Arab Emirates' },
  'ae': { code: 'UAE', flag: '🇦🇪', full: 'United Arab Emirates' },
  'united states': { code: 'US', flag: '🇺🇸', full: 'United States' },
  'united states of america': { code: 'US', flag: '🇺🇸', full: 'United States' },
  'usa': { code: 'US', flag: '🇺🇸', full: 'United States' },
  'us': { code: 'US', flag: '🇺🇸', full: 'United States' },
  'india': { code: 'IN', flag: '🇮🇳', full: 'India' },
  'in': { code: 'IN', flag: '🇮🇳', full: 'India' },
  'pakistan': { code: 'PK', flag: '🇵🇰', full: 'Pakistan' },
  'pk': { code: 'PK', flag: '🇵🇰', full: 'Pakistan' },
  'saudi arabia': { code: 'SA', flag: '🇸🇦', full: 'Saudi Arabia' },
  'sa': { code: 'SA', flag: '🇸🇦', full: 'Saudi Arabia' },
  'ksa': { code: 'SA', flag: '🇸🇦', full: 'Saudi Arabia' },
  'nepal': { code: 'NP', flag: '🇳🇵', full: 'Nepal' },
  'np': { code: 'NP', flag: '🇳🇵', full: 'Nepal' },
  'qatar': { code: 'QA', flag: '🇶🇦', full: 'Qatar' },
  'qa': { code: 'QA', flag: '🇶🇦', full: 'Qatar' },
  'kuwait': { code: 'KW', flag: '🇰🇼', full: 'Kuwait' },
  'kw': { code: 'KW', flag: '🇰🇼', full: 'Kuwait' },
  'oman': { code: 'OM', flag: '🇴🇲', full: 'Oman' },
  'om': { code: 'OM', flag: '🇴🇲', full: 'Oman' },
  'bahrain': { code: 'BH', flag: '🇧🇭', full: 'Bahrain' },
  'bh': { code: 'BH', flag: '🇧🇭', full: 'Bahrain' },
  'malaysia': { code: 'MY', flag: '🇲🇾', full: 'Malaysia' },
  'my': { code: 'MY', flag: '🇲🇾', full: 'Malaysia' },
  'singapore': { code: 'SG', flag: '🇸🇬', full: 'Singapore' },
  'sg': { code: 'SG', flag: '🇸🇬', full: 'Singapore' },
  'indonesia': { code: 'ID', flag: '🇮🇩', full: 'Indonesia' },
  'id': { code: 'ID', flag: '🇮🇩', full: 'Indonesia' },
  'canada': { code: 'CA', flag: '🇨🇦', full: 'Canada' },
  'ca': { code: 'CA', flag: '🇨🇦', full: 'Canada' },
  'australia': { code: 'AU', flag: '🇦🇺', full: 'Australia' },
  'au': { code: 'AU', flag: '🇦🇺', full: 'Australia' },
  'germany': { code: 'DE', flag: '🇩🇪', full: 'Germany' },
  'de': { code: 'DE', flag: '🇩🇪', full: 'Germany' },
  'france': { code: 'FR', flag: '🇫🇷', full: 'France' },
  'fr': { code: 'FR', flag: '🇫🇷', full: 'France' },
  'italy': { code: 'IT', flag: '🇮🇹', full: 'Italy' },
  'it': { code: 'IT', flag: '🇮🇹', full: 'Italy' },
  'spain': { code: 'ES', flag: '🇪🇸', full: 'Spain' },
  'es': { code: 'ES', flag: '🇪🇸', full: 'Spain' },
  'turkey': { code: 'TR', flag: '🇹🇷', full: 'Turkey' },
  'tr': { code: 'TR', flag: '🇹🇷', full: 'Turkey' },
  'japan': { code: 'JP', flag: '🇯🇵', full: 'Japan' },
  'jp': { code: 'JP', flag: '🇯🇵', full: 'Japan' },
  'south korea': { code: 'KR', flag: '🇰🇷', full: 'South Korea' },
  'kr': { code: 'KR', flag: '🇰🇷', full: 'South Korea' },
  'thailand': { code: 'TH', flag: '🇹🇭', full: 'Thailand' },
  'philippines': { code: 'PH', flag: '🇵🇭', full: 'Philippines' },
  'vietnam': { code: 'VN', flag: '🇻🇳', full: 'Vietnam' },
  'brazil': { code: 'BR', flag: '🇧🇷', full: 'Brazil' },
  'argentina': { code: 'AR', flag: '🇦🇷', full: 'Argentina' },
  'south africa': { code: 'ZA', flag: '🇿🇦', full: 'South Africa' },
  'nigeria': { code: 'NG', flag: '🇳🇬', full: 'Nigeria' },
  'egypt': { code: 'EG', flag: '🇪🇬', full: 'Egypt' },
};

function getCountryShortInfo(val?: string) {
  if (!val || !val.trim()) {
    return { code: 'BD', flag: '🇧🇩', full: 'Bangladesh' };
  }
  const key = val.trim().toLowerCase();
  if (COUNTRY_SHORT_CODES[key]) {
    return COUNTRY_SHORT_CODES[key];
  }
  const countryObj = COUNTRIES.find(c => c.name.toLowerCase() === key || c.code.toLowerCase() === key);
  if (countryObj) {
    const code = countryObj.code === 'GB' ? 'UK' : (countryObj.code === 'AE' ? 'UAE' : countryObj.code);
    return { code, flag: countryObj.flag, full: countryObj.name };
  }
  const uppercase = val.trim().toUpperCase();
  return { code: uppercase.length <= 4 ? uppercase : uppercase.slice(0, 3), flag: '🌐', full: val };
}

// Geography mapping imported from App context structurally
const BD_GEOGRAPHY: Record<string, Record<string, string[]>> = {
  "Barishal": {
    "Barishal": ["Barishal Sadar", "Bakerganj", "Babuganj", "Muladi", "Banaripara", "Wazirpur", "Gournadi", "Agailjhara", "Mehendiganj", "Hizla"],
    "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
    "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Galachipa", "Kalapara", "Mirzaganj", "Dumki", "Dashmina", "Rangabali"],
    "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Indurkani"],
    "Barguna": ["Barguna Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"],
    "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"]
  },
  "Chattogram": {
    "Chattogram": ["Chittagong Sadar", "Hathazari", "Patiya", "Raozan", "Sandwip", "Satkania", "Sitamara", "Mirsharai", "Anwara", "Boalkhali", "Banshkhali", "Chandanaish", "Fatikchhari", "Lohagara"],
    "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua", "Kutubdia"],
    "Cumilla": ["Cumilla Sadar", "Barura", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Nangalkot", "Titas", "Burichang", "Brahmanpara", "Manohargonj"],
    "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Bijoynagar", "Akhaura"],
    "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonavazi", "Fulgazi"],
    "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companyganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
    "Lakshmipur": ["Lakshmipur Sadar", "Ramganj", "Ramgati", "Raypur", "Kamalnagar"],
    "Chandpur": ["Chandpur Sadar", "Faridganj", "Hajiganj", "Haimchar", "Kachua", "Matlab South", "Matlab North", "Shahrasti"],
    "Rangamati": ["Rangamati Sadar", "Bagaichhari", "Barkal", "Langadu", "Naniarchar", "Rajasthali"],
    "Bandarban": ["Bandarban Sadar", "Alikadam", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
    "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"]
  },
  "Dhaka": {
    "Dhaka": ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar", "Dhaka City (North/South)"],
    "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
    "Narayanganj": ["Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon"],
    "Tangail": ["Tangail Sadar", "Basail", "Bhuapur", "Delduar", "Gopalpur", "Ghatail", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Dhanbari"],
    "Faridpur": ["Faridpur Sadar", "Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Madukhali", "Nagarkanda", "Sadarpur", "Saltha"],
    "Manikganj": ["Manikganj Sadar", "Singair", "Shibalaya", "Saturia", "Harirampur", "Gheor", "Daulatpur"],
    "Munshiganj": ["Munshiganj Sadar", "Gazaria", "Lohajang", "Sirajdikhan", "Sreenagar", "Tongibari"],
    "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
    "Rajbari": ["Rajbari Sadar", "Baliakandi", "Goalandaghat", "Pangsha", "Kalukhali"],
    "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
    "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibchar"],
    "Shariatpur": ["Shariatpur Sadar", "Damudya", "Gosairhat", "Naria", "Zajira", "Bhedarganj"],
    "Kishoreganj": ["Kishoreganj Sadar", "Bhairab", "Bajitpur", "Karimgonj", "Katiadi", "Kuliarchar", "Nikli", "Tarail", "Itna", "Mithamoin", "Astagram"]
  },
  "Khulna": {
    "Khulna": ["Khulna Sadar", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Terokhada"],
    "Jashore": ["Jashore Sadar", "Abhaynagar", "Bagherpara", "Chougachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
    "Kushtia": ["Kushtia Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Daulatpur", "Bheramara"],
    "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
    "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
    "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
    "Jhenaidah": ["Jhenaidah Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
    "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
    "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
    "Narail": ["Narail Sadar", "Kalia", "Lohagara"]
  },
  "Mymensingh": {
    "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Gaffargaon", "Dhobaura"],
    "Jamalpur": ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Isampur", "Madarganj", "Melandaha", "Sarishabari"],
    "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Madan", "Mohanganj", "Purbadhala", "Kendua"],
    "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"]
  },
  "Rajshahi": {
    "Rajshahi": ["Rajshahi Sadar", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"],
    "Bogura": ["Bogura Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Sherpur", "Shibganj", "Sonatala"],
    "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
    "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
    "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
    "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
    "Chapainawabganj": ["Chapainawabganj Sadar", "Bholahat", "Gomastapur", "Nachole", "Shibganj"],
    "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Rayganj", "Shahjadpur", "Tarash", "Ullahpara"]
  },
  "Rangpur": {
    "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
    "Dinajpur": ["Dinajpur Sadar", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khanshama", "Nawabganj", "Parbatipur"],
    "Gaibandha": ["Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj", "Phulchhari"],
    "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Chilmari", "Phulbari", "Nageshwari", "Rajarhat", "Rajibpur", "Rowmari", "Ulipur"],
    "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"],
    "Nilphamari": ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Saidpur"],
    "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
    "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"]
  },
  "Sylhet": {
    "Sylhet": ["Sylhet Sadar", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Zakiganj", "Dakshin Surma"],
    "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal", "Juri"],
    "Habiganj": ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj"],
    "Sunamganj": ["Sunamganj Sadar", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur", "Shantiganj"]
  }
};

interface PlayersCountAdminProps {
  onBack: () => void;
}

export function PlayersCountAdmin({ onBack }: PlayersCountAdminProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Total Players filters
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('All');
  const [totalSearchQuery, setTotalSearchQuery] = useState('');

  // New Players filters
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('month');
  
  // Date values initialized with 2026-08-07 values (matching metadata)
  const [selectedDay, setSelectedDay] = useState<string>('2026-08-07');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [newSearchQuery, setNewSearchQuery] = useState('');

  // Fetch all players from the Firestore db
  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      try {
        const usersCol = collection(db, 'users');
        const snap = await getDocs(usersCol);
        const fetchedUsers: any[] = [];
        snap.forEach((docSnap) => {
          fetchedUsers.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching players for admin report:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  // Compute country-wise registered counts (ONLY countries with registered players > 0)
  const countryCountsMap: Record<string, { code: string; flag: string; full: string; count: number }> = {};
  users.forEach((u) => {
    const info = getCountryShortInfo(u.country);
    if (!countryCountsMap[info.code]) {
      countryCountsMap[info.code] = {
        code: info.code,
        flag: info.flag,
        full: info.full,
        count: 0
      };
    }
    countryCountsMap[info.code].count += 1;
  });

  // Filter out countries with 0 registered players, sorted by player count descending
  const countryCountsList = Object.values(countryCountsMap)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // Safe helper to convert any Firestore/JSON string timestamp to a Date object
  const getGamerDate = (user: any): Date | null => {
    if (!user.createdAt) return null;
    if (typeof user.createdAt === 'string') {
      return new Date(user.createdAt);
    }
    if (user.createdAt.toDate && typeof user.createdAt.toDate === 'function') {
      return user.createdAt.toDate();
    }
    if (user.createdAt.seconds) {
      return new Date(user.createdAt.seconds * 1000);
    }
    return new Date(user.createdAt);
  };

  // 1. Total Players Filtering Logic
  const filteredTotalPlayers = users.filter((user) => {
    // Country filter match
    if (selectedCountry !== 'All') {
      const cInfo = getCountryShortInfo(user.country);
      if (cInfo.code !== selectedCountry && cInfo.full.toLowerCase() !== selectedCountry.toLowerCase()) {
        return false;
      }
    }

    // Geo match
    if (selectedDivision !== 'All' && user.division !== selectedDivision) return false;
    if (selectedDistrict !== 'All' && user.district !== selectedDistrict) return false;
    if (selectedUpazila !== 'All' && user.upazila !== selectedUpazila) return false;

    // Search query match
    if (totalSearchQuery.trim()) {
      const q = totalSearchQuery.toLowerCase();
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const mobile = (user.mobile || '').toLowerCase();
      const gameUid = (user.gamingUid || '').toLowerCase();
      const countryStr = (user.country || 'Bangladesh').toLowerCase();
      return name.includes(q) || email.includes(q) || mobile.includes(q) || gameUid.includes(q) || countryStr.includes(q);
    }

    return true;
  });

  // 2. New Players Filtering Logic
  const filteredNewPlayers = users.filter((user) => {
    const uDate = getGamerDate(user);
    if (!uDate) return false;

    const uYear = uDate.getFullYear();
    const uMonth = uDate.getMonth() + 1; // 1-indexed (Jan = 1, Dec = 12)
    const uDay = uDate.getDate();

    if (periodType === 'day') {
      if (!selectedDay) return false;
      const targetDate = new Date(selectedDay);
      if (isNaN(targetDate.getTime())) return false;
      
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth() + 1;
      const tDay = targetDate.getDate();

      if (uYear !== tYear || uMonth !== tMonth || uDay !== tDay) return false;
    } 
    else if (periodType === 'month') {
      if (uYear !== selectedYear || uMonth !== selectedMonth) return false;
    } 
    else if (periodType === 'year') {
      if (uYear !== selectedYear) return false;
    }

    // Search query match inside the filtered new players set
    if (newSearchQuery.trim()) {
      const q = newSearchQuery.toLowerCase();
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const mobile = (user.mobile || '').toLowerCase();
      const gameUid = (user.gamingUid || '').toLowerCase();
      return name.includes(q) || email.includes(q) || mobile.includes(q) || gameUid.includes(q);
    }

    return true;
  });

  // Handle geography dropdown changes securely
  const handleDivisionChange = (div: string) => {
    setSelectedDivision(div);
    setSelectedDistrict('All');
    setSelectedUpazila('All');
  };

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedUpazila('All');
  };

  // Available districts based on division selection
  const districtsInSelectedDivision = selectedDivision !== 'All' && BD_GEOGRAPHY[selectedDivision]
    ? Object.keys(BD_GEOGRAPHY[selectedDivision])
    : [];

  // Available upazilas based on district selection
  const upazilasInSelectedDistrict = selectedDivision !== 'All' && selectedDistrict !== 'All' && BD_GEOGRAPHY[selectedDivision]?.[selectedDistrict]
    ? BD_GEOGRAPHY[selectedDivision][selectedDistrict]
    : [];

  // Months lists
  const MONTHS_LIST = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const YEARS_LIST = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="w-full bg-[#04060e] border border-cyan-500/10 rounded-2xl overflow-hidden font-sans text-slate-100 flex flex-col">
      
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/40 via-slate-900/40 to-transparent border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-lg text-cyan-400 hover:text-white transition-all cursor-pointer"
            title="Back to Admin Console"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Players Registry & Counts
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Filter, monitor, and query real-time player statistics.</p>
          </div>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-bold font-mono text-white">
            Total Database: {users.length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Loading user registry...</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6">

          {/* SECTION 0: REGISTERED PLAYERS BY COUNTRY (SHORT FORM & COUNTS) */}
          <div className="bg-[#070b18]/80 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 flex flex-col space-y-3.5 shadow-[0_0_20px_rgba(6,182,212,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/25 text-cyan-400">
                  <Globe className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Registered Players by Country
                  </h3>
                  <p className="text-[9.5px] text-slate-400">Real-time counts of registered player accounts per active country</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full font-mono">
                  {countryCountsList.length} {countryCountsList.length === 1 ? 'Country' : 'Countries'} Active
                </span>
                {selectedCountry !== 'All' && (
                  <button
                    onClick={() => setSelectedCountry('All')}
                    className="text-[9.5px] font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                  >
                    Clear Filter ({selectedCountry})
                  </button>
                )}
              </div>
            </div>

            {/* Country Stats Badges Grid */}
            {countryCountsList.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs font-sans">
                No registered player accounts found in database.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                {countryCountsList.map((item) => {
                  const isSelected = selectedCountry === item.code;
                  return (
                    <button
                      key={item.code}
                      onClick={() => setSelectedCountry(isSelected ? 'All' : item.code)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-cyan-500/40'
                      }`}
                      title={`Click to filter players from ${item.full}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{item.flag}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-black tracking-wider text-white font-mono block">
                            {item.code}
                          </span>
                          <span className="text-[8.5px] text-slate-400 truncate block font-sans">
                            {item.full}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-cyan-400 font-mono block">
                          {item.count}
                        </span>
                        <span className="text-[7.5px] text-slate-500 uppercase tracking-tight block">
                          {item.count === 1 ? 'Player' : 'Players'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid for Two Main Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* SECTION 1: TOTAL PLAYERS WITH GEOGRAPHY FILTER */}
            <div className="bg-[#070b18]/60 border border-cyan-500/15 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Total Players Metric</h3>
                    <p className="text-[9px] text-slate-400">Filter by Country & BD geography hierarchy</p>
                  </div>
                </div>
                <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono">
                  Matched: {filteredTotalPlayers.length}
                </span>
              </div>

              {/* Geographic selectors */}
              <div className="flex flex-row items-center gap-2.5 overflow-x-auto whitespace-nowrap pb-2 flex-nowrap scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent scroll-smooth select-none">
                
                {/* Country selector */}
                <div className="space-y-1 min-w-[120px] flex-1 shrink-0">
                  <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Country</label>
                  <div className="relative">
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all"
                    >
                      <option value="All">All Countries</option>
                      {countryCountsList.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.count})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Division */}
                <div className="space-y-1 min-w-[120px] flex-1 shrink-0">
                  <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Division</label>
                  <div className="relative">
                    <select
                      value={selectedDivision}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all"
                    >
                      <option value="All">All Divisions</option>
                      {Object.keys(BD_GEOGRAPHY).map((div) => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* District */}
                <div className="space-y-1 min-w-[120px] flex-1 shrink-0">
                  <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">District</label>
                  <div className="relative">
                    <select
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={selectedDivision === 'All'}
                      className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="All">All Districts</option>
                      {districtsInSelectedDivision.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Upazila */}
                <div className="space-y-1 min-w-[120px] flex-1 shrink-0">
                  <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Upazila</label>
                  <div className="relative">
                    <select
                      value={selectedUpazila}
                      onChange={(e) => setSelectedUpazila(e.target.value)}
                      disabled={selectedDistrict === 'All' || selectedDivision === 'All'}
                      className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="All">All Upazilas</option>
                      {upazilasInSelectedDistrict.map((upz) => (
                        <option key={upz} value={upz}>{upz}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Matched player list search */}
              <div className="relative flex items-center bg-slate-950 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-all px-2.5">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
                <input
                  type="text"
                  placeholder="Search matched players by Name, Email, Country, UID..."
                  value={totalSearchQuery}
                  onChange={(e) => setTotalSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none py-1.5 font-sans"
                />
              </div>

              {/* Player Listing Block */}
              <div className="bg-slate-950/60 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[220px]">
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 select-none font-mono">
                  <span>Player Info</span>
                  <span>Country & Region</span>
                  <span className="text-right">Mobile & UID</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar">
                  {filteredTotalPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                      <p className="text-[10px] font-medium font-sans">No matching players found.</p>
                    </div>
                  ) : (
                    filteredTotalPlayers.map((u) => {
                      const cInfo = getCountryShortInfo(u.country);
                      return (
                        <div key={u.id} className="grid grid-cols-3 gap-2 px-3 py-2 text-[10px] items-center hover:bg-white/[0.02] transition-colors">
                          <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <p className="font-extrabold text-slate-100 truncate">{u.displayName || 'Unnamed'}</p>
                              <span className="px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[8px] font-bold border border-cyan-500/30 shrink-0">
                                ID: {u.playvearId || '----'}
                              </span>
                            </div>
                            <p className="text-[8.5px] text-slate-500 font-mono truncate mt-0.5">{u.email}</p>
                          </div>
                          <div className="min-w-0 text-slate-300 pr-1 leading-normal font-sans">
                            <p className="truncate text-[9.5px] flex items-center gap-1 font-mono">
                              <span>{cInfo.flag}</span>
                              <span className="font-bold text-cyan-400">[{cInfo.code}]</span>
                              <span className="text-slate-300 font-sans truncate">{u.division || 'No Division'}</span>
                            </p>
                            <p className="text-[8.5px] text-slate-500 truncate mt-0.5">
                              {u.district ? `${u.district}, ${u.upazila || ''}` : 'Region set pending'}
                            </p>
                          </div>
                          <div className="min-w-0 text-right font-mono">
                            <p className="text-cyan-400 font-semibold">{u.mobile || 'No Mobile'}</p>
                            <p className="text-[8px] text-slate-500 truncate mt-0.5">UID: {u.gamingUid || 'Not Set'}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* SECTION 2: NEW PLAYERS WITH REGISTRATION TIMELINE */}
            <div className="bg-[#070b18]/60 border border-cyan-500/15 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">New Players Metric</h3>
                    <p className="text-[9px] text-slate-400">Filter registrations by timeline</p>
                  </div>
                </div>
                <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono">
                  Registrations: {filteredNewPlayers.length}
                </span>
              </div>

              {/* Timeline filters in a single row */}
              <div className="flex flex-row items-center gap-3 overflow-x-auto whitespace-nowrap pb-2 flex-nowrap scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent scroll-smooth select-none">
                
                {/* Period Type Selection */}
                <div className="space-y-1 min-w-[160px] shrink-0">
                  <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Timeline Mode</label>
                  <div className="flex gap-1 p-0.5 bg-slate-950 border border-white/5 rounded-xl">
                    {(['day', 'month', 'year'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPeriodType(type)}
                        className={`flex-1 py-1 text-[9px] uppercase font-bold tracking-wider rounded-lg transition-all text-center ${
                          periodType === type 
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.1)]' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Input */}
                {periodType === 'day' && (
                  <div className="space-y-1 min-w-[150px] flex-1 shrink-0">
                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Select Target Day</label>
                    <input
                      type="date"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium font-mono cursor-pointer transition-all"
                    />
                  </div>
                )}

                {/* Month Dropdown */}
                {periodType === 'month' && (
                  <div className="space-y-1 min-w-[120px] flex-1 shrink-0">
                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Month</label>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all"
                      >
                        {MONTHS_LIST.map((m) => (
                          <option key={m.value} value={m.value}>{m.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Year Dropdown */}
                {(periodType === 'month' || periodType === 'year') && (
                  <div className="space-y-1 min-w-[100px] flex-1 shrink-0">
                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Year</label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer appearance-none transition-all"
                      >
                        {YEARS_LIST.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                )}

              </div>

              {/* Matched list search */}
              <div className="relative flex items-center bg-slate-950 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-all px-2.5">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
                <input
                  type="text"
                  placeholder="Search registered players by Name, Email, UID..."
                  value={newSearchQuery}
                  onChange={(e) => setNewSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none py-1.5 font-sans"
                />
              </div>

              {/* Registration List Block */}
              <div className="bg-slate-950/60 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[220px]">
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 select-none font-mono">
                  <span>Player Info</span>
                  <span>Registered Date</span>
                  <span className="text-right">Mobile & UID</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar">
                  {filteredNewPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                      <p className="text-[10px] font-medium font-sans">No matching registrations in this period.</p>
                    </div>
                  ) : (
                    filteredNewPlayers.map((u) => {
                      const uDate = getGamerDate(u);
                      const formattedDate = uDate 
                        ? uDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Unknown Date';
                      
                      return (
                        <div key={u.id} className="grid grid-cols-3 gap-2 px-3 py-2 text-[10px] items-center hover:bg-white/[0.02] transition-colors">
                          <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <p className="font-extrabold text-slate-100 truncate">{u.displayName || 'Unnamed'}</p>
                              <span className="px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[8px] font-bold border border-cyan-500/30 shrink-0">
                                ID: {u.playvearId || '----'}
                              </span>
                            </div>
                            <p className="text-[8.5px] text-slate-500 font-mono truncate mt-0.5">{u.email}</p>
                          </div>
                          <div className="min-w-0 text-slate-300 pr-1 leading-normal font-sans">
                            <p className="truncate text-[9.5px] text-slate-300">{formattedDate}</p>
                            <p className="text-[8.5px] text-slate-500 truncate mt-0.5">
                              {uDate ? uDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                          <div className="min-w-0 text-right font-mono">
                            <p className="text-cyan-400 font-semibold">{u.mobile || 'No Mobile'}</p>
                            <p className="text-[8px] text-slate-500 truncate mt-0.5">UID: {u.gamingUid || 'Not Set'}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Combined Visual Insights Banner */}
          <div className="bg-gradient-to-r from-cyan-950/20 via-slate-900/35 to-transparent border border-cyan-500/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-cyan-300 uppercase tracking-widest font-mono">Statistical Summary</h4>
              <p className="text-[10px] text-slate-400 max-w-xl leading-normal">
                These numbers help monitor tournament eligibility. Regional filters prevent out-of-boundary matching, and registration history allows super admins to track real-time organic growth.
              </p>
            </div>

            <div className="flex gap-4 shrink-0 font-mono text-center">
              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-2.5 min-w-[100px]">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Global Filter Match</span>
                <span className="text-lg font-black text-cyan-400 block mt-1">{filteredTotalPlayers.length}</span>
              </div>
              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-2.5 min-w-[100px]">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Timeline Match</span>
                <span className="text-lg font-black text-cyan-400 block mt-1">{filteredNewPlayers.length}</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
