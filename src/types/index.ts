export type Language = 'ta' | 'en';

export type Currency = 'INR' | 'AED';

export const DEFAULT_AED_EXCHANGE_RATE = 22.80; // 1 AED = 22.80 INR

export type UserRole = 
  | 'admin'          // முதன்மை நிர்வாகி (Super Admin)
  | 'president'      // தலைவர்
  | 'secretary'      // செயலாளர்
  | 'treasurer'      // பொருளாளர்
  | 'committee'      // செயற்குழு உறுப்பினர்
  | 'member'         // பொது உறுப்பினர்
  | 'auditor';       // தணிக்கையாளர்

export type AppPermission = 
  | 'manage_users'         // User management & member-role mapping
  | 'manage_branding'      // Edit organization info & custom logo
  | 'record_payments'      // Collect and record dues in INR / AED
  | 'generate_remittance'  // Generate monthly AED -> INR payout
  | 'create_assistance'    // Submit welfare assistance requests
  | 'review_assistance'    // Review and vote on welfare applications
  | 'disburse_payouts'     // Authorize and disburse fund payouts
  | 'view_ledger'          // Inspect general double-entry ledger
  | 'export_audit'         // Export audit logs and financial data
  | 'view_reports';        // View analytics and dashboard

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  admin: [
    'manage_users',
    'manage_branding',
    'record_payments',
    'generate_remittance',
    'create_assistance',
    'review_assistance',
    'disburse_payouts',
    'view_ledger',
    'export_audit',
    'view_reports'
  ],
  president: [
    'manage_users',
    'record_payments',
    'generate_remittance',
    'create_assistance',
    'review_assistance',
    'disburse_payouts',
    'view_ledger',
    'export_audit',
    'view_reports'
  ],
  treasurer: [
    'record_payments',
    'generate_remittance',
    'create_assistance',
    'review_assistance',
    'disburse_payouts',
    'view_ledger',
    'view_reports'
  ],
  secretary: [
    'manage_users',
    'record_payments',
    'create_assistance',
    'review_assistance',
    'view_ledger',
    'view_reports'
  ],
  committee: [
    'create_assistance',
    'review_assistance',
    'view_reports'
  ],
  auditor: [
    'view_ledger',
    'export_audit',
    'view_reports'
  ],
  member: [
    'create_assistance',
    'view_reports'
  ]
};

export const hasPermission = (role: UserRole, permission: AppPermission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export interface AppUser {
  id: string; // e.g. "usr_1"
  username: string; // e.g. "admin_faizel"
  fullName: string;
  fullNameTa: string;
  phone: string;
  email?: string;
  role: UserRole;
  memberId?: string; // Mapped Member ID!
  status: 'active' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  notes?: string;
  password?: string;
}

export interface AuthSession {
  email: string;
  name: string;
  picture?: string;
  user: AppUser;
  loginTime: string;
}

export interface Member {
  id: string;
  name: string;
  nameTa: string;
  phone: string;
  email?: string;
  villageWard: string;
  status: 'active' | 'suspended' | 'inactive';
  role: UserRole;
  currency: Currency; // 'INR' or 'AED'
  monthlyPledge: number; // in pledged currency (e.g., 200 INR or 25/50 AED)
  isGulfMember?: boolean;
  gulfCity?: string; // e.g. "Dubai", "Abu Dhabi", "Sharjah"
  joinedDate: string;
  avatarSeed: string;
}

export interface ContributionDue {
  id: string;
  memberId: string;
  memberName: string;
  memberNameTa: string;
  month: string; // e.g. "2026-11"
  currency: Currency;
  amountDue: number; // in pledged currency
  amountPaid: number; // in pledged currency
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  amountPaidINR: number; // converted base INR
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'exchange_house' | 'botim';

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  memberId: string;
  memberName: string;
  memberNameTa: string;
  month: string;
  currency: Currency;
  amount: number; // amount in original currency
  exchangeRate?: number; // e.g., 22.80 for AED, 1 for INR
  amountInINR: number; // equivalent base fund value in INR
  method: PaymentMethod;
  referenceNumber?: string;
  recordedBy: string; // e.g., "Treasurer"
  timestamp: string;
  notes?: string;
  remittancePayoutId?: string; // Set when admin generates monthly AED to INR payout
  syncStatus: 'synced' | 'pending';
}

export interface AedMonthlyPayout {
  id: string;
  payoutNumber: string;
  month: string; // e.g. "2026-11"
  totalAedAmount: number;
  conversionRate: number; // entered by admin at remittance time
  generatedInrAmount: number; // base INR credited to village fund
  generatedDate: string;
  generatedBy: string;
  remittanceProvider: string; // e.g. "Al Ansari Exchange", "Lulu Exchange", "Bank Transfer"
  referenceNumber: string;
  notes?: string;
  memberBreakdown: {
    memberId: string;
    memberName: string;
    memberNameTa: string;
    aedAmount: number;
    inrEquivalent: number;
  }[];
  syncStatus: 'synced' | 'pending';
}

export type AssistanceCategory = 'health' | 'education' | 'hardship' | 'elderly' | 'disaster' | 'other';
export type AssistancePriority = 'urgent' | 'high' | 'normal';
export type AssistanceStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'closed';

export interface AssistanceRequest {
  id: string;
  beneficiaryName: string;
  beneficiaryNameTa: string;
  beneficiaryPhone: string;
  category: AssistanceCategory;
  currency?: Currency;
  originalRequestedAmount?: number;
  exchangeRate?: number;
  requestedAmount: number; // in INR
  approvedAmount?: number; // in INR
  originalApprovedAmount?: number;
  reason: string;
  reasonTa: string;
  priority: AssistancePriority;
  status: AssistanceStatus;
  submittedBy: string;
  submittedDate: string;
  reviews: AssistanceReview[];
  payoutDetails?: PayoutRecord;
  syncStatus: 'synced' | 'pending';
}

export interface AssistanceReview {
  reviewerRole: UserRole;
  reviewerName: string;
  decision: 'approve' | 'reject' | 'comment';
  comment: string;
  timestamp: string;
}

export interface PayoutRecord {
  payoutId: string;
  amount: number; // Registered in INR
  currency?: Currency;
  originalAmount?: number; // e.g. entered AED amount during that period
  exchangeRate?: number; // exchange rate during that period (e.g. 22.80)
  disbursedDate: string;
  disbursedBy: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  recipientName: string;
  notes?: string;
}

export type LedgerEntryType = 'credit' | 'debit'; // Credit = money in (contributions/donations), Debit = money out (payouts/expenses)

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  category: string;
  categoryTa: string;
  amount: number; // Base INR value posted to fund balance
  originalCurrency?: Currency;
  originalAmount?: number;
  exchangeRate?: number;
  balanceAfter: number;
  description: string;
  descriptionTa: string;
  referenceId: string; // paymentId or payoutId
  enteredBy: string;
  syncStatus: 'synced' | 'pending';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  actionTa: string;
  details: string;
  detailsTa: string;
  ipOrDevice: string;
}

