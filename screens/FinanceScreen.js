import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import {
  Plus,
  X,
  TrendingUp,
  ArrowUpRight,
  Filter,
  Receipt,
  Download,
  FileText,
  DollarSign,
  PieChart,
  AlertCircle
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformTransaction } from '../lib/transforms';
import DataStateView from '../components/DataStateView';
import FormModal from '../components/FormModal';
import { insertTransaction } from '../lib/mutations';

const CATEGORIES = ["Overview", "Income", "Personal Expenses", "Business Expenses", "Transactions"];

export default function FinanceScreen() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const { user } = useAuth();
  const { data: transactions, loading, error, refetch } = useSupabaseQuery('transactions', {
    filters: { user_id: user.id },
    orderBy: { column: 'date', ascending: false },
    transform: transformTransaction,
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (activeTab === "Overview") return transactions.slice(0, 5);
    if (activeTab === "Transactions") return transactions;
    return transactions.filter(t => t.category === activeTab);
  }, [activeTab, transactions]);

  const EXPENSE_FIELDS = [
    { key: 'store', label: 'Merchant / Description', type: 'text', required: true, placeholder: 'e.g. Starbucks' },
    { key: 'amount', label: 'Amount', type: 'number', required: true, placeholder: 'e.g. -6.50' },
    { key: 'date', label: 'Date', type: 'text', required: true, placeholder: 'e.g. Feb 04', defaultValue: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) },
    { key: 'category', label: 'Category', type: 'select', required: true, options: ['Income', 'Personal Expenses', 'Business Expenses'] },
    { key: 'status', label: 'Status', type: 'select', required: true, options: ['Paid', 'Pending', 'Received', 'Due'] },
    { key: 'summary', label: 'Notes', type: 'text', placeholder: 'Optional description' },
  ];

  const openExpenseForm = () => {
    setIsMenuOpen(false);
    setFormConfig({ title: 'Log Expense/Receipt', fields: EXPENSE_FIELDS });
    setFormVisible(true);
  };

  const openInvoiceForm = () => {
    setIsMenuOpen(false);
    const fields = EXPENSE_FIELDS.map(f => f.key === 'status' ? { ...f, defaultValue: 'Due' } : f);
    setFormConfig({ title: 'New Invoice', fields });
    setFormVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setFormLoading(true);
    const { error: err } = await insertTransaction(user.id, values);
    setFormLoading(false);
    if (err) {
      Alert.alert('Error', err.message);
      return;
    }
    setFormVisible(false);
    refetch();
  };

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const renderTransaction = (item) => (
    <View key={item.id} style={styles.tableRow}>
      <View style={styles.rowLead}>
        <Text style={styles.rowDate}>{item.date}</Text>
        <Text style={styles.rowStore}>{item.store}</Text>
        {activeTab === "Transactions" && (
            <Text style={styles.rowSummary}>{item.summary}</Text>
        )}
      </View>
      <View style={styles.rowEnd}>
        <Text style={[styles.rowAmount, { color: item.amount > 0 ? '#6B8E4E' : '#000' }]}>
          {item.amount > 0 ? `+$${item.amount.toFixed(2)}` : `-$${Math.abs(item.amount).toFixed(2)}`}
        </Text>
        <Text style={styles.rowStatus}>{item.status}</Text>
      </View>
    </View>
  );

  const totals = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0, net: 0 };
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  const renderOverview = () => (
    <>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <TrendingUp size={18} color={colors.primary} />
          <Text style={styles.chartTitle}>Financial Summary</Text>
        </View>
        {transactions && transactions.length > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: '#6B8E4E' }]}>+${totals.income.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#C0392B' }]}>-${totals.expenses.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={[styles.summaryValue, { color: totals.net >= 0 ? '#6B8E4E' : '#C0392B' }]}>
                {totals.net >= 0 ? '+' : '-'}${Math.abs(totals.net).toFixed(2)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Log transactions to see your financial summary</Text>
        )}
      </View>
    </>
  );

  const renderIncomeView = () => {
    const incomeTransactions = transactions ? transactions.filter(t => t.amount > 0) : [];
    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <DollarSign size={18} color="#6B8E4E" />
          <Text style={styles.chartTitle}>Income Summary</Text>
        </View>
        {incomeTransactions.length > 0 ? (
          <Text style={styles.summarySubtext}>
            {incomeTransactions.length} income transaction{incomeTransactions.length !== 1 ? 's' : ''} totaling +${totals.income.toFixed(2)}
          </Text>
        ) : (
          <Text style={styles.emptyText}>No income recorded yet. Use voice to log income.</Text>
        )}
      </View>
    );
  };

  const renderBusinessExpensesWidgets = () => {
    const bizExpenses = transactions ? transactions.filter(t => t.category === 'Business Expenses' && t.amount < 0) : [];
    const bizTotal = bizExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const dueItems = transactions ? transactions.filter(t => t.category === 'Business Expenses' && t.status === 'Due') : [];
    return (
      <>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <PieChart size={18} color={colors.primary} />
            <Text style={styles.chartTitle}>Business Expenses</Text>
          </View>
          {bizExpenses.length > 0 ? (
            <Text style={styles.summarySubtext}>
              {bizExpenses.length} expense{bizExpenses.length !== 1 ? 's' : ''} totaling -${bizTotal.toFixed(2)}
            </Text>
          ) : (
            <Text style={styles.emptyText}>No business expenses recorded yet.</Text>
          )}
        </View>

        {dueItems.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <AlertCircle size={18} color="#FF3B30" />
              <Text style={styles.chartTitle}>Invoices Due ({dueItems.length})</Text>
            </View>
            {dueItems.map(item => (
              <View key={item.id} style={styles.fileItem}>
                <FileText size={16} color="#666" />
                <Text style={styles.fileText}>{item.store}</Text>
                <View style={styles.dueBadge}><Text style={styles.dueText}>DUE</Text></View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveTab(cat)}
              style={[styles.tab, activeTab === cat && styles.activeTab]}
            >
              <Text style={[styles.tabLabel, activeTab === cat && styles.activeTabLabel]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollPadding}>
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Income" && renderIncomeView()}
        {activeTab === "Business Expenses" && renderBusinessExpensesWidgets()}
        
        {(activeTab === "Personal Expenses") && (() => {
          const personalExpenses = transactions ? transactions.filter(t => t.category === 'Personal Expenses' && t.amount < 0) : [];
          const personalTotal = personalExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          return (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <PieChart size={18} color={colors.primary} />
                <Text style={styles.chartTitle}>Personal Expenses</Text>
              </View>
              {personalExpenses.length > 0 ? (
                <Text style={styles.summarySubtext}>
                  {personalExpenses.length} expense{personalExpenses.length !== 1 ? 's' : ''} totaling -${personalTotal.toFixed(2)}
                </Text>
              ) : (
                <Text style={styles.emptyText}>No personal expenses recorded yet.</Text>
              )}
            </View>
          );
        })()}

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>
              {activeTab === "Overview" ? "Recent Transactions" : activeTab === "Transactions" ? "Latest Transactions" : `${activeTab} List`}
            </Text>
            <TouchableOpacity><Filter size={18} color="#666" /></TouchableOpacity>
          </View>
          
          <View style={styles.tableLabels}>
            <Text style={styles.labelCol}>DATE & MERCHANT</Text>
            <Text style={styles.labelColRight}>AMOUNT</Text>
          </View>

          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(item => renderTransaction(item))
          ) : (
            <Text style={styles.emptyText}>No data available for {activeTab}</Text>
          )}
        </View>
      </ScrollView>

      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuPill} onPress={openExpenseForm}>
            <Receipt size={18} color={colors.primary} />
            <Text style={styles.pillText}>Log Expense/Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <Download size={18} color={colors.primary} />
            <Text style={styles.pillText}>Export Statements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={openInvoiceForm}>
            <ArrowUpRight size={18} color={colors.primary} />
            <Text style={styles.pillText}>New Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      {formConfig && (
        <FormModal
          visible={formVisible}
          title={formConfig.title}
          fields={formConfig.fields}
          onSubmit={handleFormSubmit}
          onClose={() => setFormVisible(false)}
          loading={formLoading}
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, isMenuOpen && styles.fabActive]} 
        onPress={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X color="#fff" size={30} /> : <Plus color="#fff" size={30} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  tabContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 14 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  activeTab: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeTabLabel: { color: '#fff' },
  scrollPadding: { padding: 16, paddingBottom: 100 },
  chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  chartTitle: { marginLeft: 10, fontSize: 15, fontWeight: '700', color: '#333' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summarySubtext: { fontSize: 14, color: '#666', marginTop: 4 },
  fileList: { marginTop: 5 },
  fileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  fileText: { flex: 1, marginLeft: 10, fontSize: 14, color: '#444' },
  dueBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FFC1C1' },
  dueText: { fontSize: 9, color: '#FF3B30', fontWeight: '800' },
  tableCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tableTitle: { fontSize: 16, fontWeight: '800', color: '#000' },
  tableLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  labelCol: { fontSize: 10, color: '#999', fontWeight: '800' },
  labelColRight: { fontSize: 10, color: '#999', fontWeight: '800', textAlign: 'right' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  rowDate: { fontSize: 11, color: '#999', fontWeight: '600' },
  rowStore: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 2 },
  rowSummary: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
  rowAmount: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  rowStatus: { fontSize: 10, color: '#AAA', textAlign: 'right', textTransform: 'uppercase', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 40, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 10, right: 10, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 2000 },
  fabActive: { backgroundColor: '#333' },
  menuOverlay: { position: 'absolute', bottom: 80, right: 10, alignItems: 'flex-end', zIndex: 1999 },
  menuPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, marginBottom: 10, elevation: 4, borderWidth: 1, borderColor: '#eee' },
  pillText: { marginLeft: 8, fontWeight: '600', color: '#333', fontSize: 13 }
});