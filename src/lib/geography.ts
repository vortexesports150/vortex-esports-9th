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
export default BD_GEOGRAPHY;
