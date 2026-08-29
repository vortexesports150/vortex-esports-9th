const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = {
  "টোকেন (Tokens)": "Tokens",
  "১ম বিজয়ী / Booyah Champion": "1st Place / Booyah Champion",
  "২য় বিজয়ী / Runner Up": "2nd Place / Runner Up",
  "১ম বিজয়ী (Booyah)": "1st Place (Booyah)",
  "২য় বিজয়ী (Runner-Up)": "2nd Place (Runner-Up)",
  "প্রতি কিল / Per Kill Reward": "Per Kill Reward",
  "প্রতি কিল (Per Kill)": "Per Kill",
  "লিডারবোর্ড ও স্ক্রিনশট দেখুন (View Results Table)": "View Results Table",
  "ফলাফল ও বিবরণ দেখতে ক্লিক করুন (Click to View Results)": "Click to View Results",
  "ক্রিয়েট ম্যাচ": "Create Match",
  "আপকামিং ম্যাচ": "Upcoming Match",
  "অনগোয়িং ম্যাচ": "Ongoing Match",
  "ম্যাচ হিস্ট্রি": "Match History",
  "নির্ধারণ হবে।": "",
  "শুধুমাত্র এভারেজ র‍্যাংকিং এবং পয়েন্টে শীর্ষ ৪৮ জন প্লেয়ার এতে জয়েন করতে পারবে।": "Only the Top 48 players in average ranking and points can join.",
  "এই নির্দিষ্ট তারিখ ও সময়ের মধ্যে সেরা ৪৮ র্যাঙ্কিং নিশ্চিত করুন!": "Secure your Top 48 ranking within this specified date and time!",
  "ম্যাচ শুরু হওয়ার পর প্রতিটি অ্যাকশনের জন্য স্কোরবোর্ড পরিবর্তন হবে। নিম্নে বিস্তারিত নিয়মাবলী তুলে করা হলো:": "The scoreboard will change for each action after the match starts. The detailed rules are below:",
  "শত্রু পরাস্ত করার বিশেষ উপহার": "Special reward for defeating enemies",
  "হেলথ লেভেল": "Health Level",
  "ইকোনমি স্কোর": "Economy Score",
  "ম্যাচে কোনো কিল করতে না পারলে": "If you get zero kills in a match",
  "১ম স্থান অর্জনকারী দলের বুস্ট": "1st Place Team Boost",
  "২য় স্থান অর্জনকারী দলের বুস্ট": "2nd Place Team Boost",
  "রেজিস্টার করে ম্যাচে অংশ না নিলে": "If you register but do not participate",
  "১. ফেয়ারপ্লে সিস্টেম:": "1. Fairplay System:",
  "সমস্ত টুর্নামেন্ট আমাদের উন্নত অটোমেটেড ফেয়ারপ্লে এন্টি-চিট সিস্টেম দ্বারা নিরীক্ষণ করা হয়। হ্যাকিং বা ক্ষতিকারক কার্যকলাপ স্থায়ী অ্যাকাউন্ট ব্যান করতে পারে।": "All tournaments are monitored by our advanced automated fairplay anti-cheat system. Hacking or malicious activity will result in a permanent account ban.",
  "২. রুম আইডি ও পাসওয়ার্ড:": "2. Room ID & Password:",
  "ম্যাচ শুরু হওয়ার ১৫ মিনিট পূর্বে ম্যাচ ড্যাশবোর্ডে রুম আইডি এবং পাসওয়ার্ড প্রকাশ করা হবে। নির্ধারিত সময়ের পূর্বে অবশ্যই প্রবেশ করতে হবে।": "Room ID and password will be published on the match dashboard 15 minutes before the match starts. You must enter before the scheduled time.",
  "৩. এলিজিবিলিটি রিকোয়ারমেন্ট:": "3. Eligibility Requirements:",
  "জয়েন করার সময় চেক লিস্টের সমস্ত রিকোয়ারমেন্ট পূরণ করতে হবে। হেলথ ঘাটতি থাকলে ম্যাচ খেলতে দেওয়া হবে না।": "All requirements on the checklist must be met when joining. You will not be allowed to play if there is a health deficit.",
  "ফলাফল ঘোষিত (Completed)": "Results Announced (Completed)",
  "ম্যাপ (Map Location)": "Map Location",
  "শুরুর সময় (Time)": "Start Time",
  "গেম ক্যাটাগরি (Game)": "Game Category",
  "এন্ট্রি ফি (Entry Fee)": "Entry Fee",
  "কিল বাউন্টি (Per Kill)": "Kill Bounty",
  "মোট স্লট (Joined Slots)": "Total Slots (Joined)",
  "পুরস্কারের মেগা ড্যাশবোর্ড / MEGA PRIZE POOL DISPATCH": "MEGA PRIZE POOL DISPATCH"
};

for (const [key, value] of Object.entries(replacements)) {
  code = code.split(key).join(value);
}

// Remove any leftover Bengali characters
code = code.replace(/[\u0980-\u09FF]/g, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Done.");
