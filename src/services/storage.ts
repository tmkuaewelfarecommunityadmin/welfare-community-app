import { 
  Member, 
  ContributionDue, 
  PaymentReceipt, 
  AssistanceRequest, 
  LedgerEntry, 
  AuditLog, 
  SyncMutation, 
  FundSummary,
  UserRole,
  PaymentMethod,
  Currency,
  DEFAULT_AED_EXCHANGE_RATE,
  AedMonthlyPayout,
  OrganizationInfo,
  DEFAULT_ORG_INFO,
  AppUser,
  FinancialAmendmentRequest
} from '../types';

const DB_NAME = 'GramaNidhi_Offline_DB';
const DB_VERSION = 6;

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private subscribers: Set<() => void> = new Set();
  private isInitialized = false;

  public subscribe(cb: () => void) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('members')) {
          db.createObjectStore('members', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('dues')) {
          db.createObjectStore('dues', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('payments')) {
          db.createObjectStore('payments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assistance_requests')) {
          db.createObjectStore('assistance_requests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('ledger_entries')) {
          db.createObjectStore('ledger_entries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          db.createObjectStore('audit_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_mutations')) {
          db.createObjectStore('sync_mutations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('aed_monthly_payouts')) {
          db.createObjectStore('aed_monthly_payouts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('app_users')) {
          db.createObjectStore('app_users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('financial_amendments')) {
          db.createObjectStore('financial_amendments', { keyPath: 'id' });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        this.isInitialized = true;
        await this.ensureSeedData();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private async putItem<T>(storeName: string, item: T): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => {
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async deleteItem(storeName: string, id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Domain Methods ---

  public async getMembers(): Promise<Member[]> {
    return this.getAll<Member>('members');
  }

  public async generateNextUsername(currency: Currency): Promise<string> {
    const prefix = currency === 'AED' ? 'uae' : 'tmk';
    const users = await this.getUsers();
    const matching = users.filter((u) => u.username && u.username.toLowerCase().startsWith(prefix));
    let maxSeq = 0;
    for (const u of matching) {
      const numPart = u.username.slice(3);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
    const nextSeq = maxSeq + 1;
    return prefix + String(nextSeq).padStart(3, '0');
  }

  public async saveMember(member: Member, actor: string = 'Admin'): Promise<void> {
    await this.putItem('members', member);

    // Auto-generate or update app user account for member with username and phone as password
    const users = await this.getUsers();
    let user = users.find((u) => u.memberId === member.id);
    if (!user) {
      const newUsername = await this.generateNextUsername(member.currency);
      user = {
        id: 'usr_' + member.id + '_' + Date.now().toString(36),
        username: newUsername,
        fullName: member.name,
        fullNameTa: member.nameTa,
        phone: member.phone,
        email: member.email || '',
        role: member.role,
        memberId: member.id,
        status: member.status === 'active' ? 'active' : 'suspended',
        createdAt: new Date().toISOString(),
        notes: `Auto-generated on member creation (${member.villageWard})`,
        password: member.phone
      };
      await this.putItem('app_users', user);
    } else {
      user.fullName = member.name;
      user.fullNameTa = member.nameTa;
      user.phone = member.phone;
      if (member.email) user.email = member.email;
      user.role = member.role;
      user.status = member.status === 'active' ? 'active' : 'suspended';
      if (!user.password) {
        user.password = member.phone;
      }
      await this.putItem('app_users', user);
    }

    const currSymbol = member.currency === 'AED' ? 'AED' : '₹';
    await this.addAuditLog(
      actor,
      'MEMBER_SAVED',
      'உறுப்பினர் பதிவு செய்யப்பட்டது',
      `Member ${member.name} (${member.role}) saved with pledge ${currSymbol} ${member.monthlyPledge} (Username: @${user.username})`,
      `உறுப்பினர் ${member.nameTa} (${member.role}) சேமிக்கப்பட்டது (பயனர்பெயர்: @${user.username})`
    );
    await this.enqueueMutation('member', 'UPDATE', member);
    this.notify();
  }

  public async getDues(month?: string): Promise<ContributionDue[]> {
    const all = await this.getAll<ContributionDue>('dues');
    if (month) {
      return all.filter((d) => d.month === month);
    }
    return all.sort((a, b) => b.month.localeCompare(a.month));
  }

  public async getPayments(): Promise<PaymentReceipt[]> {
    const list = await this.getAll<PaymentReceipt>('payments');
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async recordPayment(params: {
    memberId: string;
    month: string;
    amount: number; // original amount
    currency: Currency;
    exchangeRate?: number;
    method: PaymentMethod;
    referenceNumber?: string;
    recordedBy: string;
    notes?: string;
    isOffline?: boolean;
  }): Promise<PaymentReceipt> {
    const members = await this.getMembers();
    const member = members.find((m) => m.id === params.memberId);
    if (!member) throw new Error('Member not found');

    const currency: Currency = params.currency || member.currency || 'INR';
    const isAED = currency === 'AED';

    const receiptId = 'RCP-' + Date.now().toString().slice(-6);
    const receipt: PaymentReceipt = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'pay_' + Date.now(),
      receiptNumber: receiptId,
      memberId: member.id,
      memberName: member.name,
      memberNameTa: member.nameTa,
      month: params.month,
      currency,
      amount: params.amount,
      exchangeRate: isAED ? undefined : 1,
      amountInINR: isAED ? 0 : params.amount, // Realized when monthly AED-to-INR payout is generated
      method: params.method,
      referenceNumber: params.referenceNumber || (params.method === 'cash' ? 'CASH-REC-' + Math.floor(1000 + Math.random() * 9000) : 'REF-' + Date.now().toString().slice(-6)),
      recordedBy: params.recordedBy,
      timestamp: new Date().toISOString(),
      notes: params.notes,
      syncStatus: params.isOffline ? 'pending' : 'synced'
    };

    // 1. Save payment receipt
    await this.putItem('payments', receipt);

    // 2. Update or create monthly due record
    const dues = await this.getDues(params.month);
    let due = dues.find((d) => d.memberId === member.id && d.month === params.month);
    if (!due) {
      due = {
        id: `due_${member.id}_${params.month}`,
        memberId: member.id,
        memberName: member.name,
        memberNameTa: member.nameTa,
        month: params.month,
        currency,
        amountDue: member.monthlyPledge,
        amountPaid: 0,
        amountPaidINR: 0,
        status: 'unpaid',
        dueDate: `${params.month}-10`
      };
    }
    due.amountPaid += params.amount;
    due.status = due.amountPaid >= due.amountDue ? 'paid' : (due.amountPaid > 0 ? 'partial' : 'unpaid');
    await this.putItem('dues', due);

    // 3. Post to double-entry ledger ONLY if direct local INR payment
    // For AED payments, the ledger credit is generated as a batch payout when admin executes the Monthly Remittance
    if (!isAED) {
      const ledger = await this.getLedger();
      const currentBalance = ledger.length > 0 ? ledger[0].balanceAfter : 0;
      const newBalance = currentBalance + params.amount;

      const descEn = `Monthly dues from ${member.name} for ${params.month}: ₹${params.amount} via ${params.method.toUpperCase()}`;
      const descTa = `${member.nameTa} அவர்களின் ${params.month} மாத சந்தா வரவு: ₹${params.amount}`;

      const ledgerEntry: LedgerEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'led_' + Date.now(),
        date: new Date().toISOString(),
        type: 'credit',
        category: 'Member Monthly Contribution',
        categoryTa: 'மாதாந்திர உறுப்பினர் சந்தா (INR)',
        amount: params.amount,
        originalCurrency: 'INR',
        originalAmount: params.amount,
        exchangeRate: 1,
        balanceAfter: newBalance,
        description: descEn,
        descriptionTa: descTa,
        referenceId: receipt.receiptNumber,
        enteredBy: params.recordedBy,
        syncStatus: params.isOffline ? 'pending' : 'synced'
      };
      await this.putItem('ledger_entries', ledgerEntry);
    }

    // 4. Audit Log
    const currStr = isAED ? `${params.amount} AED (UAE Chapter Pool)` : `₹${params.amount}`;
    await this.addAuditLog(
      params.recordedBy,
      'PAYMENT_RECORDED',
      'சந்தா வரவு வைக்கப்பட்டது',
      `Recorded ${currStr} from ${member.name} (Receipt ${receipt.receiptNumber}) via ${params.method}`,
      `${member.nameTa} அவர்களிடமிருந்து ${currStr} வரவு வைக்கப்பட்டது (ரசீது: ${receipt.receiptNumber})`
    );

    // 5. Add to outbox sync queue if offline
    if (params.isOffline) {
      await this.enqueueMutation('payment', 'CREATE', receipt);
    }

    this.notify();
    return receipt;
  }

  // --- Monthly UAE Dirham Remittance Payout to INR ---

  public async getAedMonthlyPayouts(): Promise<AedMonthlyPayout[]> {
    const list = await this.getAll<AedMonthlyPayout>('aed_monthly_payouts');
    return list.sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());
  }

  public async getUnremittedAedForMonth(month: string): Promise<{
    totalCollectedAed: number;
    alreadyRemittedAed: number;
    unremittedAed: number;
    payments: PaymentReceipt[];
    payouts: AedMonthlyPayout[];
  }> {
    const allPayments = await this.getPayments();
    const monthAedPayments = allPayments.filter((p) => p.currency === 'AED' && p.month === month);
    const payouts = await this.getAedMonthlyPayouts();
    const monthPayouts = payouts.filter((p) => p.month === month);

    const totalCollectedAed = monthAedPayments.reduce((sum, p) => sum + p.amount, 0);
    const alreadyRemittedAed = monthPayouts.reduce((sum, p) => sum + p.totalAedAmount, 0);
    const unremittedAed = Math.max(0, totalCollectedAed - alreadyRemittedAed);

    return {
      totalCollectedAed,
      alreadyRemittedAed,
      unremittedAed,
      payments: monthAedPayments,
      payouts: monthPayouts
    };
  }

  public async generateAedMonthlyPayout(params: {
    month: string;
    totalAedAmount: number;
    conversionRate: number; // exchange rate added by admin at remittance time
    remittanceProvider: string;
    referenceNumber: string;
    notes?: string;
    generatedBy: string;
    isOffline?: boolean;
  }): Promise<AedMonthlyPayout> {
    if (params.totalAedAmount <= 0) throw new Error('AED amount must be greater than 0');
    if (params.conversionRate <= 0) throw new Error('Conversion rate must be greater than 0');

    const generatedInrAmount = Math.round(params.totalAedAmount * params.conversionRate);
    const payoutId = `AED-PAY-${params.month}-${Date.now().toString().slice(-4)}`;
    const payoutNumber = `REMIT-${Date.now().toString().slice(-6)}`;

    // Payments for this month
    const allPayments = await this.getPayments();
    const monthAedPayments = allPayments.filter((p) => p.currency === 'AED' && p.month === params.month);

    const breakdown = monthAedPayments.map((p) => ({
      memberId: p.memberId,
      memberName: p.memberName,
      memberNameTa: p.memberNameTa,
      aedAmount: p.amount,
      inrEquivalent: Math.round(p.amount * params.conversionRate)
    }));

    const payoutRecord: AedMonthlyPayout = {
      id: payoutId,
      payoutNumber,
      month: params.month,
      totalAedAmount: params.totalAedAmount,
      conversionRate: params.conversionRate,
      generatedInrAmount,
      generatedDate: new Date().toISOString(),
      generatedBy: params.generatedBy,
      remittanceProvider: params.remittanceProvider,
      referenceNumber: params.referenceNumber,
      notes: params.notes,
      memberBreakdown: breakdown,
      syncStatus: params.isOffline ? 'pending' : 'synced'
    };

    await this.putItem('aed_monthly_payouts', payoutRecord);

    // Update payment receipts with the actual realized conversion rate and remittance ID
    for (const p of monthAedPayments) {
      p.exchangeRate = params.conversionRate;
      p.amountInINR = Math.round(p.amount * params.conversionRate);
      p.remittancePayoutId = payoutId;
      await this.putItem('payments', p);
    }

    // Update dues with amountPaidINR
    const dues = await this.getDues(params.month);
    for (const d of dues) {
      if (d.currency === 'AED' && d.amountPaid > 0) {
        d.amountPaidINR = Math.round(d.amountPaid * params.conversionRate);
        await this.putItem('dues', d);
      }
    }

    // Post Credit to General Ledger in Base INR
    const ledger = await this.getLedger();
    const currentBalance = ledger.length > 0 ? ledger[0].balanceAfter : 0;
    const newBalance = currentBalance + generatedInrAmount;

    const descEn = `Monthly Remittance Payout for ${params.month}: ${params.totalAedAmount} AED converted @ ₹${params.conversionRate} rate (Ref: ${params.referenceNumber}) via ${params.remittanceProvider}`;
    const descTa = `${params.month} மாதாந்திர வளைகுடா பரிமாற்றம்: ${params.totalAedAmount} திர்காம் (AED) @ ₹${params.conversionRate} மாற்று விகிதத்தில் ₹${generatedInrAmount.toLocaleString('en-IN')} கிராம நிதிக்கு வரவு`;

    const ledgerEntry: LedgerEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'led_' + Date.now(),
      date: new Date().toISOString(),
      type: 'credit',
      category: 'UAE Chapter Monthly Remittance Payout',
      categoryTa: 'வளைகுடா மாதாந்திர திர்காம்-ரூபாய் பரிமாற்ற வரவு',
      amount: generatedInrAmount,
      originalCurrency: 'AED',
      originalAmount: params.totalAedAmount,
      exchangeRate: params.conversionRate,
      balanceAfter: newBalance,
      description: descEn,
      descriptionTa: descTa,
      referenceId: payoutNumber,
      enteredBy: params.generatedBy,
      syncStatus: params.isOffline ? 'pending' : 'synced'
    };
    await this.putItem('ledger_entries', ledgerEntry);

    // Audit Log
    await this.addAuditLog(
      params.generatedBy,
      'AED_REMITTANCE_GENERATED',
      'மாதாந்திர திர்காம்-ரூபாய் பரிமாற்றம் பதிவு செய்யப்பட்டது',
      `Generated monthly payout for ${params.month}: ${params.totalAedAmount} AED @ ${params.conversionRate} = ₹${generatedInrAmount} (Ref: ${params.referenceNumber})`,
      `${params.month} மாதத்திற்கான ${params.totalAedAmount} AED @ ₹${params.conversionRate} மாற்று விகிதத்தில் ₹${generatedInrAmount} பரிமாற்றம் செய்யப்பட்டது`
    );

    if (params.isOffline) {
      await this.enqueueMutation('payment', 'CREATE', payoutRecord);
    }

    this.notify();
    return payoutRecord;
  }

  // --- User Management & RBAC Role Mapping ---

  public async getUsers(): Promise<AppUser[]> {
    const users = await this.getAll<AppUser>('app_users');
    return users.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  public async saveUser(user: AppUser, actor: string = 'Admin'): Promise<void> {
    await this.putItem('app_users', user);
    
    // Bi-directional sync: if user is mapped to a member, update member's role as well
    if (user.memberId) {
      const members = await this.getMembers();
      const member = members.find((m) => m.id === user.memberId);
      if (member && member.role !== user.role) {
        member.role = user.role;
        await this.putItem('members', member);
      }
    }

    await this.addAuditLog(
      actor,
      'USER_SAVED',
      'பயனாளர் & பொறுப்பு சேமிக்கப்பட்டது',
      `User account ${user.username} (${user.fullName}) saved with role '${user.role}' [Status: ${user.status}]`,
      `பயனாளர் ${user.username} (${user.fullNameTa}) பொறுப்பு '${user.role}' என சேமிக்கப்பட்டது`
    );
    await this.enqueueMutation('user', 'UPDATE', user);
    this.notify();
  }

  public async deleteUser(userId: string, actor: string = 'Admin'): Promise<void> {
    const users = await this.getUsers();
    const target = users.find((u) => u.id === userId);
    await this.deleteItem('app_users', userId);

    if (target) {
      await this.addAuditLog(
        actor,
        'USER_DELETED',
        'பயனாளர் கணக்கு நீக்கப்பட்டது',
        `User account ${target.username} (${target.fullName}) deleted`,
        `பயனாளர் கணக்கு ${target.username} (${target.fullNameTa}) நீக்கப்பட்டது`
      );
    }
    await this.enqueueMutation('user', 'DELETE', { userId });
    this.notify();
  }

  public async mapMemberToRole(params: {
    memberId: string;
    role: UserRole;
    username?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }, actor: string = 'Admin'): Promise<AppUser> {
    const members = await this.getMembers();
    const member = members.find((m) => m.id === params.memberId);
    if (!member) throw new Error('Member not found');

    // Update member role
    member.role = params.role;
    if (params.phone) member.phone = params.phone;
    await this.putItem('members', member);

    // Find existing user mapped to this member or create new
    const users = await this.getUsers();
    let user = users.find((u) => u.memberId === params.memberId);

    const generatedUsername = (params.username || member.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) || 'user_' + member.id);

    if (user) {
      user.role = params.role;
      user.fullName = member.name;
      user.fullNameTa = member.nameTa;
      if (params.username) user.username = params.username;
      if (params.phone) user.phone = params.phone;
      if (params.email) user.email = params.email;
      if (params.notes) user.notes = params.notes;
    } else {
      user = {
        id: 'usr_' + member.id + '_' + Date.now().toString(36),
        username: generatedUsername,
        fullName: member.name,
        fullNameTa: member.nameTa,
        phone: params.phone || member.phone,
        email: params.email || '',
        role: params.role,
        memberId: member.id,
        status: 'active',
        createdAt: new Date().toISOString(),
        notes: params.notes || `Mapped from member record ${member.id} (${member.villageWard})`
      };
    }

    await this.putItem('app_users', user);

    await this.addAuditLog(
      actor,
      'MEMBER_ROLE_MAPPED',
      'உறுப்பினருக்கு பொறுப்பு ஒதுக்கப்பட்டது',
      `Member ${member.name} (${member.id}) mapped to RBAC role '${params.role}' as user @${user.username}`,
      `உறுப்பினர் ${member.nameTa} (${member.id}) அவர்களுக்கு '${params.role}' பொறுப்பு ஒதுக்கப்பட்டது (@${user.username})`
    );

    await this.enqueueMutation('member_role_mapping', 'UPDATE', { memberId: member.id, role: params.role, userId: user.id });
    this.notify();
    return user;
  }

  public async getAssistanceRequests(): Promise<AssistanceRequest[]> {
    const list = await this.getAll<AssistanceRequest>('assistance_requests');
    return list.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
  }

  public async saveAssistanceRequest(reqData: Omit<AssistanceRequest, 'id' | 'submittedDate' | 'reviews' | 'syncStatus'>, actor: string, isOffline: boolean = false): Promise<AssistanceRequest> {
    const id = crypto.randomUUID ? crypto.randomUUID() : 'ast_' + Date.now();
    const newReq: AssistanceRequest = {
      ...reqData,
      id,
      submittedDate: new Date().toISOString(),
      reviews: [],
      syncStatus: isOffline ? 'pending' : 'synced'
    };

    await this.putItem('assistance_requests', newReq);
    await this.addAuditLog(
      actor,
      'ASSISTANCE_REQUEST_CREATED',
      'புதிய உதவிக் கோரிக்கை சமர்ப்பிக்கப்பட்டது',
      `Assistance requested for ${newReq.beneficiaryName}: ₹${newReq.requestedAmount} (${newReq.category})`,
      `${newReq.beneficiaryNameTa} அவர்களுக்கு ₹${newReq.requestedAmount} உதவி கோரப்பட்டது`
    );

    if (isOffline) {
      await this.enqueueMutation('assistance_request', 'CREATE', newReq);
    }

    this.notify();
    return newReq;
  }

  public async approveAssistance(
    requestId: string, 
    approvedAmount: number, 
    reviewerRole: UserRole, 
    reviewerName: string, 
    comment: string,
    isOffline: boolean = false
  ): Promise<void> {
    const requests = await this.getAssistanceRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');

    // Check available fund before approval
    const summary = await this.getFundSummary();
    if (approvedAmount > summary.availableBalance) {
      throw new Error(`Cannot approve ₹${approvedAmount}. Available uncommitted fund is only ₹${summary.availableBalance}.`);
    }

    req.approvedAmount = approvedAmount;
    req.status = 'approved';
    req.reviews.push({
      reviewerRole,
      reviewerName,
      decision: 'approve',
      comment: comment || 'Approved by committee',
      timestamp: new Date().toISOString()
    });
    if (isOffline) req.syncStatus = 'pending';

    await this.putItem('assistance_requests', req);
    await this.addAuditLog(
      reviewerName,
      'ASSISTANCE_APPROVED',
      'உதவிக்கு ஒப்புதல் அளிக்கப்பட்டது',
      `Approved ₹${approvedAmount} for ${req.beneficiaryName} by ${reviewerRole}`,
      `${reviewerName} (${reviewerRole}) அவர்களால் ${req.beneficiaryNameTa} உதவிக்கு ₹${approvedAmount} ஒப்புதல் அளிக்கப்பட்டது`
    );

    if (isOffline) {
      await this.enqueueMutation('approval', 'UPDATE', { requestId, approvedAmount, reviewerName, comment });
    }

    this.notify();
  }

  public async rejectAssistance(
    requestId: string, 
    reviewerRole: UserRole, 
    reviewerName: string, 
    comment: string,
    isOffline: boolean = false
  ): Promise<void> {
    const requests = await this.getAssistanceRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');

    req.status = 'rejected';
    req.reviews.push({
      reviewerRole,
      reviewerName,
      decision: 'reject',
      comment: comment || 'Rejected per committee assessment',
      timestamp: new Date().toISOString()
    });
    if (isOffline) req.syncStatus = 'pending';

    await this.putItem('assistance_requests', req);
    await this.addAuditLog(
      reviewerName,
      'ASSISTANCE_REJECTED',
      'உதவி நிராகரிக்கப்பட்டது',
      `Rejected assistance request for ${req.beneficiaryName} (${comment})`,
      `${req.beneficiaryNameTa} அவர்களின் கோரிக்கை நிராகரிக்கப்பட்டது (${comment})`
    );

    if (isOffline) {
      await this.enqueueMutation('approval', 'UPDATE', { requestId, rejected: true, reviewerName, comment });
    }

    this.notify();
  }

  public async disbursePayout(params: {
    requestId: string;
    amount: number; // Registered base amount in INR
    currency?: Currency;
    originalAmount?: number; // AED entered for that period
    exchangeRate?: number; // Exchange rate during that period
    disbursedBy: string;
    paymentMethod: PaymentMethod;
    referenceNumber: string;
    recipientName: string;
    notes?: string;
    isOffline?: boolean;
  }): Promise<void> {
    const requests = await this.getAssistanceRequests();
    const req = requests.find((r) => r.id === params.requestId);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'approved') throw new Error('Only approved requests can be disbursed');

    const payoutId = 'PAY-' + Date.now().toString().slice(-6);
    const currency: Currency = params.currency || 'INR';
    const originalAmount = params.originalAmount !== undefined ? params.originalAmount : params.amount;
    const exchangeRate = params.exchangeRate;

    req.status = 'paid';
    req.payoutDetails = {
      payoutId,
      amount: params.amount, // Registered in INR
      currency,
      originalAmount,
      exchangeRate,
      disbursedDate: new Date().toISOString(),
      disbursedBy: params.disbursedBy,
      paymentMethod: params.paymentMethod,
      referenceNumber: params.referenceNumber,
      recipientName: params.recipientName,
      notes: params.notes
    };
    if (params.isOffline) req.syncStatus = 'pending';
    await this.putItem('assistance_requests', req);

    // Debit ledger in base INR
    const ledger = await this.getLedger();
    const currentBalance = ledger.length > 0 ? ledger[0].balanceAfter : 0;
    if (currentBalance < params.amount) {
      throw new Error(`Insufficient funds in village ledger (Current: ₹${currentBalance}, Needed: ₹${params.amount})`);
    }

    const newBalance = currentBalance - params.amount;
    const descEn = currency === 'AED'
      ? `Disbursed ₹${params.amount.toLocaleString('en-IN')} (entered as ${originalAmount} AED @ rate ${exchangeRate} during period) to ${params.recipientName} for ${req.reason}`
      : `Disbursed ₹${params.amount.toLocaleString('en-IN')} to ${params.recipientName} for ${req.reason}`;

    const descTa = currency === 'AED'
      ? `${params.recipientName} அவர்களுக்கு ₹${params.amount.toLocaleString('en-IN')} உதவி வழங்கப்பட்டது (வளைகுடா பரிவர்த்தனை: ${originalAmount} AED @ மாற்று விகிதம் ₹${exchangeRate})`
      : `${params.recipientName} அவர்களுக்கு ₹${params.amount.toLocaleString('en-IN')} உதவி வழங்கப்பட்டது (${req.reasonTa || req.reason})`;

    const ledgerEntry: LedgerEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'led_' + Date.now(),
      date: new Date().toISOString(),
      type: 'debit',
      category: currency === 'AED' ? `Welfare Payout (UAE Diaspora: ${req.category.toUpperCase()})` : `Welfare Payout: ${req.category.toUpperCase()}`,
      categoryTa: currency === 'AED' ? `நலத்திட்ட உதவி வழங்கல் - UAE பிரிவு (${req.category})` : `நலத்திட்ட உதவி வழங்கல் (${req.category})`,
      amount: params.amount,
      originalCurrency: currency,
      originalAmount,
      exchangeRate,
      balanceAfter: newBalance,
      description: descEn,
      descriptionTa: descTa,
      referenceId: payoutId,
      enteredBy: params.disbursedBy,
      syncStatus: params.isOffline ? 'pending' : 'synced'
    };
    await this.putItem('ledger_entries', ledgerEntry);

    const logAmtStr = currency === 'AED' 
      ? `₹${params.amount} (${originalAmount} AED @ rate ${exchangeRate})` 
      : `₹${params.amount}`;

    await this.addAuditLog(
      params.disbursedBy,
      'PAYOUT_DISBURSED',
      'நிதி வழங்கல் பட்டுவாடா செய்யப்பட்டது',
      `Disbursed ${logAmtStr} to ${params.recipientName} (Ref: ${params.referenceNumber})`,
      `${params.recipientName} அவர்களுக்கு ${logAmtStr} பட்டுவாடா செய்யப்பட்டது (Ref: ${params.referenceNumber})`
    );

    if (params.isOffline) {
      await this.enqueueMutation('payout', 'CREATE', { reqId: req.id, payout: req.payoutDetails });
    }

    this.notify();
  }

  public async getLedger(): Promise<LedgerEntry[]> {
    const list = await this.getAll<LedgerEntry>('ledger_entries');
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const list = await this.getAll<AuditLog>('audit_logs');
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async addAuditLog(actor: string, action: string, actionTa: string, details: string, detailsTa: string): Promise<void> {
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actor,
      action,
      actionTa,
      details,
      detailsTa,
      ipOrDevice: navigator.userAgent.includes('Mobile') ? 'Mobile PWA (Offline Engine)' : 'Web App (PWA Local)'
    };
    await this.putItem('audit_logs', log);
  }

  public async getFundSummary(): Promise<FundSummary> {
    const ledger = await this.getLedger();
    const totalBalance = ledger.length > 0 ? ledger[0].balanceAfter : 0;

    const requests = await this.getAssistanceRequests();
    const approvedUnpaid = requests.filter((r) => r.status === 'approved');
    const committedReserve = approvedUnpaid.reduce((acc, r) => acc + (r.approvedAmount || r.requestedAmount || 0), 0);

    const availableBalance = Math.max(0, totalBalance - committedReserve);

    // Current month calculations
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
    const payments = await this.getPayments();
    const currentMonthPayments = payments.filter((p) => p.month === currentMonth || p.timestamp.startsWith(currentMonth));
    
    const totalCollectedThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.amountInINR || p.amount), 0);
    const totalCollectedThisMonthINR = currentMonthPayments
      .filter((p) => (p.currency || 'INR') === 'INR')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalCollectedThisMonthAED = currentMonthPayments
      .filter((p) => p.currency === 'AED')
      .reduce((sum, p) => sum + p.amount, 0);

    const thisMonthPaidOut = requests
      .filter((r) => r.status === 'paid' && r.payoutDetails?.disbursedDate.startsWith(currentMonth))
      .reduce((sum, r) => sum + (r.payoutDetails?.amount || 0), 0);

    const members = await this.getMembers();
    const dues = await this.getDues(currentMonth);
    const unpaidMembersCount = dues.filter((d) => d.status === 'unpaid' || d.status === 'partial').length;
    const pendingRequestsCount = requests.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;

    return {
      totalBalance,
      committedReserve,
      availableBalance,
      totalCollectedThisMonth,
      totalCollectedThisMonthAED,
      totalCollectedThisMonthINR,
      totalPaidOutThisMonth: thisMonthPaidOut,
      totalActiveMembers: members.filter((m) => m.status === 'active').length,
      unpaidMembersCount,
      pendingRequestsCount
    };
  }

  // --- Sync Mutation Queue (Outbox) ---

  public async enqueueMutation(
    entity: SyncMutation['entity'],
    operation: SyncMutation['operation'],
    payload: any
  ): Promise<string> {
    const id = crypto.randomUUID ? crypto.randomUUID() : 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const mutation: SyncMutation = {
      id,
      timestamp: Date.now(),
      entity,
      operation,
      payload,
      status: 'pending',
      retries: 0
    };
    await this.putItem('sync_mutations', mutation);
    this.notify();
    return id;
  }

  public async getSyncQueue(): Promise<SyncMutation[]> {
    const list = await this.getAll<SyncMutation>('sync_mutations');
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }

  public async removeSyncMutation(id: string): Promise<void> {
    await this.deleteItem('sync_mutations', id);
    this.notify();
  }

  public async clearAllSyncMutations(): Promise<void> {
    await this.init();
    if (!this.db) return;
    const tx = this.db.transaction('sync_mutations', 'readwrite');
    tx.objectStore('sync_mutations').clear();
    this.notify();
  }

  // --- Backup & Restore ---

  public async exportAllData(): Promise<string> {
    const data = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      members: await this.getMembers(),
      dues: await this.getAll<ContributionDue>('dues'),
      payments: await this.getPayments(),
      assistance_requests: await this.getAssistanceRequests(),
      ledger_entries: await this.getLedger(),
      audit_logs: await this.getAuditLogs(),
      sync_mutations: await this.getSyncQueue(),
      aed_monthly_payouts: await this.getAedMonthlyPayouts(),
      app_users: await this.getUsers()
    };
    return JSON.stringify(data, null, 2);
  }

  // --- CSV Export Utilities (with UTF-8 BOM for Excel / Google Sheets compatibility) ---
  private formatCsvValue(val: any): string {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  public async exportLedgerToCSV(): Promise<string> {
    const list = await this.getLedger();
    const headers = [
      'Date',
      'Transaction ID',
      'Type',
      'Category',
      'Description',
      'Amount (INR)',
      'Original Currency',
      'Original Amount',
      'Exchange Rate',
      'Balance After (INR)',
      'Entered By',
      'Reference ID'
    ];

    const rows = list.map((l) => [
      l.date,
      l.id,
      l.type.toUpperCase(),
      l.category,
      l.description,
      l.amount,
      l.originalCurrency || 'INR',
      l.originalAmount !== undefined ? l.originalAmount : l.amount,
      l.exchangeRate || 1,
      l.balanceAfter,
      l.enteredBy,
      l.referenceId
    ]);

    const csvContent = [
      headers.map((h) => this.formatCsvValue(h)).join(','),
      ...rows.map((r) => r.map((c) => this.formatCsvValue(c)).join(','))
    ].join('\r\n');

    return '\uFEFF' + csvContent;
  }

  public async exportPaymentsToCSV(): Promise<string> {
    const payments = await this.getPayments();
    const members = await this.getMembers();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const headers = [
      'Receipt Number',
      'Date & Time',
      'Month',
      'Member ID',
      'Member Name',
      'Member Name (Tamil)',
      'Ward / Location',
      'Currency',
      'Amount',
      'Realized Rate',
      'Amount in INR',
      'Payment Method',
      'Reference Number',
      'Recorded By',
      'Remittance Batch ID'
    ];

    const rows = payments.map((p) => {
      const m = memberMap.get(p.memberId);
      return [
        p.receiptNumber,
        p.timestamp,
        p.month,
        p.memberId,
        p.memberName,
        p.memberNameTa || (m ? m.nameTa : ''),
        m ? m.villageWard : '',
        p.currency || 'INR',
        p.amount,
        p.exchangeRate || 1,
        p.amountInINR !== undefined ? p.amountInINR : p.amount,
        p.method,
        p.referenceNumber,
        p.recordedBy,
        p.remittancePayoutId || ''
      ];
    });

    const csvContent = [
      headers.map((h) => this.formatCsvValue(h)).join(','),
      ...rows.map((r) => r.map((c) => this.formatCsvValue(c)).join(','))
    ].join('\r\n');

    return '\uFEFF' + csvContent;
  }

  public async exportAssistanceToCSV(): Promise<string> {
    const requests = await this.getAssistanceRequests();
    const headers = [
      'Request ID',
      'Beneficiary Name',
      'Beneficiary Name (Tamil)',
      'Phone',
      'Category',
      'Priority',
      'Status',
      'Requested Amount',
      'Approved Amount',
      'Reason',
      'Submitted By',
      'Submitted Date',
      'Payout ID',
      'Disbursed Date',
      'Disbursed By',
      'Payment Method',
      'Disbursed Amount (INR)',
      'Recipient Name',
      'Notes'
    ];

    const rows = requests.map((r) => [
      r.id,
      r.beneficiaryName,
      r.beneficiaryNameTa || '',
      r.beneficiaryPhone,
      r.category.toUpperCase(),
      r.priority.toUpperCase(),
      r.status.toUpperCase(),
      r.requestedAmount,
      r.approvedAmount || '',
      r.reason,
      r.submittedBy,
      r.submittedDate,
      r.payoutDetails?.payoutId || '',
      r.payoutDetails?.disbursedDate || '',
      r.payoutDetails?.disbursedBy || '',
      r.payoutDetails?.paymentMethod || '',
      r.payoutDetails?.amount || '',
      r.payoutDetails?.recipientName || '',
      r.payoutDetails?.notes || ''
    ]);

    const csvContent = [
      headers.map((h) => this.formatCsvValue(h)).join(','),
      ...rows.map((r) => r.map((c) => this.formatCsvValue(c)).join(','))
    ].join('\r\n');

    return '\uFEFF' + csvContent;
  }

  public async exportMembersToCSV(): Promise<string> {
    const members = await this.getMembers();
    const headers = [
      'Member ID',
      'Full Name (English)',
      'Full Name (Tamil)',
      'Phone Number',
      'Email',
      'Village Ward / Gulf Location',
      'Chapter',
      'Role',
      'Status',
      'Currency',
      'Monthly Pledge',
      'Joined Date'
    ];

    const rows = members.map((m) => [
      m.id,
      m.name,
      m.nameTa,
      m.phone,
      m.email || '',
      m.villageWard,
      m.isGulfMember ? 'UAE Diaspora' : 'Local Village',
      m.role,
      m.status,
      m.currency,
      m.monthlyPledge,
      m.joinedDate
    ]);

    const csvContent = [
      headers.map((h) => this.formatCsvValue(h)).join(','),
      ...rows.map((r) => r.map((c) => this.formatCsvValue(c)).join(','))
    ].join('\r\n');

    return '\uFEFF' + csvContent;
  }

  public async importAllData(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const stores = ['members', 'dues', 'payments', 'assistance_requests', 'ledger_entries', 'audit_logs', 'sync_mutations', 'aed_monthly_payouts', 'app_users', 'financial_amendments'];
    for (const storeName of stores) {
      if (Array.isArray(data[storeName])) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of data[storeName]) {
          store.put(item);
        }
      }
    }
    this.notify();
  }

  public async resetToSeed(): Promise<void> {
    await this.init();
    if (!this.db) return;
    const stores = ['members', 'dues', 'payments', 'assistance_requests', 'ledger_entries', 'audit_logs', 'sync_mutations', 'aed_monthly_payouts', 'app_users', 'financial_amendments'];
    for (const s of stores) {
      const tx = this.db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
    }
    await this.seedInitialRecords();
    this.notify();
  }

  // --- Financial Amendment & Committee Approval Methods ---

  public async getFinancialAmendments(): Promise<FinancialAmendmentRequest[]> {
    const list = await this.getAll<FinancialAmendmentRequest>('financial_amendments');
    return list.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
  }

  public async createFinancialAmendment(
    data: Omit<FinancialAmendmentRequest, 'id' | 'submittedDate' | 'reviews' | 'status'>,
    actor: string
  ): Promise<FinancialAmendmentRequest> {
    const id = crypto.randomUUID ? crypto.randomUUID() : 'amd_' + Date.now();
    const newReq: FinancialAmendmentRequest = {
      ...data,
      id,
      submittedDate: new Date().toISOString(),
      status: 'submitted',
      reviews: []
    };
    await this.putItem('financial_amendments', newReq);
    await this.addAuditLog(
      actor,
      'FINANCIAL_AMENDMENT_REQUESTED',
      'நிதி திருத்த கோரிக்கை சமர்ப்பிக்கப்பட்டது',
      `Amendment requested for ${newReq.targetType} (${newReq.targetId}) by ${actor}: ${newReq.reason}`,
      `${actor} அவர்களால் ${newReq.targetType} திருத்தக் கோரிக்கை சமர்ப்பிக்கப்பட்டது`
    );
    this.notify();
    return newReq;
  }

  public async reviewFinancialAmendment(
    amendmentId: string,
    decision: 'approve' | 'reject' | 'modify',
    reviewerRole: UserRole,
    reviewerName: string,
    comment: string
  ): Promise<void> {
    const list = await this.getFinancialAmendments();
    const req = list.find((r) => r.id === amendmentId);
    if (!req) throw new Error('Amendment request not found');

    req.reviews.push({
      reviewerRole,
      reviewerName,
      decision,
      comment: comment || 'Committee review decision',
      timestamp: new Date().toISOString()
    });

    const approvals = req.reviews.filter((r) => r.decision === 'approve').length;
    const rejections = req.reviews.filter((r) => r.decision === 'reject').length;

    if (rejections > 0) {
      req.status = 'rejected';
    } else if (approvals >= 2) {
      req.status = 'approved';
    } else {
      req.status = 'under_review';
    }

    await this.putItem('financial_amendments', req);
    await this.addAuditLog(
      reviewerName,
      'FINANCIAL_AMENDMENT_REVIEWED',
      'நிதி திருத்த கோரிக்கை மதிப்பாய்வு',
      `Amendment ${req.id} reviewed by ${reviewerName} (${reviewerRole}): ${decision}`,
      `${reviewerName} (${reviewerRole}) அவர்களால் திருத்தக் கோரிக்கை மதிப்பாய்வு செய்யப்பட்டது: ${decision}`
    );
    this.notify();
  }

  public async applyFinancialAmendment(amendmentId: string, actor: string): Promise<void> {
    const list = await this.getFinancialAmendments();
    const req = list.find((r) => r.id === amendmentId);
    if (!req) throw new Error('Amendment request not found');
    if (req.status !== 'approved') throw new Error('Amendment must be approved by committee before applying');

    if (req.targetType === 'payment') {
      const pays = await this.getPayments();
      const p = pays.find((x) => x.id === req.targetId);
      if (p) {
        Object.assign(p, req.proposedChanges);
        await this.putItem('payments', p);
      }
    } else if (req.targetType === 'due') {
      const dues = await this.getDues(req.month);
      const d = dues.find((x) => x.id === req.targetId);
      if (d) {
        Object.assign(d, req.proposedChanges);
        await this.putItem('dues', d);
      }
    } else if (req.targetType === 'ledger') {
      const ledger = await this.getLedger();
      const l = ledger.find((x) => x.id === req.targetId);
      if (l) {
        Object.assign(l, req.proposedChanges);
        await this.putItem('ledger_entries', l);
      }
    }

    req.status = 'applied';
    await this.putItem('financial_amendments', req);
    await this.addAuditLog(
      actor,
      'FINANCIAL_AMENDMENT_APPLIED',
      'ஒப்புதல் அளிக்கப்பட்ட நிதித் திருத்தம் நடைமுறைப்படுத்தப்பட்டது',
      `Approved financial amendment ${req.id} applied to ${req.targetType} (${req.targetId}) by ${actor}`,
      `ஒப்புதல் அளிக்கப்பட்ட நிதித் திருத்தம் நடைமுறைப்படுத்தப்பட்டது (${req.targetType})`
    );
    this.notify();
  }

  // --- Seed Data with INR and UAE Dirhams (AED) ---

  private async ensureSeedData(): Promise<void> {
    const members = await this.getAll<Member>('members');
    if (members.length === 0) {
      await this.seedInitialRecords();
    } else {
      const users = await this.getAll<AppUser>('app_users');
      if (users.length === 0) {
        await this.seedInitialUsers();
      } else {
        // Ensure Super Admin smdfaizel@gmail.com is present
        const hasAdmin = users.some((u) => u.email?.toLowerCase() === 'smdfaizel@gmail.com');
        if (!hasAdmin) {
          const adminUser: AppUser = {
            id: 'usr_admin',
            username: 'admin',
            fullName: 'SMD Faizel',
            fullNameTa: 'எஸ்.எம்.டி. பைசல்',
            phone: '+971 50 889 0123',
            email: 'smdfaizel@gmail.com',
            role: 'admin',
            status: 'active',
            lastLogin: new Date().toISOString(),
            createdAt: '2025-01-01T00:00:00Z',
            notes: 'Primary Super Administrator with unrestricted governance control'
          };
          await this.putItem('app_users', adminUser);
        }
      }
    }
  }

  public async seedInitialUsers(): Promise<void> {
    const initialUsers: AppUser[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        fullName: 'SMD Faizel',
        fullNameTa: 'எஸ்.எம்.டி. பைசல்',
        phone: '+971 50 889 0123',
        email: 'smdfaizel@gmail.com',
        role: 'admin',
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: '2025-01-01T00:00:00Z',
        notes: 'Primary Super Administrator with unrestricted governance control',
        password: '+971 50 889 0123'
      },
      {
        id: 'usr_m1',
        username: 'tmk001',
        fullName: 'M. Muthukumar',
        fullNameTa: 'மு. முத்துக்குமார்',
        phone: '98421 10293',
        email: 'muthukumar@gmail.com',
        role: 'committee',
        memberId: 'm1',
        status: 'active',
        lastLogin: '2026-11-06T15:20:00Z',
        createdAt: '2025-01-10T10:00:00Z',
        notes: 'Village Trust Committee Member',
        password: '98421 10293'
      },
      {
        id: 'usr_m2',
        username: 'tmk002',
        fullName: 'S. Selvarani',
        fullNameTa: 'செ. செல்வராணி',
        phone: '94432 87612',
        email: 'selvarani@gmail.com',
        role: 'treasurer',
        memberId: 'm2',
        status: 'active',
        lastLogin: '2026-11-07T09:15:00Z',
        createdAt: '2025-01-10T10:00:00Z',
        notes: 'Fund Treasurer - Collections, Dues, and Payout Disbursals',
        password: '94432 87612'
      },
      {
        id: 'usr_m3',
        username: 'tmk003',
        fullName: 'K. Anbalagan',
        fullNameTa: 'கு. அன்பழகன்',
        phone: '97890 23411',
        email: 'anbalagan@gmail.com',
        role: 'committee',
        memberId: 'm3',
        status: 'active',
        lastLogin: '2026-11-05T14:10:00Z',
        createdAt: '2025-01-10T10:00:00Z',
        notes: 'Village Trust Committee Member',
        password: '97890 23411'
      },
      {
        id: 'usr_m5',
        username: 'uae001',
        fullName: 'S. Syed Ibrahim',
        fullNameTa: 'செ. சையது இப்ராஹிம்',
        phone: '+971 50 123 4567',
        email: 'syed.ibrahim@gmail.com',
        role: 'committee',
        memberId: 'm5',
        status: 'active',
        lastLogin: '2026-11-06T20:45:00Z',
        createdAt: '2025-02-15T12:00:00Z',
        notes: 'UAE Chapter Convenor - Welfare Committee',
        password: '+971 50 123 4567'
      },
      {
        id: 'usr_m8',
        username: 'tmk004',
        fullName: 'V. Sundaram',
        fullNameTa: 'வெ. சுந்தரம்',
        phone: '99441 55601',
        email: 'sundaram.audit@gmail.com',
        role: 'auditor',
        memberId: 'm8',
        status: 'active',
        lastLogin: '2026-11-04T16:30:00Z',
        createdAt: '2025-01-15T11:00:00Z',
        notes: 'Independent Financial Auditor - Read-only access & ledger audit',
        password: '99441 55601'
      },
      {
        id: 'usr_m6',
        username: 'uae002',
        fullName: 'K. Rajendran',
        fullNameTa: 'கா. ராஜேந்திரன்',
        phone: '+971 55 987 6543',
        email: 'rajendran@gmail.com',
        role: 'member',
        memberId: 'm6',
        status: 'active',
        lastLogin: '2026-11-03T18:00:00Z',
        createdAt: '2025-01-15T12:00:00Z',
        notes: 'UAE Diaspora Community Member',
        password: '+971 55 987 6543'
      }
    ];

    for (const u of initialUsers) {
      await this.putItem('app_users', u);
    }
  }

  private async seedInitialRecords(): Promise<void> {
    await this.seedInitialUsers();
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-11"
    const prevMonth = '2026-10';

    const initialMembers: Member[] = [
      { id: 'm1', name: 'M. Muthukumar', nameTa: 'மு. முத்துக்குமார்', phone: '98421 10293', villageWard: 'Ward 1 - North Street', status: 'active', role: 'committee', currency: 'INR', monthlyPledge: 500, joinedDate: '2025-01-10', avatarSeed: 'muthu' },
      { id: 'm2', name: 'S. Selvarani', nameTa: 'செ. செல்வராணி', phone: '94432 87612', villageWard: 'Ward 2 - Middle Street', status: 'active', role: 'treasurer', currency: 'INR', monthlyPledge: 500, joinedDate: '2025-01-10', avatarSeed: 'selvi' },
      { id: 'm3', name: 'K. Anbalagan', nameTa: 'கு. அன்பழகன்', phone: '97890 23411', villageWard: 'Ward 1 - School Lane', status: 'active', role: 'committee', currency: 'INR', monthlyPledge: 300, joinedDate: '2025-01-10', avatarSeed: 'anbu' },
      { id: 'm4', name: 'R. Karuppiah', nameTa: 'ரா. கருப்பையா', phone: '96554 99120', villageWard: 'Ward 3 - East Colony', status: 'active', role: 'committee', currency: 'INR', monthlyPledge: 250, joinedDate: '2025-02-01', avatarSeed: 'karuppu' },
      // UAE Expatriate Members (Contributing in AED)
      { id: 'm5', name: 'S. Syed Ibrahim', nameTa: 'செ. சையது இப்ராஹிம்', phone: '+971 50 123 4567', villageWard: 'UAE - Deira, Dubai', status: 'active', role: 'committee', currency: 'AED', monthlyPledge: 50, isGulfMember: true, gulfCity: 'Dubai', joinedDate: '2025-02-15', avatarSeed: 'syed' },
      { id: 'm6', name: 'K. Rajendran', nameTa: 'கா. ராஜேந்திரன்', phone: '+971 55 987 6543', villageWard: 'UAE - Mussafah, Abu Dhabi', status: 'active', role: 'member', currency: 'AED', monthlyPledge: 100, isGulfMember: true, gulfCity: 'Abu Dhabi', joinedDate: '2025-01-15', avatarSeed: 'rajen' },
      { id: 'm7', name: 'M. Hameed', nameTa: 'மு. ஹமீத்', phone: '+971 52 443 8901', villageWard: 'UAE - Rolla, Sharjah', status: 'active', role: 'member', currency: 'AED', monthlyPledge: 50, isGulfMember: true, gulfCity: 'Sharjah', joinedDate: '2025-03-01', avatarSeed: 'hameed' },
      // Local Village Members
      { id: 'm8', name: 'V. Sundaram', nameTa: 'வெ. சுந்தரம்', phone: '99441 55601', villageWard: 'Ward 4 - South Garden', status: 'active', role: 'auditor', currency: 'INR', monthlyPledge: 300, joinedDate: '2025-01-15', avatarSeed: 'sundar' },
      { id: 'm9', name: 'A. Thangaraj', nameTa: 'ஆ. தங்கராஜ்', phone: '94880 77412', villageWard: 'Ward 3 - Post Office St', status: 'active', role: 'member', currency: 'INR', monthlyPledge: 200, joinedDate: '2025-03-01', avatarSeed: 'thanga' },
      { id: 'm10', name: 'T. Kavitha', nameTa: 'தி. கவிதா', phone: '97510 44230', villageWard: 'Ward 1 - West Street', status: 'active', role: 'member', currency: 'INR', monthlyPledge: 200, joinedDate: '2025-03-10', avatarSeed: 'kavi' },
      { id: 'm11', name: 'N. Jeyalakshmi', nameTa: 'நா. ஜெயலட்சுமி', phone: '98401 92834', villageWard: 'Ward 2 - Bazaar Road', status: 'active', role: 'member', currency: 'INR', monthlyPledge: 250, joinedDate: '2025-04-01', avatarSeed: 'jeya' },
      { id: 'm12', name: 'B. Senthil Kumar', nameTa: 'பா. செந்தில்குமார்', phone: '94420 18273', villageWard: 'Ward 3 - River Bank', status: 'active', role: 'member', currency: 'INR', monthlyPledge: 200, joinedDate: '2025-04-12', avatarSeed: 'senthil' },
    ];

    for (const m of initialMembers) {
      await this.putItem('members', m);
    }

    // Previous month dues & payments (with UAE Dirhams conversions)
    const seedPayments: PaymentReceipt[] = [
      { id: 'p1', receiptNumber: 'RCP-89012', memberId: 'm1', memberName: 'M. Muthukumar', memberNameTa: 'மு. முத்துக்குமார்', month: prevMonth, currency: 'INR', amount: 500, exchangeRate: 1, amountInINR: 500, method: 'upi', referenceNumber: 'UPI-43289012', recordedBy: 'Treasurer', timestamp: '2026-10-05T10:30:00Z', syncStatus: 'synced' },
      { id: 'p2', receiptNumber: 'RCP-89013', memberId: 'm2', memberName: 'S. Selvarani', memberNameTa: 'செ. செல்வராணி', month: prevMonth, currency: 'INR', amount: 500, exchangeRate: 1, amountInINR: 500, method: 'bank_transfer', referenceNumber: 'NEFT-009823', recordedBy: 'Treasurer', timestamp: '2026-10-06T11:00:00Z', syncStatus: 'synced' },
      { id: 'p3', receiptNumber: 'RCP-89014', memberId: 'm5', memberName: 'S. Syed Ibrahim', memberNameTa: 'செ. சையது இப்ராஹிம்', month: prevMonth, currency: 'AED', amount: 50, exchangeRate: 22.80, amountInINR: 1140, method: 'exchange_house', referenceNumber: 'AL-ANSARI-99120', recordedBy: 'Treasurer', timestamp: '2026-10-06T17:15:00Z', syncStatus: 'synced' },
      { id: 'p4', receiptNumber: 'RCP-89015', memberId: 'm4', memberName: 'R. Karuppiah', memberNameTa: 'ரா. கருப்பையா', month: prevMonth, currency: 'INR', amount: 250, exchangeRate: 1, amountInINR: 250, method: 'cash', referenceNumber: 'CASH-REC-1022', recordedBy: 'Treasurer', timestamp: '2026-10-07T09:20:00Z', syncStatus: 'synced' },
      
      // Current Month Payments
      { id: 'p5', receiptNumber: 'RCP-91001', memberId: 'm1', memberName: 'M. Muthukumar', memberNameTa: 'மு. முத்துக்குமார்', month: currentMonth, currency: 'INR', amount: 500, exchangeRate: 1, amountInINR: 500, method: 'upi', referenceNumber: 'UPI-55610293', recordedBy: 'Treasurer', timestamp: '2026-11-02T10:15:00Z', syncStatus: 'synced' },
      { id: 'p6', receiptNumber: 'RCP-91002', memberId: 'm5', memberName: 'S. Syed Ibrahim', memberNameTa: 'செ. சையது இப்ராஹிம்', month: currentMonth, currency: 'AED', amount: 50, exchangeRate: 22.80, amountInINR: 1140, method: 'exchange_house', referenceNumber: 'AL-ANSARI-10492', recordedBy: 'Treasurer', timestamp: '2026-11-03T11:45:00Z', syncStatus: 'synced' },
      { id: 'p7', receiptNumber: 'RCP-91003', memberId: 'm6', memberName: 'K. Rajendran', memberNameTa: 'கா. ராஜேந்திரன்', month: currentMonth, currency: 'AED', amount: 100, exchangeRate: 22.80, amountInINR: 2280, method: 'botim', referenceNumber: 'BOTIM-UAE-8812', recordedBy: 'Treasurer', timestamp: '2026-11-04T14:30:00Z', syncStatus: 'synced' },
      { id: 'p8', receiptNumber: 'RCP-91004', memberId: 'm3', memberName: 'K. Anbalagan', memberNameTa: 'கு. அன்பழகன்', month: currentMonth, currency: 'INR', amount: 300, exchangeRate: 1, amountInINR: 300, method: 'cash', referenceNumber: 'CASH-REC-3301', recordedBy: 'Treasurer', timestamp: '2026-11-04T16:00:00Z', syncStatus: 'synced' },
    ];

    for (const p of seedPayments) {
      await this.putItem('payments', p);
    }

    // Current month dues
    for (const m of initialMembers) {
      const paidRec = seedPayments.find((p) => p.memberId === m.id && p.month === currentMonth);
      const amtPaid = paidRec ? paidRec.amount : 0;
      const amtPaidINR = paidRec ? paidRec.amountInINR : 0;
      const due: ContributionDue = {
        id: `due_${m.id}_${currentMonth}`,
        memberId: m.id,
        memberName: m.name,
        memberNameTa: m.nameTa,
        month: currentMonth,
        currency: m.currency,
        amountDue: m.monthlyPledge,
        amountPaid: amtPaid,
        amountPaidINR: amtPaidINR,
        status: amtPaid >= m.monthlyPledge ? 'paid' : (amtPaid > 0 ? 'partial' : 'unpaid'),
        dueDate: `${currentMonth}-10`
      };
      await this.putItem('dues', due);
    }

    const initialAedPayouts: AedMonthlyPayout[] = [
      {
        id: 'AED-PAY-2026-10-001',
        payoutNumber: 'REMIT-OCT-9901',
        month: prevMonth,
        totalAedAmount: 50,
        conversionRate: 22.80,
        generatedInrAmount: 1140,
        generatedDate: '2026-10-08T18:00:00Z',
        generatedBy: 'Treasurer',
        remittanceProvider: 'Al Ansari Exchange (Dubai)',
        referenceNumber: 'AL-ANSARI-99120',
        notes: 'October UAE Chapter diaspora monthly remittance to village corpus',
        memberBreakdown: [
          {
            memberId: 'm5',
            memberName: 'S. Syed Ibrahim',
            memberNameTa: 'செ. சையது இப்ராஹிம்',
            aedAmount: 50,
            inrEquivalent: 1140
          }
        ],
        syncStatus: 'synced'
      }
    ];

    for (const ap of initialAedPayouts) {
      await this.putItem('aed_monthly_payouts', ap);
    }

    // Double-entry ledger history (with base INR accounting)
    const seedLedger: LedgerEntry[] = [
      {
        id: 'led_1',
        date: '2026-10-01T09:00:00Z',
        type: 'credit',
        category: 'Opening Community Corpus',
        categoryTa: 'தொடக்க கிராம பொது நிதி மூலதனம்',
        amount: 82000,
        balanceAfter: 82000,
        description: 'Corpus transferred from previous year village welfare trust',
        descriptionTa: 'முந்தைய ஆண்டின் கிராம பொது நல நிதியிலிருந்து வரவு வைக்கப்பட்டது',
        referenceId: 'OPEN-2026',
        enteredBy: 'Treasurer',
        syncStatus: 'synced'
      },
      {
        id: 'led_2',
        date: '2026-10-08T18:00:00Z',
        type: 'credit',
        category: 'October Member Dues & Remittance',
        categoryTa: 'அக்டோபர் மாத சந்தா வசூல் & திர்காம் வரவு',
        amount: 2390,
        balanceAfter: 84390,
        description: 'October collections: ₹1,250 INR + 50 AED Remittance Payout (₹1,140 @ 22.80 rate)',
        descriptionTa: 'அக்டோபர் மாத சந்தா வசூல்: ₹1,250 உள்ளூர் + 50 AED திர்காம் பரிமாற்ற வரவு (ரூ. 1,140)',
        referenceId: 'BATCH-OCT',
        enteredBy: 'Treasurer',
        syncStatus: 'synced'
      },
      {
        id: 'led_3',
        date: '2026-10-15T12:00:00Z',
        type: 'debit',
        category: 'Welfare Payout: HEALTH',
        categoryTa: 'நலத்திட்ட உதவி வழங்கல் (மருத்துவம்)',
        amount: 5000,
        balanceAfter: 79390,
        description: 'Medical emergency aid for Periasamy (Dialysis copay)',
        descriptionTa: 'பெரியசாமி அவர்களுக்கு அவசர டயாலிசிஸ் சிகிச்சை உதவித் தொகை',
        referenceId: 'PAY-10041',
        enteredBy: 'Treasurer',
        syncStatus: 'synced'
      },
      {
        id: 'led_3b',
        date: '2026-10-23T15:00:00Z',
        type: 'debit',
        category: 'Welfare Payout (UAE Diaspora: HARDSHIP)',
        categoryTa: 'நலத்திட்ட உதவி வழங்கல் - UAE பிரிவு (வறுமை நிவாரணம்)',
        amount: 4560,
        originalCurrency: 'AED',
        originalAmount: 200,
        exchangeRate: 22.80,
        balanceAfter: 74830,
        description: 'Disbursed ₹4,560 (entered as 200 AED @ rate 22.80 during period) to P. Alagumalai for Roof repair relief',
        descriptionTa: 'பா. அழகுமலை அவர்களுக்கு ₹4,560 உதவி வழங்கப்பட்டது (வளைகுடா பரிவர்த்தனை: 200 AED @ மாற்று விகிதம் ₹22.80)',
        referenceId: 'PAY-10048',
        enteredBy: 'Treasurer',
        syncStatus: 'synced'
      },
      {
        id: 'led_4',
        date: '2026-11-04T18:00:00Z',
        type: 'credit',
        category: 'November Local Member Dues (INR)',
        categoryTa: 'நவம்பர் மாத உள்ளூர் சந்தா வரவு',
        amount: 800,
        balanceAfter: 75630,
        description: 'November collections: ₹800 INR from village members (Muthukumar ₹500, Anbalagan ₹300). UAE pool 150 AED pending monthly remittance.',
        descriptionTa: 'நவம்பர் மாத உள்ளூர் சந்தா வரவு: ₹800 (முத்துக்குமார் ₹500, அன்பழகன் ₹300). வளைகுடா 150 AED மாதாந்திர பரிமாற்றத்திற்கு காத்திருக்கிறது.',
        referenceId: 'BATCH-NOV-1',
        enteredBy: 'Treasurer',
        syncStatus: 'synced'
      }
    ];

    for (const l of seedLedger) {
      await this.putItem('ledger_entries', l);
    }

    // Assistance requests
    const seedRequests: AssistanceRequest[] = [
      {
        id: 'ast_101',
        beneficiaryName: 'R. Soundaram',
        beneficiaryNameTa: 'ரா. சௌந்தரம்',
        beneficiaryPhone: '98421 99012',
        category: 'education',
        requestedAmount: 6000,
        approvedAmount: 6000,
        reason: 'College engineering first semester fee aid for bright village student',
        reasonTa: 'பொறியியல் கல்லூரியில் சேர்ந்த கிராம மாணவிக்கான முதல் பருவ கல்வி கட்டண உதவி',
        priority: 'high',
        status: 'approved',
        submittedBy: 'K. Anbalagan (Secretary)',
        submittedDate: '2026-11-01T10:00:00Z',
        reviews: [
          { reviewerRole: 'committee', reviewerName: 'M. Muthukumar', decision: 'approve', comment: 'Deserving student. Marksheet verified with +2 marks 94%.', timestamp: '2026-11-02T14:00:00Z' },
          { reviewerRole: 'treasurer', reviewerName: 'S. Selvarani', decision: 'approve', comment: 'Funds available in education reserve.', timestamp: '2026-11-03T10:00:00Z' }
        ],
        syncStatus: 'synced'
      },
      {
        id: 'ast_102',
        beneficiaryName: 'K. Mariyappan',
        beneficiaryNameTa: 'கா. மாரியப்பன்',
        beneficiaryPhone: '97881 22401',
        category: 'health',
        requestedAmount: 8000,
        reason: 'Cataract eye surgery and medicine support for senior agricultural laborer',
        reasonTa: 'மூத்த விவசாய தொழிலாளி மாரியப்பன் அவர்களுக்கு கண் புரை அறுவை சிகிச்சை மற்றும் மருந்து உதவி',
        priority: 'urgent',
        status: 'under_review',
        submittedBy: 'R. Karuppiah (Committee)',
        submittedDate: '2026-11-04T09:30:00Z',
        reviews: [
          { reviewerRole: 'committee', reviewerName: 'S. Syed Ibrahim', decision: 'approve', comment: 'Supported by UAE chapter. Verified medical condition.', timestamp: '2026-11-05T11:00:00Z' }
        ],
        syncStatus: 'synced'
      },
      {
        id: 'ast_103',
        beneficiaryName: 'M. Periasamy',
        beneficiaryNameTa: 'மு. பெரியசாமி',
        beneficiaryPhone: '94431 88120',
        category: 'health',
        requestedAmount: 5000,
        approvedAmount: 5000,
        reason: 'Dialysis treatment copay assistance',
        reasonTa: 'மாதாந்திர டயாலிசிஸ் சிகிச்சைக்கான மருந்து உதவி',
        priority: 'urgent',
        status: 'paid',
        submittedBy: 'K. Anbalagan',
        submittedDate: '2026-10-12T10:00:00Z',
        reviews: [
          { reviewerRole: 'committee', reviewerName: 'M. Muthukumar', decision: 'approve', comment: 'Approved for urgent health care', timestamp: '2026-10-13T12:00:00Z' }
        ],
        payoutDetails: {
          payoutId: 'PAY-10041',
          amount: 5000,
          disbursedDate: '2026-10-15T12:00:00Z',
          disbursedBy: 'S. Selvarani (Treasurer)',
          paymentMethod: 'bank_transfer',
          referenceNumber: 'NEFT-8839210',
          recipientName: 'M. Periasamy'
        },
        syncStatus: 'synced'
      },
      {
        id: 'ast_104',
        beneficiaryName: 'P. Alagumalai',
        beneficiaryNameTa: 'பா. அழகுமலை',
        beneficiaryPhone: '98420 55102',
        category: 'hardship',
        currency: 'AED',
        originalRequestedAmount: 200,
        exchangeRate: 22.80,
        requestedAmount: 4560,
        approvedAmount: 4560,
        reason: 'Roof repair and relief aid sponsored by Dubai community wing',
        reasonTa: 'துபாய் கிளை உறுப்பினர்கள் நிதியுதவியில் கூரை சீரமைப்பு நிவாரண உதவி',
        priority: 'high',
        status: 'paid',
        submittedBy: 'S. Syed Ibrahim (UAE Committee)',
        submittedDate: '2026-10-20T10:00:00Z',
        reviews: [
          { reviewerRole: 'committee', reviewerName: 'S. Syed Ibrahim', decision: 'approve', comment: 'Sponsored from UAE welfare pool', timestamp: '2026-10-21T11:00:00Z' },
          { reviewerRole: 'committee', reviewerName: 'M. Muthukumar', decision: 'approve', comment: 'Approved for urgent roof rehabilitation', timestamp: '2026-10-22T09:30:00Z' }
        ],
        payoutDetails: {
          payoutId: 'PAY-10048',
          amount: 4560,
          currency: 'AED',
          originalAmount: 200,
          exchangeRate: 22.80,
          disbursedDate: '2026-10-23T15:00:00Z',
          disbursedBy: 'S. Selvarani (Treasurer)',
          paymentMethod: 'exchange_house',
          referenceNumber: 'AL-ANSARI-90412',
          recipientName: 'P. Alagumalai',
          notes: 'Remitted via Al Ansari Exchange Dubai Deira Branch'
        },
        syncStatus: 'synced'
      }
    ];

    for (const r of seedRequests) {
      await this.putItem('assistance_requests', r);
    }

    // Initial audit log
    await this.addAuditLog(
      'System Engine',
      'CORPUS_INITIALIZED',
      'நிதிக் கணக்கு தொடங்கப்பட்டது',
      'Village Community Fund database initialized with Multi-Currency (INR & UAE Dirhams) support. Balance: ₹83,610',
      'கிராம சமுதாய நிதி பேரேடு இந்திய ரூபாய் மற்றும் யு.ஏ.இ திர்காம் நாணய ஆதரவுடன் தொடங்கப்பட்டது'
    );
  }

  public async getOrganizationInfo(): Promise<OrganizationInfo> {
    try {
      const stored = localStorage.getItem('gramanidhi_org_info');
      if (stored) {
        return { ...DEFAULT_ORG_INFO, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to parse organization info from storage', e);
    }
    return DEFAULT_ORG_INFO;
  }

  public async saveOrganizationInfo(info: OrganizationInfo): Promise<void> {
    localStorage.setItem('gramanidhi_org_info', JSON.stringify(info));
    this.notify();
  }
}

export const localDB = new LocalDatabase();
