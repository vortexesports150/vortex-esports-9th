export interface BangladeshDivision {
  name: string;
  districts: string[];
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  {
    name: 'Dhaka',
    districts: ['Dhaka', 'Gazipur', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Faridpur', 'Gopalganj', 'Rajbari', 'Shariatpur', 'Tangail']
  },
  {
    name: 'Chattogram',
    districts: ['Chattogram', 'Cox\'s Bazar', 'Bandarban', 'Rangamati', 'Khagrachhari', 'Noakhali', 'Feni', 'Lakshmipur', 'Comilla', 'Chandpur', 'Brahmanbaria']
  },
  {
    name: 'Rajshahi',
    districts: ['Rajshahi', 'Bogra', 'Pabna', 'Natore', 'Naogaon', 'Nawabganj', 'Joypurhat', 'Sirajganj']
  },
  {
    name: 'Khulna',
    districts: ['Khulna', 'Bagerhat', 'Shatkhira', 'Jessore', 'Jhenaidah', 'Magura', 'Narail', 'Kushtia', 'Meherpur', 'Chuadanga']
  },
  {
    name: 'Barisal',
    districts: ['Barisal', 'Bhogra', 'Barguna', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur']
  },
  {
    name: 'Sylhet',
    districts: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj']
  },
  {
    name: 'Rangpur',
    districts: ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon']
  },
  {
    name: 'Mymensingh',
    districts: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur']
  }
];

export const ALL_BANGLADESH_DISTRICTS: string[] = BANGLADESH_DIVISIONS.flatMap(d => d.districts).sort();

export const BANGLADESH_UPAZILAS_BY_DISTRICT: Record<string, string[]> = {
  'Dhaka': ['Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar', 'Mirpur', 'Uttara', 'Dhanmondi', 'Gulshan', 'Mohammadpur', 'Tejgaon', 'Badda', 'Khilgaon', 'Jatrabari', 'Demra'],
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur'],
  'Kishoreganj': ['Astagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kishoreganj Sadar', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
  'Narayanganj': ['Araihazar', 'Bandar', 'Narayanganj Sadar', 'Rupganj', 'Sonargaon'],
  'Narsingdi': ['Belabo', 'Monohardi', 'Narsingdi Sadar', 'Palash', 'Raipura', 'Shibpur'],
  'Tangail': ['Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Tangail Sadar'],
  'Chattogram': ['Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda', 'Kotwali', 'Panchlaish', 'Halishahar', 'Double Mooring'],
  'Cox\'s Bazar': ['Chakaria', 'Cox\'s Bazar Sadar', 'Kutubdia', 'Maheshkhali', 'Ramu', 'Teknaf', 'Ukhia', 'Pekua'],
  'Feni': ['Chhagalnaiya', 'Daganbhuiyan', 'Feni Sadar', 'Fulgazi', 'Parshuram', 'Sonagazi'],
  'Noakhali': ['Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Kabirhat', 'Noakhali Sadar', 'Senbagh', 'Subarnachar'],
  'Comilla': ['Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chouddagram', 'Comilla Sadar', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Monohargonj', 'Meghna', 'Muradnagar', 'Nangalkot', 'Titas'],
  'Brahmanbaria': ['Akhaura', 'Ashuganj', 'Banchharampur', 'Brahmanbaria Sadar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'],
  'Sylhet': ['Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Sylhet Sadar', 'Zakiganj'],
  'Moulvibazar': ['Barlekha', 'Kamalganj', 'Kulaura', 'Moulvibazar Sadar', 'Rajnagar', 'Sreemangal', 'Juri'],
  'Rajshahi': ['Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore', 'Boalia', 'Rajpara'],
  'Bogra': ['Adamdighi', 'Bogra Sadar', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatola'],
  'Pabna': ['Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar', 'Pabna Sadar'],
  'Khulna': ['Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada', 'Khulna Sadar', 'Sonadanga', 'Khalishpur'],
  'Jessore': ['Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Jessore Sadar', 'Manirampur', 'Sharsha'],
  'Barisal': ['Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Barisal Sadar', 'Mehendiganj', 'Muladi', 'Wazirpur'],
  'Rangpur': ['Badarganj', 'Gangachhara', 'Kaunia', 'Rangpur Sadar', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
  'Dinajpur': ['Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Phulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Dinajpur Sadar', 'Nawabganj', 'Parbatipur'],
  'Mymensingh': ['Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Mymensingh Sadar', 'Nandail', 'Phulpur', 'Trishal', 'Tara Khanda']
};
