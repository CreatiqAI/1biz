'use client'
import { useState } from 'react'
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useBankTransactions,
  useCreateBankTransaction,
  useMatchBankTransaction,
  useUnmatchBankTransaction,
} from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const TYPE_BADGE: Record<string, string> = {
  DEBIT: 'bg-red-100 text-red-700',
  CREDIT: 'bg-green-100 text-green-700',
}

const STATUS_BADGE: Record<string, string> = {
  UNMATCHED: 'bg-amber-100 text-amber-700',
  MATCHED: 'bg-blue-100 text-blue-700',
  RECONCILED: 'bg-green-100 text-green-700',
}

const ACCOUNT_TYPE_BADGE: Record<string, string> = {
  SAVINGS: 'bg-blue-100 text-blue-700',
  CURRENT: 'bg-purple-100 text-purple-700',
  FIXED_DEPOSIT: 'bg-amber-100 text-amber-700',
}

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CURRENT', label: 'Current' },
  { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
]

function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num
  return '****' + num.slice(-4)
}

export default function BankingPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  // Data hooks
  const { data: bankAccounts = [], isLoading, error } = useBankAccounts()
  const { data: transactions = [], isLoading: txLoading } = useBankTransactions(selectedAccountId ?? '')
  const createBankAccount = useCreateBankAccount()
  const deleteBankAccount = useDeleteBankAccount()
  const createBankTransaction = useCreateBankTransaction()
  const matchTransaction = useMatchBankTransaction()
  const unmatchTransaction = useUnmatchBankTransaction()

  // Bank account form state
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountType, setAccountType] = useState('CURRENT')
  const [openingBalance, setOpeningBalance] = useState('')
  const [accountFormError, setAccountFormError] = useState('')

  // Transaction form state
  const [txDate, setTxDate] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txReference, setTxReference] = useState('')
  const [txType, setTxType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [txAmount, setTxAmount] = useState('')
  const [txFormError, setTxFormError] = useState('')

  const selectedAccount = (bankAccounts as any[]).find((a: any) => a.id === selectedAccountId) ?? null

  const resetAccountForm = () => {
    setBankName('')
    setAccountName('')
    setAccountNumber('')
    setAccountType('CURRENT')
    setOpeningBalance('')
    setAccountFormError('')
  }

  const resetTxForm = () => {
    setTxDate('')
    setTxDescription('')
    setTxReference('')
    setTxType('DEBIT')
    setTxAmount('')
    setTxFormError('')
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountFormError('')

    if (!bankName || !accountName || !accountNumber) {
      setAccountFormError('Please fill in all required fields')
      return
    }

    const balanceNum = openingBalance ? parseFloat(openingBalance) : 0
    if (openingBalance && (isNaN(balanceNum) || balanceNum < 0)) {
      setAccountFormError('Please enter a valid opening balance')
      return
    }

    const openingBalanceSen = Math.round(balanceNum * 100)

    try {
      await createBankAccount.mutateAsync({
        bankName,
        accountName,
        accountNumber,
        accountType,
        openingBalanceSen,
      })
      setShowAccountModal(false)
      resetAccountForm()
    } catch (err: any) {
      setAccountFormError(err.response?.data?.message ?? 'Failed to create bank account')
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setTxFormError('')

    if (!txDate || !txDescription || !txAmount) {
      setTxFormError('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(txAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxFormError('Please enter a valid amount greater than 0')
      return
    }

    const amountSen = Math.round(amountNum * 100)

    try {
      await createBankTransaction.mutateAsync({
        bankAccountId: selectedAccountId!,
        date: txDate,
        description: txDescription,
        type: txType,
        amountSen,
        reference: txReference || undefined,
      })
      setShowTransactionModal(false)
      resetTxForm()
    } catch (err: any) {
      setTxFormError(err.response?.data?.message ?? 'Failed to create transaction')
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return
    try {
      await deleteBankAccount.mutateAsync(id)
      if (selectedAccountId === id) setSelectedAccountId(null)
    } catch {
      // silently fail — mutation error will show via React Query
    }
  }

  const handleMatch = async (txId: string) => {
    const paymentId = prompt('Enter Payment ID to match:')
    if (!paymentId) return
    try {
      await matchTransaction.mutateAsync({ id: txId, paymentId })
    } catch {
      // silently fail
    }
  }

  const handleUnmatch = async (txId: string) => {
    try {
      await unmatchTransaction.mutateAsync(txId)
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Banking</h1>
          <p className="text-gray-500 text-sm mt-1">Manage bank accounts & transactions</p>
        </div>
        <button
          onClick={() => { resetAccountForm(); setShowAccountModal(true) }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Bank Account
        </button>
      </div>

      {/* Bank Account Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-12 text-red-500 text-sm">Failed to load bank accounts</div>
      ) : (bankAccounts as any[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">🏦</p>
          <p className="text-sm">No bank accounts yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(bankAccounts as any[]).map((account: any) => (
            <div
              key={account.id}
              onClick={() => setSelectedAccountId(selectedAccountId === account.id ? null : account.id)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedAccountId === account.id
                  ? 'border-brand-500 ring-1 ring-brand-500'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">{account.bank_name}</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5 truncate">{account.account_name}</p>
                  <p className="text-sm text-gray-400 mt-1 font-mono">{maskAccountNumber(account.account_number)}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_BADGE[account.account_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {(account.account_type ?? 'CURRENT').replace('_', ' ')}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id) }}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                    title="Delete account"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <p className="text-xl font-semibold text-gray-900 mt-4">{formatRinggit(Number(account.balance_sen ?? account.opening_balance_sen ?? 0))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Section (when account selected) */}
      {selectedAccount && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Transactions — {selectedAccount.account_name}
              </h2>
              <p className="text-sm text-gray-400">{selectedAccount.bank_name} &middot; {maskAccountNumber(selectedAccount.account_number)}</p>
            </div>
            <button
              onClick={() => { resetTxForm(); setShowTransactionModal(true) }}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              + Add Transaction
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {txLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Reference</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(transactions as any[]).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <p className="text-3xl mb-2">🏦</p>
                        <p className="text-sm">No transactions yet for this account</p>
                      </td>
                    </tr>
                  ) : (
                    (transactions as any[]).map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-600">{tx.date ? formatDate(tx.date) : '--'}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-800">{tx.description}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{tx.reference || '--'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}{formatRinggit(Number(tx.amount_sen))}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[tx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {tx.status === 'UNMATCHED' && (
                            <button
                              onClick={() => handleMatch(tx.id)}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                            >
                              Match
                            </button>
                          )}
                          {tx.status === 'MATCHED' && (
                            <button
                              onClick={() => handleUnmatch(tx.id)}
                              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              Unmatch
                            </button>
                          )}
                          {tx.status === 'RECONCILED' && (
                            <span className="text-xs text-gray-400">Reconciled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Create Bank Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Bank Account</h2>
              <button onClick={() => setShowAccountModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateAccount} className="px-6 py-5 space-y-4">
              {accountFormError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{accountFormError}</div>
              )}

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Maybank, CIMB, Public Bank"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Business Current Account"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 5123 4567 8901"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Opening Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (RM)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBankAccount.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {createBankAccount.isPending ? 'Creating...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Transaction</h2>
              <button onClick={() => setShowTransactionModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateTransaction} className="px-6 py-5 space-y-4">
              {txFormError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{txFormError}</div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Payment from customer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  placeholder="e.g. transfer ref, cheque no."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-400">*</span></label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as 'DEBIT' | 'CREDIT')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="DEBIT">Debit (Money Out)</option>
                  <option value="CREDIT">Credit (Money In)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RM) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBankTransaction.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {createBankTransaction.isPending ? 'Creating...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
