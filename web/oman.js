/* Oman merchant directory + bank SMS parser.  Works in the browser (window.Oman) and Node (module.exports). */
(function (root) {
  'use strict';

  /* ---------- Categories ----------
     kind: need / want / neutral (used by the advice engine)
     bucket: operating | investment  (which budget it counts against) */
  const CATEGORIES = [
    { id: 'groceries',   name: 'Groceries',            icon: '🛒', color: '#2f9e6b', kind: 'need',    bucket: 'operating' },
    { id: 'food',        name: 'Dining & cafés',       icon: '🍽️', color: '#e8a21a', kind: 'want',    bucket: 'operating' },
    { id: 'fuel',        name: 'Fuel',                 icon: '⛽', color: '#5b6fd6', kind: 'need',    bucket: 'operating' },
    { id: 'bills',       name: 'Bills & telecom',      icon: '💡', color: '#d9534f', kind: 'need',    bucket: 'operating' },
    { id: 'housing',     name: 'Rent & housing',       icon: '🏠', color: '#8a6d3b', kind: 'need',    bucket: 'operating' },
    { id: 'transport',   name: 'Transport',            icon: '🚕', color: '#2b8fd6', kind: 'need',    bucket: 'operating' },
    { id: 'health',      name: 'Health & pharmacy',    icon: '💊', color: '#1aa6a6', kind: 'need',    bucket: 'operating' },
    { id: 'education',   name: 'Education',            icon: '🎓', color: '#9b59d0', kind: 'need',    bucket: 'operating' },
    { id: 'insurance',   name: 'Insurance',            icon: '🛡️', color: '#607d8b', kind: 'need',    bucket: 'operating' },
    { id: 'government',  name: 'Government & fees',    icon: '🏛️', color: '#7d8b99', kind: 'need',    bucket: 'operating' },
    { id: 'shopping',    name: 'Shopping',             icon: '🛍️', color: '#e0559a', kind: 'want',    bucket: 'operating' },
    { id: 'entertain',   name: 'Entertainment',        icon: '🎬', color: '#7e57c2', kind: 'want',    bucket: 'operating' },
    { id: 'travel',      name: 'Travel & hotels',      icon: '✈️', color: '#0fa3d9', kind: 'want',    bucket: 'operating' },
    { id: 'cash',        name: 'Cash withdrawal',      icon: '🏧', color: '#9aa4ad', kind: 'neutral', bucket: 'operating' },
    { id: 'transfer',    name: 'Transfers sent',       icon: '🔁', color: '#78909c', kind: 'neutral', bucket: 'operating' },
    { id: 'investment',  name: 'Investment & savings', icon: '📈', color: '#0b7a5a', kind: 'invest',  bucket: 'investment' },
    { id: 'other',       name: 'Other',                icon: '📦', color: '#b0b7be', kind: 'neutral', bucket: 'operating' },
    { id: 'salary',      name: 'Salary',               icon: '💰', color: '#22a05a', income: true },
    { id: 'otherIncome', name: 'Other income',         icon: '📥', color: '#7cb342', income: true },
  ];
  const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.id === 'other');

  /* ---------- Merchant directory (Oman) ----------
     [display name, category, ...aliases]  (aliases are matched case-insensitively, punctuation ignored) */
  const M = (name, cat, ...aliases) => ({ name, cat, aliases: [name, ...aliases] });
  const MERCHANTS = [
    /* Groceries & hypermarkets */
    M('Lulu Hypermarket', 'groceries', 'lulu', 'lulu hyper', 'lulu express', 'lulu centre', 'lulu group', 'لولو'),
    M('Carrefour', 'groceries', 'carrefour', 'maf carrefour', 'majid al futtaim hyper', 'كارفور'),
    M('The Sultan Center', 'groceries', 'sultan center', 'sultan centre', 'tsc oman', 'tsc muscat', 'سلطان سنتر'),
    M('Nesto Hypermarket', 'groceries', 'nesto', 'نستو'),
    M('Al Fair Supermarket', 'groceries', 'al fair', 'alfair', 'al fair supermarket', 'الفير'),
    M('Mark & Save', 'groceries', 'mark and save', 'mark save'),
    M('KM Trading', 'groceries', 'km trading', 'k m trading', 'كي ام'),
    M('Ramez', 'groceries', 'ramez', 'ramez hypermarket'),
    M('Taza Market', 'groceries', 'taza', 'taza market'),
    M('Safeer Market', 'groceries', 'safeer', 'safeer market'),
    M('Zakher Mart', 'groceries', 'zakher', 'zakher mart'),
    M('Grand Hypermarket', 'groceries', 'grand hyper', 'grand hypermarket'),
    M('Hyper Al Fair', 'groceries', 'hyper al fair'),
    M('Muscat Hypermarket', 'groceries', 'muscat hypermarket', 'muscat hyper'),
    M('Spar', 'groceries', 'spar oman', 'spar muscat', 'spar supermarket'),
    M('Fresh Market', 'groceries', 'fresh market oman', 'fresh mart'),
    M('Al Maya', 'groceries', 'al maya', 'almaya'),
    M('Choithram', 'groceries', 'choithram'),
    M('Supermarket / Grocery', 'groceries', 'supermarket', 'hypermarket', 'grocery', 'groceries', 'mini market', 'minimarket', 'بقالة', 'سوبرماركت', 'هايبر ماركت'),
    M('Oman Fisheries / Fish Market', 'groceries', 'fish market', 'fisheries', 'meat shop', 'butchery', 'bakery', 'مخبز'),

    /* Dining, cafés & delivery */
    M('Starbucks', 'food', 'starbucks', 'ستاربكس'),
    M('Costa Coffee', 'food', 'costa coffee', 'costa'),
    M('Tim Hortons', 'food', 'tim hortons', 'tim horton'),
    M('Dunkin', 'food', 'dunkin', 'dunkin donuts'),
    M("McDonald's", 'food', 'mcdonalds', 'mcdonald', 'mc donalds', 'ماكدونالدز'),
    M('KFC', 'food', 'kfc', 'kentucky fried', 'كنتاكي'),
    M("Hardee's", 'food', 'hardees', 'hardee', 'هارديز'),
    M('Burger King', 'food', 'burger king', 'برجر كينج'),
    M('Pizza Hut', 'food', 'pizza hut', 'بيتزا هت'),
    M("Domino's Pizza", 'food', 'dominos', 'domino'),
    M("Papa John's", 'food', 'papa johns', 'papa john'),
    M('Subway', 'food', 'subway'),
    M('Texas Chicken', 'food', 'texas chicken'),
    M('Popeyes', 'food', 'popeyes'),
    M('Baskin Robbins', 'food', 'baskin robbins', 'baskin'),
    M('Krispy Kreme', 'food', 'krispy kreme'),
    M('Cinnabon', 'food', 'cinnabon'),
    M('Shake Shack', 'food', 'shake shack'),
    M('Five Guys', 'food', 'five guys'),
    M('Kargeen Café', 'food', 'kargeen'),
    M('Mumtaz Mahal', 'food', 'mumtaz mahal'),
    M('Bin Ateeq', 'food', 'bin ateeq', 'bin atiq'),
    M('Turkish House', 'food', 'turkish house'),
    M('Automatic Restaurant', 'food', 'automatic restaurant', 'automatic rest'),
    M('Shakespeare & Co', 'food', 'shakespeare and co', 'shakespeare co'),
    M('Caribou Coffee', 'food', 'caribou'),
    M('The Coffee Bean', 'food', 'coffee bean'),
    M('Paul Bakery', 'food', 'paul bakery'),
    M('Café Bateel', 'food', 'bateel'),
    M('Talabat', 'food', 'talabat', 'طلبات'),
    M('Keeta', 'food', 'keeta'),
    M('Jahez', 'food', 'jahez', 'جاهز'),
    M('Noon Food', 'food', 'noon food'),
    M('Careem Food', 'food', 'careem food'),
    M('Restaurant / Café', 'food', 'restaurant', 'resto', 'cafe', 'café', 'coffee', 'coffe', 'grill', 'kitchen', 'shawarma', 'biryani', 'bbq', 'pizzeria', 'juice', 'sweets', 'مطعم', 'كافيه', 'مقهى', 'قهوة', 'حلويات'),

    /* Fuel */
    M('Shell', 'fuel', 'shell oman', 'shell station', 'shell select', 'shell'),
    M('Oman Oil (OOMCO)', 'fuel', 'oomco', 'oman oil marketing', 'oman oil', 'oil marketing', 'عمان للتسويق'),
    M('Al Maha Petroleum', 'fuel', 'al maha', 'almaha', 'al maha petroleum', 'المها'),
    M('Petrol Station', 'fuel', 'petrol', 'fuel', 'gas station', 'filling station', 'petrol station', 'محطة وقود', 'وقود', 'بنزين'),

    /* Telecom, utilities */
    M('Omantel', 'bills', 'omantel', 'oman telecommunications', 'عمانتل'),
    M('Ooredoo Oman', 'bills', 'ooredoo', 'اوريدو', 'أوريدو'),
    M('Vodafone Oman', 'bills', 'vodafone oman', 'vodafone'),
    M('Awasr', 'bills', 'awasr'),
    M('Renna Mobile', 'bills', 'renna'),
    M('Nama Electricity (MEDC)', 'bills', 'medc', 'muscat electricity', 'nama electricity', 'nama supply', 'nama pws', 'nama procurement', 'نماء'),
    M('Mazoon Electricity', 'bills', 'mazoon electricity', 'mazoon'),
    M('Majan Electricity', 'bills', 'majan electricity', 'majan'),
    M('Dhofar Power', 'bills', 'dhofar power', 'dpc'),
    M('Tanweer', 'bills', 'tanweer'),
    M('Nama Water', 'bills', 'nama water', 'water services'),
    M('Haya Water', 'bills', 'haya water', 'haya'),
    M('Diam Water', 'bills', 'diam'),
    M('Oman Broadband', 'bills', 'oman broadband', 'obc'),
    M('Utility Bill', 'bills', 'electricity', 'water bill', 'utility', 'bill payment', 'billpay', 'bill pay', 'كهرباء', 'مياه', 'فاتورة'),
    M('Thawani / Mobile Top-up', 'bills', 'top up', 'topup', 'recharge', 'prepaid'),

    /* Housing */
    M('Rent', 'housing', 'rent', 'landlord', 'lease', 'tenancy', 'ejar', 'إيجار', 'ايجار'),
    M('Service charges', 'housing', 'service charge', 'maintenance fee', 'hoa'),

    /* Transport */
    M('Mwasalat', 'transport', 'mwasalat', 'oman national transport', 'مواصلات'),
    M('OTaxi', 'transport', 'otaxi', 'o taxi'),
    M('Careem', 'transport', 'careem'),
    M('Uber', 'transport', 'uber'),
    M('Bolt', 'transport', 'bolt'),
    M('Taxi', 'transport', 'taxi', 'تاكسي'),
    M('Parking', 'transport', 'parking', 'مواقف'),
    M('Car service / garage', 'transport', 'garage', 'car wash', 'tyre', 'tire', 'auto service', 'workshop', 'مغسلة', 'كراج'),
    M('Hertz', 'transport', 'hertz'), M('Avis', 'transport', 'avis'), M('Budget Rent a Car', 'transport', 'budget rent'),
    M('Europcar', 'transport', 'europcar'), M('Thrifty', 'transport', 'thrifty'), M('Sixt', 'transport', 'sixt'),

    /* Malls & shopping */
    M('Muscat Grand Mall', 'shopping', 'muscat grand mall', 'mgm'),
    M('City Centre Muscat', 'shopping', 'city centre muscat', 'city center muscat', 'city centre', 'city center', 'ccm'),
    M('The Avenues Mall', 'shopping', 'avenues mall', 'oman avenues'),
    M('Mall of Oman', 'shopping', 'mall of oman'),
    M('Markaz Al Bahja', 'shopping', 'markaz al bahja', 'markaz bahja'),
    M('Salalah Gardens Mall', 'shopping', 'salalah gardens', 'dhofar mall'),
    M('Centrepoint', 'shopping', 'centrepoint', 'centerpoint', 'center point'),
    M('Max Fashion', 'shopping', 'max fashion', 'max store'),
    M('Home Centre', 'shopping', 'home centre', 'home center'),
    M('Splash', 'shopping', 'splash fashion', 'splash'),
    M('Lifestyle', 'shopping', 'lifestyle'),
    M('Babyshop', 'shopping', 'babyshop', 'baby shop'),
    M('Sharaf DG', 'shopping', 'sharaf dg', 'sharaf'),
    M('Emax', 'shopping', 'emax'),
    M('Extra', 'shopping', 'extra stores', 'extra electronics'),
    M('Jarir Bookstore', 'shopping', 'jarir'),
    M('IKEA', 'shopping', 'ikea', 'ايكيا'),
    M('ACE Hardware', 'shopping', 'ace hardware'),
    M('Homes R Us', 'shopping', 'homes r us'),
    M('Zara', 'shopping', 'zara', 'زارا'),
    M('H&M', 'shopping', 'h and m', 'h m', 'hm'),
    M('Mango', 'shopping', 'mango'),
    M('Marks & Spencer', 'shopping', 'marks and spencer', 'marks spencer', 'm s'),
    M('Next', 'shopping', 'next retail', 'next uk'),
    M('Nike', 'shopping', 'nike'), M('Adidas', 'shopping', 'adidas'),
    M('Sun & Sand Sports', 'shopping', 'sun and sand', 'sun sand sports'),
    M('Namshi', 'shopping', 'namshi'),
    M('Noon', 'shopping', 'noon com', 'noon.com', 'noon ae', 'noon shopping'),
    M('Amazon', 'shopping', 'amazon', 'amzn', 'أمازون'),
    M('Shein', 'shopping', 'shein'), M('Temu', 'shopping', 'temu'), M('AliExpress', 'shopping', 'aliexpress', 'ali express'),
    M('Trendyol', 'shopping', 'trendyol'),
    M('Apple Store', 'shopping', 'apple store', 'apple retail'),
    M('Joyalukkas', 'shopping', 'joyalukkas', 'joy alukkas'),
    M('Malabar Gold', 'shopping', 'malabar gold', 'malabar'),
    M('Damas Jewellery', 'shopping', 'damas'),
    M('Tanishq', 'shopping', 'tanishq'),
    M('Kalyan Jewellers', 'shopping', 'kalyan'),
    M('Amouage', 'shopping', 'amouage'), M('Ajmal Perfumes', 'shopping', 'ajmal'),
    M('Rasasi', 'shopping', 'rasasi'), M('Arabian Oud', 'shopping', 'arabian oud'),
    M('Mall / Store', 'shopping', 'mall', 'store', 'boutique', 'fashion', 'tailor', 'optical', 'jewellery', 'jewelry', 'gold', 'مول', 'متجر'),

    /* Health */
    M('Muscat Pharmacy', 'health', 'muscat pharmacy', 'مسقط للصيدلة'),
    M('Life Pharmacy', 'health', 'life pharmacy'),
    M('Badr Al Samaa', 'health', 'badr al samaa', 'badr alsamaa'),
    M('Aster Pharmacy / Hospital', 'health', 'aster'),
    M('Starcare Hospital', 'health', 'starcare'),
    M('Burjeel Oman', 'health', 'burjeel'),
    M('KIMS Oman Hospital', 'health', 'kims oman', 'kims'),
    M('Royal Hospital', 'health', 'royal hospital'),
    M('Muscat Private Hospital', 'health', 'muscat private hospital'),
    M('Al Hayat Hospital', 'health', 'al hayat'),
    M('Oasis Pharmacy', 'health', 'oasis pharmacy'),
    M('Pharmacy / Clinic', 'health', 'pharmacy', 'clinic', 'hospital', 'dental', 'medical', 'polyclinic', 'lab', 'صيدلية', 'عيادة', 'مستشفى'),

    /* Entertainment & subscriptions */
    M('VOX Cinemas', 'entertain', 'vox cinemas', 'vox', 'majid al futtaim cinemas'),
    M('Oman Cinema (Cineco)', 'entertain', 'cineco', 'oman cinema', 'grand cinemas', 'novo cinemas'),
    M('Netflix', 'entertain', 'netflix', 'نتفلكس'),
    M('Spotify', 'entertain', 'spotify'),
    M('Shahid', 'entertain', 'shahid'),
    M('Anghami', 'entertain', 'anghami'),
    M('YouTube Premium', 'entertain', 'youtube'),
    M('Disney+', 'entertain', 'disney'),
    M('Apple Services', 'entertain', 'apple com bill', 'itunes', 'apple.com/bill', 'apple music', 'icloud'),
    M('Google Play', 'entertain', 'google play', 'google *', 'google youtube'),
    M('PlayStation', 'entertain', 'playstation', 'psn'),
    M('Steam', 'entertain', 'steam'),
    M('Xbox', 'entertain', 'xbox'),
    M('Fun City / Park', 'entertain', 'fun city', 'amusement', 'water park', 'wonderland', 'bowling', 'gaming'),
    M('Gym / Fitness', 'entertain', 'gym', 'fitness', 'fitness first', 'gold gym', 'club', 'نادي'),

    /* Travel */
    M('Oman Air', 'travel', 'oman air', 'omanair', 'الطيران العماني'),
    M('SalamAir', 'travel', 'salamair', 'salam air', 'سلام ايرز'),
    M('Emirates', 'travel', 'emirates airline', 'emirates'),
    M('Qatar Airways', 'travel', 'qatar airways'),
    M('Etihad', 'travel', 'etihad'),
    M('flydubai', 'travel', 'flydubai', 'fly dubai'),
    M('Air Arabia', 'travel', 'air arabia'),
    M('Gulf Air', 'travel', 'gulf air'),
    M('Turkish Airlines', 'travel', 'turkish airlines'),
    M('Booking.com', 'travel', 'booking com', 'booking.com'),
    M('Airbnb', 'travel', 'airbnb'), M('Agoda', 'travel', 'agoda'), M('Expedia', 'travel', 'expedia'),
    M('Hotel', 'travel', 'hotel', 'resort', 'shangri la', 'grand hyatt', 'crowne plaza', 'radisson', 'hilton', 'marriott', 'chedi', 'bustan palace', 'anantara', 'millennium', 'sifawy', 'فندق'),
    M('Travel agency', 'travel', 'travel agency', 'travels', 'tours', 'visa fee'),

    /* Education */
    M('Sultan Qaboos University', 'education', 'sultan qaboos university', 'squ'),
    M('German University of Technology', 'education', 'gutech'),
    M('Muscat College', 'education', 'muscat college'),
    M('American School of Muscat', 'education', 'american school', 'asm'),
    M('British School Muscat', 'education', 'british school'),
    M('Indian School', 'education', 'indian school'),
    M('Udemy', 'education', 'udemy'), M('Coursera', 'education', 'coursera'),
    M('British Council', 'education', 'british council'),
    M('School / University', 'education', 'school', 'university', 'college', 'tuition', 'nursery', 'academy', 'institute', 'مدرسة', 'جامعة', 'كلية'),

    /* Insurance */
    M('Dhofar Insurance', 'insurance', 'dhofar insurance'),
    M('Oman United Insurance', 'insurance', 'oman united insurance', 'ouic'),
    M('Muscat Insurance', 'insurance', 'muscat insurance'),
    M('Takaful Oman', 'insurance', 'takaful'),
    M('National Life Insurance', 'insurance', 'national life'),
    M('Sukoon Insurance', 'insurance', 'sukoon'),
    M('Insurance', 'insurance', 'insurance', 'تأمين', 'تامين'),

    /* Government */
    M('Royal Oman Police', 'government', 'royal oman police', 'rop', 'police fine', 'traffic fine', 'شرطة عمان'),
    M('Ministry of Labour', 'government', 'ministry of labour', 'ministry of labor', 'mol'),
    M('Ministry of Commerce (MOCI)', 'government', 'moci', 'ministry of commerce'),
    M('Muscat Municipality', 'government', 'muscat municipality', 'municipality', 'بلدية'),
    M('Oman Post', 'government', 'oman post'),
    M('Oman Customs', 'government', 'customs'),
    M('Tejari / e-Gov', 'government', 'tejari', 'egov', 'e-gov', 'mushtarak'),
    M('Government fee', 'government', 'ministry', 'govt', 'government', 'registration fee', 'وزارة'),

    /* Cash & transfers */
    M('ATM Cash Withdrawal', 'cash', 'atm', 'cash withdrawal', 'cash wdl', 'cash advance', 'cdm withdrawal', 'سحب نقدي', 'صراف'),
    M('Mobile Payment / Transfer', 'transfer', 'mobile payment', 'mobile transfer', 'mobile money', 'fund transfer', 'ips transfer', 'instant payment', 'swift transfer', 'remittance', 'iban', 'حوالة', 'تحويل'),
    M('Exchange House', 'transfer', 'exchange', 'al zaabi', 'zaabi exchange', 'uae exchange', 'lulu exchange', 'western union', 'moneygram'),

    /* Investments & savings */
    M('Muscat Stock Exchange (MSX)', 'investment', 'muscat stock exchange', 'muscat securities market', 'msx', 'msm', 'mcd'),
    M('United Securities', 'investment', 'united securities'),
    M('Ubhar Capital', 'investment', 'ubhar capital', 'ubhar'),
    M('Bank Muscat Securities', 'investment', 'muscat securities', 'bm securities'),
    M('Mutual fund / Investment', 'investment', 'mutual fund', 'investment fund', 'sukuk', 'bond purchase', 'brokerage', 'securities', 'portfolio', 'investment', 'stocks', 'shares', 'gold bar', 'bullion', 'استثمار', 'أسهم', 'اسهم'),
    M('Savings / Term deposit', 'investment', 'savings account', 'term deposit', 'fixed deposit', 'saving goal', 'savings transfer', 'توفير', 'وديعة'),
    M('Binance', 'investment', 'binance'), M('eToro', 'investment', 'etoro'), M('Interactive Brokers', 'investment', 'interactive brokers'),

    /* Income */
    M('Salary', 'salary', 'salary', 'payroll', 'wps', 'wages', 'راتب', 'الراتب'),
    M('Refund / Reversal', 'otherIncome', 'refund', 'reversal', 'cashback', 'cash back', 'استرداد', 'استرجاع'),
  ];

  const BANKS = [
    ['Bank Muscat', /bank\s?muscat|بنك مسقط|\bBM\b/i],
    ['Meethaq (Bank Muscat Islamic)', /meethaq|ميثاق/i],
    ['National Bank of Oman', /national bank of oman|\bNBO\b|البنك الوطني العماني/i],
    ['Sohar International', /sohar\s?international|bank\s?sohar|صحار الدولي|بنك صحار/i],
    ['BankDhofar', /bank\s?dhofar|بنك ظفار|maisarah|ميسرة/i],
    ['Oman Arab Bank', /oman arab bank|\bOAB\b|البنك العربي العماني/i],
    ['Ahli Bank', /ahli\s?bank|البنك الأهلي|البنك الاهلي/i],
    ['Bank Nizwa', /bank\s?nizwa|بنك نزوى/i],
    ['Alizz Islamic Bank', /alizz|عالز|عليز/i],
    ['HSBC Oman', /hsbc/i],
    ['Standard Chartered', /standard chartered|\bSCB\b/i],
    ['Habib Bank', /habib bank|\bHBL\b/i],
    ['Oman Development Bank', /oman development bank|\bODB\b/i],
  ];

  /* ---------- helpers ---------- */
  const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  function normalizeDigits(s) {
    return String(s)
      .replace(/[٠-٩]/g, (d) => AR.indexOf(d))
      .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
      .replace(/٫/g, '.')
      .replace(/[٬،](?=\d{3})/g, ',');
  }
  const key = (s) => ' ' + String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';

  // Prebuild alias index, longest alias first
  const INDEX = [];
  MERCHANTS.forEach((m) => m.aliases.forEach((a) => INDEX.push({ k: key(a), m })));
  const isGeneric = (m) => /\/|^(?:Rent|Insurance|Taxi|Parking|Hotel|Service charges|Utility Bill|Petrol Station|Government fee|Travel agency)$/.test(m.name);
INDEX.forEach((e) => { e.g = isGeneric(e.m) ? 1 : 0; });
INDEX.sort((a, b) => a.g - b.g || b.k.length - a.k.length); // real brands win over generic words like "bill payment" 

  function matchMerchant(text, opts) {
    opts = opts || {};
    const k = key(text);
    for (const e of INDEX) {
      if (opts.minLen && e.k.trim().length < opts.minLen) continue;
      if (k.includes(e.k)) return e.m;
    }
    return null;
  }

  /* ---------- Currency / amount ---------- */
  const CUR = [
    [/\bOMR\b|\bR\.?\s?O\.?\b(?=\s*\d)|ر\.?\s?ع\.?|ريال\s?عماني|RIAL\s?OMANI/i, 'OMR'],
    [/\bAED\b|درهم/i, 'AED'], [/\bSAR\b/i, 'SAR'], [/\bUSD\b|\$/i, 'USD'], [/\bEUR\b|€/i, 'EUR'],
    [/\bGBP\b|£/i, 'GBP'], [/\bINR\b|₹/i, 'INR'], [/\bQAR\b/i, 'QAR'], [/\bKWD\b/i, 'KWD'], [/\bBHD\b/i, 'BHD'],
    [/\bPKR\b/i, 'PKR'], [/\bEGP\b/i, 'EGP'], [/\bJOD\b/i, 'JOD'],
  ];
  // approximate rates to OMR (editable by changing this table)
  const RATES = { OMR: 1, USD: 0.385, AED: 0.105, SAR: 0.1026, EUR: 0.42, GBP: 0.49, INR: 0.0046, QAR: 0.1057, KWD: 1.25, BHD: 1.02, PKR: 0.0014, EGP: 0.0079, JOD: 0.543 };
  const CUR_SRC = 'OMR|RO|R\\.O\\.?|RIAL\\s?OMANI|ر\\.?\\s?ع\\.?|ريال\\s?عماني|AED|SAR|USD|EUR|GBP|INR|QAR|KWD|BHD|PKR|EGP|JOD|\\$|€|£|₹';
  const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)';

  const BAL_RE = new RegExp(`(?:available\\s+|avail\\.?\\s+|avl\\.?\\s+|current\\s+)?(?:balance|bal\\.?)\\s*(?:is|:|=)?\\s*(?:${CUR_SRC})?\\s*${NUM}\\s*(?:${CUR_SRC})?|الرصيد(?:\\s*المتاح)?\\s*(?:هو|:)?\\s*(?:${CUR_SRC})?\\s*${NUM}|رصيدك[^\\d]{0,12}${NUM}`, 'ig');

  function findBalance(text) {
    BAL_RE.lastIndex = 0;
    const m = BAL_RE.exec(text);
    if (!m) return null;
    const n = m.slice(1).find((x) => x !== undefined);
    return n ? parseFloat(n.replace(/,/g, '')) : null;
  }
  function detectCurrency(text) {
    for (const [re, code] of CUR) if (re.test(text)) return code;
    return 'OMR';
  }
  function findAmount(text) {
    const t = text.replace(BAL_RE, ' ');
    const pats = [
      new RegExp(`(?:${CUR_SRC})\\s*${NUM}`, 'i'),
      new RegExp(`${NUM}\\s*(?:${CUR_SRC})`, 'i'),
      new RegExp(`(?:amount|amt|بمبلغ|مبلغ|قيمة)\\s*(?:of|:)?\\s*${NUM}`, 'i'),
    ];
    for (const p of pats) {
      const m = t.match(p);
      if (m) { const v = parseFloat(m[1].replace(/,/g, '')); if (isFinite(v) && v > 0) return v; }
    }
    return null;
  }

  /* ---------- Type ---------- */
  const OTP = /\botp\b|one[- ]time|verification code|passcode|\bcvv\b|\bpin\b|رمز التحقق|رمز سري|كلمة المرور/i;
  const PROMO = /\boffer\b|\bwin\b|\bdiscount\b|promotion|apply now|loan offer|عرض|خصم\s?\d+\s?%/i;
  const DEBIT = /purchase|purchased|debited|debit\b|withdrawn|withdrawal|spent|paid|payment|used for|used at|transferred to|sent to|deducted|charged|pos\b|bill pay|تم خصم|خصم|شراء|مشتريات|سحب|دفع|سداد|حوالة صادرة|تحويل إلى|تحويل الى/i;
  const CREDIT = /credited|credit of|received|deposit(?:ed)?|salary|refund|reversal|reversed|cashback|added to|transferred from|from your|تم إيداع|إيداع|ايداع|اضافة|إضافة|وارد|راتب|استرداد|استرجاع|تم استلام/i;

  function findType(text) {
    if (/debited|deducted|تم خصم|خصم من/i.test(text)) return 'expense';
    if (/credited to|credited with|has been credited|تم إيداع|تم ايداع|قيد في حسابك/i.test(text)) return 'income';
    const d = text.search(DEBIT), c = text.search(CREDIT);
    if (c !== -1 && (d === -1 || c < d)) return 'income';
    return 'expense';
  }
  function looksLikeTransaction(msg) {
    const t = normalizeDigits(msg);
    if (OTP.test(t)) return false; // OTP / security messages (even ones quoting an amount) are never transactions
    if (PROMO.test(t) && !/debited|credited|purchase|تم خصم|تم إيداع/i.test(t)) return false;
    return findAmount(t) !== null && (DEBIT.test(t) || CREDIT.test(t));
  }

  /* ---------- Merchant text ---------- */
  const STOP = '(?=\\s+(?:on|at|using|with|via|card|ending|avl|avail|available|bal|balance|ref|reference|date|dated|from|for|in|is|has|was|using|thank|tel|call|ب|في|بتاريخ|بطاقة|البطاقة|رصيد|الرصيد|عبر|باستخدام|مرجع)\\b|\\s*\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]|\\s*\\d{1,2}\\s?[-/ ]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\\s*[.,،;\\n]|\\s+(?:omr|ro)\\b|\\s+\\d{3,}|$)';
  const NAME = "([\\p{L}\\p{N} &'’._*/\\-]{2,45}?)";
  function cleanMerchant(s) {
    s = s.replace(/\s+/g, ' ').trim().replace(/[*.\-_/]+$/, '');
    s = s.replace(/\s+(?:muscat|oman|om|mct|seeb|salalah|sohar|nizwa|sur|barka|khoud|qurum|ruwi|mawaleh|al khuwair|bausher)(?:\s+(?:om|oman))?$/i, '');
    s = s.replace(/^(?:pos|pur|purchase|www\.?|ecom|e-?com|apple pay|google pay|samsung pay)\s+/i, '');
    return s.trim();
  }
  function findMerchantText(text, type) {
    const pats = type === 'expense'
      ? [
          new RegExp(`(?:merchant|store|shop|beneficiary)\\s*:\\s*${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:\\bat|@)\\s+${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:\\bto)\\s+(?!your\\b|account\\b|a/c\\b)${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:لدى|عند|إلى|الى|لـ)\\s*:?\\s*${NAME}${STOP}`, 'iu'),
        ]
      : [
          new RegExp(`(?:\\bfrom)\\s+(?!your\\b|account\\b|a/c\\b)${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:\\bby)\\s+${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:من)\\s*:?\\s*${NAME}${STOP}`, 'iu'),
        ];
    for (const p of pats) {
      const m = text.match(p);
      if (m) {
        const n = cleanMerchant(m[1]);
        if (n.length >= 2 && !/^\d+$/.test(n) && !/^(?:your|account|a\/c|حساب|حسابك|card|بطاقة)/i.test(n)) return n;
      }
    }
    return '';
  }

  function findLast4(text) {
    const m = text.match(/(?:\*{2,}|[xX]{2,}|ending(?:\s+(?:in|with))?|card(?:\s+(?:no\.?|number))?|a\/c(?:\s+no\.?)?|account(?:\s+(?:no\.?|number))?|المنتهية\s*بـ?|المنتهيه\s*بـ?|بطاقة(?:\s+رقم)?|البطاقة|حساب(?:ك)?(?:\s+رقم)?)\s*[^\d\n]{0,10}(\d{4})\b/i);
    return m ? m[1] : '';
  }

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function findDate(text, now) {
    let y, mo, d, m;
    if ((m = text.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/))) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
    else if ((m = text.match(/\b(\d{1,2})[\/\-. ]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\-., ]*(\d{2,4})\b/i))) { d = +m[1]; mo = MONTHS[m[2].toLowerCase()]; y = +m[3]; }
    else if ((m = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/))) { d = +m[1]; mo = +m[2] - 1; y = +m[3]; }
    else return now.toISOString();
    if (y < 100) y += 2000;
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return now.toISOString();
    const t = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
    let hh = t ? +t[1] : 12; const mm = t ? +t[2] : 0;
    if (t && t[3]) { const pm = t[3].toLowerCase() === 'pm'; if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
    const dt = new Date(y, mo, d, hh, mm);
    return isNaN(dt.getTime()) ? now.toISOString() : dt.toISOString();
  }

  function detectBank(text) {
    for (const [name, re] of BANKS) if (re.test(text)) return name;
    return '';
  }

  /* ---------- Main parse ---------- */
  function categorize(merchantText, fullText, type, userRules) {
    const mk = key(merchantText).trim();
    if (userRules && mk && userRules[mk]) return { cat: userRules[mk], known: true, name: merchantText };
    if (type === 'income') {
      if (/salary|payroll|wps|راتب/i.test(fullText)) return { cat: 'salary', known: true, name: 'Salary' };
      if (/refund|reversal|reversed|cashback|استرداد|استرجاع/i.test(fullText)) return { cat: 'otherIncome', known: true, name: merchantText || 'Refund' };
      const hit = merchantText && matchMerchant(merchantText);
      return { cat: hit && catById(hit.cat).income ? hit.cat : 'otherIncome', known: false, name: merchantText };
    }
    // 1) match inside the extracted merchant text (any alias), 2) fall back to whole message (long aliases only)
    let hit = merchantText && matchMerchant(merchantText);
    if (!hit) hit = matchMerchant(fullText, { minLen: 5 });
    if (hit && !catById(hit.cat).income) {
      const generic = /\/|^(?:Restaurant|Supermarket|Pharmacy|Hotel|Mall|Utility|Petrol|Parking|Taxi|Rent|Insurance|School|Government|Gym|Car service)/.test(hit.name);
      return { cat: hit.cat, known: true, name: merchantText && generic ? merchantText : hit.name };
    }
    return { cat: 'other', known: false, name: merchantText };
  }

  function parseMessage(message, now, userRules) {
    now = now || new Date();
    const raw = String(message || '').trim();
    if (!raw) return null;
    const text = normalizeDigits(raw);
    if (!looksLikeTransaction(text)) return null;
    const amount = findAmount(text);
    if (amount === null) return null;
    const type = findType(text);
    const merchantText = findMerchantText(text, type);
    const { cat, known, name } = categorize(merchantText, text, type, userRules);
    const currency = detectCurrency(text);
    // ATM / mobile payment hints override a vague merchant
    let category = cat;
    if (type === 'expense' && cat === 'other' && /\batm\b|cash withdrawal|سحب نقدي/i.test(text)) category = 'cash';
    if (type === 'expense' && cat === 'other' && /mobile payment|transfer|fund transfer|حوالة|تحويل/i.test(text)) category = 'transfer';
    return {
      amount: Math.round(amount * 1000) / 1000,
      currency,
      amountOMR: Math.round(amount * (RATES[currency] || 1) * 1000) / 1000,
      type,
      merchant: name || merchantText || (type === 'income' ? 'Incoming credit' : 'Unknown merchant'),
      category: type === 'income' && !catById(category).income ? 'otherIncome' : category,
      known: known || category !== 'other',
      last4: findLast4(text),
      bank: detectBank(text),
      balance: findBalance(text),
      date: findDate(text, now),
      raw,
    };
  }

  /** Split a pasted blob / exported file into separate messages and parse each. */
  function parseMany(input, now, userRules) {
    let chunks = String(input).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    if (chunks.length === 1 && chunks[0].includes('\n')) {
      // one message per line when no blank lines separate them
      const lines = chunks[0].split('\n').map((s) => s.trim()).filter(Boolean);
      if (lines.filter((l) => findAmount(normalizeDigits(l)) !== null).length === lines.length) chunks = lines;
    }
    const parsed = []; let skipped = 0;
    chunks.forEach((c) => { const p = parseMessage(c, now, userRules); if (p) parsed.push(p); else skipped++; });
    return { parsed, skipped };
  }

  const api = { CATEGORIES, catById, MERCHANTS, BANKS, RATES, parseMessage, parseMany, matchMerchant, normalizeDigits, key, looksLikeTransaction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Oman = api;
})(typeof window !== 'undefined' ? window : globalThis);
