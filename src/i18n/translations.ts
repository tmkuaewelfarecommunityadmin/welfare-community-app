import { Language } from '../types';

export const translations = {
  en: {
    appName: 'GramaNidhi',
    appSubtitle: 'Village Community Fund Management',
    villageName: 'Vellalore Grama Nidhi',
    district: 'Madurai District',
    
    // Nav & Tabs
    dashboard: 'Dashboard',
    contributions: 'Contributions & Dues',
    assistance: 'Assistance & Payouts',
    ledger: 'Ledger & Accounts',
    members: 'Members Directory',
    syncCenter: 'Sync & Offline Engine',
    auditLogs: 'Audit Trail',
    techAnalysis: 'Architecture & Corrections',
    
    // Currency & Multi-Currency
    currency: 'Currency',
    currency_inr: 'Indian Rupee (INR ₹)',
    currency_aed: 'UAE Dirham (AED د.إ)',
    exchangeRate: 'Exchange Rate',
    exchangeRateInfo: 'Exchange Rate: 1 AED ≈ ₹22.80 INR',
    convertedToINR: 'Fund Credit Value (INR)',
    gulfMember: 'UAE / Gulf Member',
    gulfCity: 'UAE City / Emirate',
    localResident: 'Local Resident',
    uaeCollections: 'UAE Dirhams Collected',
    inrCollections: 'INR Collections',

    // Roles
    role_president: 'President / Chairperson',
    role_secretary: 'General Secretary',
    role_treasurer: 'Treasurer',
    role_committee: 'Committee Member',
    role_member: 'Contributing Member',
    role_auditor: 'Honorary Auditor',
    currentRole: 'Active Role Mode',
    switchRole: 'Switch Role',

    // Network & Sync
    online: 'Online (Connected)',
    offline: 'Offline Mode (Local Storage Safe)',
    syncStatus: 'Sync Status',
    pendingSyncs: 'mutations queued locally',
    allSynced: 'All data synchronized',
    syncNow: 'Sync to Cloud Now',
    syncing: 'Synchronizing records...',
    simulateOffline: 'Simulate Offline Mode',
    simulateOnline: 'Restore Online Network',
    lastSyncedAt: 'Last synced at',
    never: 'Just now',
    
    // Financial Metrics
    availableFund: 'Net Available Fund',
    totalBalance: 'Gross Ledger Balance',
    committedFunds: 'Committed Reserve (Approved Payouts)',
    thisMonthCollection: 'This Month Collections',
    thisMonthPayout: 'This Month Disbursed',
    activeContributors: 'Active Contributors',
    defaultersCount: 'Dues Pending',
    pendingApprovals: 'Requests Awaiting Review',
    
    // Actions & Buttons
    recordPayment: 'Record Member Payment',
    newAssistanceRequest: 'Create Assistance Request',
    downloadReceipt: 'Download Receipt',
    printReceipt: 'Print Voucher',
    shareWhatsApp: 'Share on WhatsApp',
    exportCSV: 'Export to CSV',
    approve: 'Approve',
    reject: 'Reject',
    disburse: 'Disburse Payout',
    saveDraft: 'Save Offline Draft',
    addNewMember: 'Enroll New Member',
    filterByMonth: 'Filter Month',
    allCategories: 'All Categories',
    searchPlaceholder: 'Search by member name, phone or ward...',

    // Categories
    cat_health: 'Medical & Emergency Care',
    cat_education: 'Student Education Aid',
    cat_hardship: 'Family Hardship Relief',
    cat_elderly: 'Elderly Support Pension',
    cat_disaster: 'Monsoon / Fire Relief',
    cat_other: 'Other Community Welfare',

    // Receipt details
    receiptHeader: 'VILLAGE COMMUNITY WELFARE FUND RECEIPT',
    receiptNo: 'Receipt #',
    date: 'Date & Time',
    receivedFrom: 'Received from Member',
    amount: 'Amount Received',
    amountInWords: 'Amount in Words',
    mode: 'Payment Mode',
    refNo: 'UPI / Reference No',
    officer: 'Authorized Officer',
    status: 'Sync & Verification Status',
    verifiedStamp: 'VERIFIED GRAMA RECORD',
    
    // Forms
    selectMember: 'Select Member',
    enterAmount: 'Amount',
    paymentDate: 'Payment Date',
    paymentMethod: 'Payment Mode',
    cash: 'Cash (Handover)',
    upi: 'UPI / GPay / PhonePe',
    bank: 'Bank Transfer / NEFT',
    exchange_house: 'Exchange House (Al Ansari / UAE Exchange)',
    botim: 'Botim Pay / UAE Online',
    notes: 'Remarks / Notes',
    cancel: 'Cancel',
    confirm: 'Confirm & Save',
    
    // Assistance Form
    beneficiaryName: 'Beneficiary Full Name',
    beneficiaryPhone: 'Contact Number',
    reasonDescription: 'Detailed Reason for Assistance',
    urgencyPriority: 'Urgency Level',
    priority_urgent: 'Critical (Immediate)',
    priority_high: 'High Priority',
    priority_normal: 'Standard Priority',
    
    // Sync Center
    syncQueueTitle: 'Offline Outbox & Mutation Queue',
    syncQueueDesc: 'When connectivity drops in remote fields, all transactions are saved with cryptographically unique UUID idempotency keys in local IndexedDB. Once reconnected, they are verified and committed automatically.',
    dbHealth: 'Local IndexedDB Storage Health',
    recordsStoredLocally: 'Total Records Cached Locally',
    backupDatabase: 'Backup Database (JSON)',
    restoreDatabase: 'Restore from Backup',
    clearLocalDb: 'Reset Demo Database',

    // Multi-Currency Payout & Period Exchange
    payoutCurrency: 'Payout Currency / Entry Mode',
    payoutInAed: 'Enter AED Amount for this period',
    payoutInInr: 'Direct INR Amount (₹)',
    periodExchangeRate: 'Exchange Rate for this period (1 AED = ₹ INR)',
    periodRateHelper: 'Enter the historical exchange rate that applied during this transfer period (e.g. 22.80)',
    registeredInLedger: 'Registered Payout in Village Ledger (INR ₹)',
    aedConversionLive: 'Live Period Conversion',
    disbursedInAED: 'Disbursed via UAE Chapter in AED',
    sponsoredByGulf: 'Sponsored / Entered in AED',

    // Monthly Remittance Payout (AED to INR)
    monthlyAedRemittance: 'UAE Chapter Monthly Dirham Remittance Settlement',
    generateMonthlyRemittance: 'Generate Monthly Payout (AED → INR)',
    unremittedAedPool: 'Unremitted Dirhams in UAE Pool',
    remittanceSettlement: 'Remittance Settlement',
    remittanceProvider: 'Remittance Agency / Exchange House',
    remittanceRatePrompt: 'Conversion Rate on Transfer Slip (1 AED = ₹ INR)',
    remittanceSuccess: 'Monthly remittance payout generated and credited to village fund ledger in INR!'
  },
  ta: {
    appName: 'கிராமநிதி',
    appSubtitle: 'கிராம சமுதாய பொது நிதி மேலாண்மை செயலி',
    villageName: 'வெள்ளலூர் கிராம நிதி',
    district: 'மதுரை மாவட்டம்',
    
    // Nav & Tabs
    dashboard: 'முகப்பு பலகை',
    contributions: 'சந்தா & வரவுகள்',
    assistance: 'நலத்திட்ட உதவி & பட்டுவாடா',
    ledger: 'வரவு-செலவு பேரேடு',
    members: 'உறுப்பினர்கள் பட்டியல்',
    syncCenter: 'ஆஃப்லைன் ஒத்திசைவு இயந்திரம்',
    auditLogs: 'தணிக்கைப் பதிவு',
    techAnalysis: 'கட்டமைப்பு & திருத்தங்கள்',
    
    // Currency & Multi-Currency
    currency: 'நாணயம்',
    currency_inr: 'இந்திய ரூபாய் (INR ₹)',
    currency_aed: 'யு.ஏ.இ திர்காம் (AED د.إ)',
    exchangeRate: 'மாற்று விகிதம்',
    exchangeRateInfo: 'மாற்று விகிதம்: 1 AED ≈ ₹22.80 ரூபாய்',
    convertedToINR: 'நிதிக்கு வரவு மதிப்பு (ரூபாய்)',
    gulfMember: 'வளைகுடா வாழ் உறுப்பினர் (UAE)',
    gulfCity: 'எமிரேட்ஸ் / நகரம்',
    localResident: 'உள்ளூர் குடியிருப்பு',
    uaeCollections: 'யு.ஏ.இ திர்காம் வசூல்',
    inrCollections: 'உள்ளூர் ரூபாய் வசூல்',

    // Roles
    role_president: 'தலைவர்',
    role_secretary: 'செயலாளர்',
    role_treasurer: 'பொருளாளர்',
    role_committee: 'செயற்குழு உறுப்பினர்',
    role_member: 'சந்தாதாரர்',
    role_auditor: 'தணிக்கையாளர்',
    currentRole: 'தற்போதைய பொறுப்பு',
    switchRole: 'பொறுப்பை மாற்றுக',

    // Network & Sync
    online: 'இணையம் இணைப்பில் உள்ளது',
    offline: 'ஆஃப்லைன் முறை (பாதுகாப்பாக சேமிக்கப்படுகிறது)',
    syncStatus: 'ஒத்திசைவு நிலை',
    pendingSyncs: 'பதிவுகள் அனுப்ப காத்திருக்கின்றன',
    allSynced: 'அனைத்து விவரங்களும் ஒத்திசைக்கப்பட்டன',
    syncNow: 'இப்போதே ஒத்திசைக்க',
    syncing: 'தரவுகள் பதிவேற்றப்படுகின்றன...',
    simulateOffline: 'ஆஃப்லைன் நிலையை சோதிக்க',
    simulateOnline: 'இணைய இணைப்பை மீட்டமைக்க',
    lastSyncedAt: 'கடைசி ஒத்திசைவு நேரம்',
    never: 'இப்போதுதான்',
    
    // Financial Metrics
    availableFund: 'நிகர இருப்புத் தொகை',
    totalBalance: 'மொத்த பேரேட்டு இருப்பு',
    committedFunds: 'ஒப்புதல் பெற்ற நிதி ஒதுக்கீடு',
    thisMonthCollection: 'இம்மாத மொத்த வசூல்',
    thisMonthPayout: 'இம்மாத உதவி வழங்கல்',
    activeContributors: 'செயலில் உள்ள உறுப்பினர்கள்',
    defaultersCount: 'நிலுவை வைத்துள்ளோர்',
    pendingApprovals: 'பரிசீலனைக்குரிய கோரிக்கைகள்',
    
    // Actions & Buttons
    recordPayment: 'சந்தா வரவு வைக்க',
    newAssistanceRequest: 'புதிய உதவிக் கோரிக்கை',
    downloadReceipt: 'ரசீதை பதிவிறக்க',
    printReceipt: 'ரசீதை அச்சிடுக',
    shareWhatsApp: 'வாட்ஸ்அப்பில் பகிர்க',
    exportCSV: 'CSV ஆக ஏற்றுமதி',
    approve: 'ஒப்புதல் அளிக்க',
    reject: 'நிராகரிக்க',
    disburse: 'பணம் பட்டுவாடா செய்க',
    saveDraft: 'ஆஃப்லைனில் சேமிக்க',
    addNewMember: 'புதிய உறுப்பினர் சேர்க்க',
    filterByMonth: 'மாதத் தேர்வு',
    allCategories: 'அனைத்து பிரிவுகள்',
    searchPlaceholder: 'பெயர், தொலைபேசி அல்லது வார்டு மூலம் தேட...',

    // Categories
    cat_health: 'மருத்துவம் & அவசர சிகிச்சை',
    cat_education: 'மாணவர் கல்வி உதவி',
    cat_hardship: 'குடும்ப வறுமை நிவாரணம்',
    cat_elderly: 'முதியோர் பராமரிப்பு உதவி',
    cat_disaster: 'மழை/தீ விபத்து நிவாரணம்',
    cat_other: 'பொது சமுதாய நலம்',

    // Receipt details
    receiptHeader: 'கிராம சமுதாய நல நிதி ரசீது',
    receiptNo: 'ரசீது எண்',
    date: 'தேதி & நேரம்',
    receivedFrom: 'பெறப்பட்ட உறுப்பினர்',
    amount: 'பெறப்பட்ட தொகை',
    amountInWords: 'தொகை எழுத்தால்',
    mode: 'செலுத்திய முறை',
    refNo: 'UPI / குறிப்பு எண்',
    officer: 'பதிவு செய்த நிர்வாகி',
    status: 'ஒத்திசைவு & சரிபார்ப்பு நிலை',
    verifiedStamp: 'சரிபார்க்கப்பட்ட கிராம பதிவு',
    
    // Forms
    selectMember: 'உறுப்பினரைத் தேர்ந்தெடுக்கவும்',
    enterAmount: 'தொகை',
    paymentDate: 'செலுத்திய தேதி',
    paymentMethod: 'பணம் செலுத்திய முறை',
    cash: 'ரொக்கம் (நேரடி கைவசம்)',
    upi: 'UPI / GPay / PhonePe',
    bank: 'வங்கி பரிவர்த்தனை / NEFT',
    exchange_house: 'எக்ஸ்சேஞ்ச் ஹவுஸ் (அல் அன்சாரி / UAE Exchange)',
    botim: 'போட்டிம் பே / UAE ஆன்லைன்',
    notes: 'குறிப்புகள்',
    cancel: 'ரத்து செய்',
    confirm: 'உறுதி செய்து சேமிக்க',
    
    // Assistance Form
    beneficiaryName: 'பயனாளி முழுப் பெயர்',
    beneficiaryPhone: 'தொடர்பு எண்',
    reasonDescription: 'உதவிக்கான விரிவான காரணம்',
    urgencyPriority: 'அவசர நிலை',
    priority_urgent: 'அதி அவசரம்',
    priority_high: 'முக்கியமானது',
    priority_normal: 'வழக்கமான உதவி',
    
    // Sync Center
    syncQueueTitle: 'ஆஃப்லைன் அவுட்பாக்ஸ் & வரிசை',
    syncQueueDesc: 'கிராமத்தில் இணையம் இல்லாத பகுதிகளில் சேர்க்கப்படும் சந்தாக்கள் மற்றும் உதவிகள் உள்ளூர் IndexedDB-இல் தனித்துவமான மறைகுறியாக்க சாவியுடன் சேமிக்கப்படும். இணையம் வந்ததும் தானாக ஒத்திசைக்கப்படும்.',
    dbHealth: 'உள்ளூர் IndexedDB சேமிப்பக நிலை',
    recordsStoredLocally: 'உள்ளூரில் உள்ள பதிவுகள்',
    backupDatabase: 'காப்புப் பிரதி எடுக்க (JSON Backup)',
    restoreDatabase: 'காப்புப் பிரதியிலிருந்து மீட்டெடு',
    clearLocalDb: 'மாதிரி பதிவுகளை மீட்டமை',

    // Multi-Currency Payout & Period Exchange
    payoutCurrency: 'பட்டுவாடா நாணயம் / முறை',
    payoutInAed: 'இக்காலகட்டத்திற்கான யு.ஏ.இ திர்காம் (AED) தொகை',
    payoutInInr: 'நேரடி இந்திய ரூபாய் (INR ₹)',
    periodExchangeRate: 'அக்காலகட்ட மாற்று விகிதம் (1 AED = ₹ ரூபாய்)',
    periodRateHelper: 'இப்பரிவர்த்தனை நிகழ்ந்த காலகட்டத்தில் நிலவிய மாற்று விகிதத்தை உள்ளிடவும் (உதா: 22.80)',
    registeredInLedger: 'கிராமப் பேரேட்டில் பற்று வைக்கப்படும் தொகை (INR ₹)',
    aedConversionLive: 'நேரடி மாற்று கணக்கீடு',
    disbursedInAED: 'வளைகுடா யு.ஏ.இ திர்காமில் பட்டுவாடா',
    sponsoredByGulf: 'வளைகுடா பிரிவில் பதிவு செய்யப்பட்டது',

    // Monthly Remittance Payout (AED to INR)
    monthlyAedRemittance: 'வளைகுடா மாதாந்திர திர்காம்-ரூபாய் பரிமாற்ற பட்டுவாடா',
    generateMonthlyRemittance: 'மாதாந்திர திர்காம் பரிமாற்றம் செய்க (AED → INR)',
    unremittedAedPool: 'பரிமாற்றம் செய்ய வேண்டிய திர்காம் நிதி',
    remittanceSettlement: 'பரிமாற்ற பட்டுவாடா விபரம்',
    remittanceProvider: 'பரிமாற்ற நிறுவனம் (எக்ஸ்சேஞ்ச் ஹவுஸ் / வங்கி)',
    remittanceRatePrompt: 'பரிவர்த்தனை ரசீதில் உள்ள மாற்று விகிதம் (1 AED = ₹ ரூபாய்)',
    remittanceSuccess: 'மாதாந்திர திர்காம் பரிமாற்றம் வெற்றிகரமாக பதிவு செய்யப்பட்டு கிராம நிதிக்கு ரூபாயாக வரவு வைக்கப்பட்டது!'
  }
};

export function getTranslation(lang: Language) {
  return translations[lang] || translations.en;
}