export interface SyncMutation {
  id: string; // UUID idempotency key
  timestamp: number;
  entity: 'payment' | 'assistance_request' | 'approval' | 'payout' | 'member' | 'user' | 'member_role_mapping';
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
  retries: number;
}

export interface FundSummary {
  totalBalance: number; // in INR
  committedReserve: number; // in INR
  availableBalance: number; // in INR
  totalCollectedThisMonth: number; // in INR
  totalCollectedThisMonthAED: number; // sum of original AED collected
  totalCollectedThisMonthINR: number; // sum of original INR collected
  totalPaidOutThisMonth: number;
  totalActiveMembers: number;
  unpaidMembersCount: number;
  pendingRequestsCount: number;
}

export type PresetEmblemIcon = 'rupee' | 'shield' | 'tree' | 'handshake' | 'building' | 'globe';

export interface OrganizationInfo {
  name: string;
  nameTa: string;
  subtitle: string;
  subtitleTa: string;
  village: string;
  villageTa: string;
  district: string;
  districtTa: string;
  regNumber: string;
  contactPhone: string;
  contactEmail: string;
  headerBadge: string;
  footerText: string;
  footerTextTa: string;
  logoType: 'custom_image' | 'preset_icon';
  logoDataUrl?: string; // base64 data url for user uploaded logo
  presetIcon: PresetEmblemIcon;
  logoBgColor: string; // e.g. '#15803d'
}

export const DEFAULT_ORG_INFO: OrganizationInfo = {
  name: 'GramaNidhi',
  nameTa: 'கிராமநிதி',
  subtitle: 'Village Community Welfare Fund',
  subtitleTa: 'கிராம பொது நல நிதியம்',
  village: 'Melavalavu Village',
  villageTa: 'மேலவளவு கிராமம்',
  district: 'Madurai Dist',
  districtTa: 'மதுரை மாவட்டம்',
  regNumber: 'Reg. No: 142/2018',
  contactPhone: '+91 98421 76540',
  contactEmail: 'contact@gramanidhi.org',
  headerBadge: 'OFFLINE-FIRST',
  footerText: 'GramaNidhi • Transparent Rural Welfare & Diaspora Remittance Platform',
  footerTextTa: 'கிராமநிதி • வெளிப்படையான கிராம நல மற்றும் வளைகுடா நிதி தளம்',
  logoType: 'preset_icon',
  presetIcon: 'rupee',
  logoBgColor: '#15803d',
};

export interface FinancialAmendmentReview {
  reviewerRole: UserRole;
  reviewerName: string;
  decision: 'approve' | 'reject' | 'modify';
  comment: string;
  timestamp: string;
}

export interface FinancialAmendmentRequest {
  id: string;
  targetType: 'payment' | 'due' | 'ledger' | 'monthly_remittance';
  targetId: string;
  month: string;
  requestedBy: string;
  requestedRole: UserRole;
  reason: string;
  proposedChanges: Record<string, any>;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'applied';
  reviews: FinancialAmendmentReview[];
  submittedDate: string;
  syncStatus?: 'synced' | 'pending';
}

