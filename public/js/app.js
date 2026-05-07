function app() {
  return {
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    page: 'dashboard',
    loading: false,
    showRegister: false,

    loginForm: { email: '', password: '' },
    loginError: '',
    registerForm: { name: '', email: '', password: '' },
    registerError: '',

    dashboard: { balance: 0, totalIncome: 0, totalExpense: 0, recentTransactions: [], activeBudgets: 0, activeGoals: 0, unreadNotifications: 0 },
    unreadCount: 0,

    transactions: [],
    showTransactionForm: false,
    editingTransaction: null,
    transactionForm: { type: 'expense', category_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' },
    budgetAlert: null,

    budgets: [],
    showBudgetForm: false,
    budgetForm: { category_id: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), alert_threshold: 80 },
    budgetError: '',

    goals: [],
    showGoalForm: false,
    goalForm: { name: '', target_amount: '', deadline: '' },

    report: null,
    reportFrom: '',
    reportTo: '',

    notifications: [],
    categories: [],

    async init() {
      if (this.token) {
        await this.loadCategories();
        this.loadDashboard();
      }
    },

    headers() {
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token };
    },

    async api(method, url, body) {
      const opts = { method, headers: this.headers() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch('/api' + url, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    },

    async login() {
      this.loading = true;
      this.loginError = '';
      try {
        const data = await this.api('POST', '/auth/login', this.loginForm);
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        await this.loadCategories();
        this.loadDashboard();
      } catch (e) {
        this.loginError = e.message;
      }
      this.loading = false;
    },

    async register() {
      this.loading = true;
      this.registerError = '';
      try {
        const data = await this.api('POST', '/auth/register', this.registerForm);
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        await this.loadCategories();
        this.loadDashboard();
      } catch (e) {
        this.registerError = e.message;
      }
      this.loading = false;
    },

    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.page = 'dashboard';
    },

    async loadCategories() {
      try {
        this.categories = await this.api('GET', '/categories');
      } catch (e) { console.error(e); }
    },

    async loadDashboard() {
      try {
        const data = await this.api('GET', '/dashboard');
        this.dashboard = data;
        this.unreadCount = data.unreadNotifications;
      } catch (e) { console.error(e); }
    },

    async loadTransactions() {
      try {
        this.transactions = await this.api('GET', '/transactions');
      } catch (e) { console.error(e); }
    },

    async saveTransaction() {
      try {
        const form = { ...this.transactionForm, amount: parseFloat(this.transactionForm.amount) };
        if (this.editingTransaction) {
          await this.api('PUT', '/transactions/' + this.editingTransaction.id, form);
        } else {
          const result = await this.api('POST', '/transactions', form);
          if (result.budgetStatus) {
            this.budgetAlert = {
              status: result.budgetStatus.status,
              message: result.budgetStatus.status === 'exceeded'
                ? 'Budget exceeded! Spent ' + result.budgetStatus.spent.toFixed(2) + ' out of ' + result.budgetStatus.budget.toFixed(2)
                : 'Nearing budget limit (' + Math.round(result.budgetStatus.percentage) + '%)'
            };
          } else {
            this.budgetAlert = null;
          }
        }
        this.resetTransactionForm();
        this.loadTransactions();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    editTransaction(t) {
      this.editingTransaction = t;
      this.transactionForm = { type: t.type, category_id: t.category_id, amount: t.amount, date: t.date, description: t.description };
      this.showTransactionForm = true;
    },

    resetTransactionForm() {
      this.editingTransaction = null;
      this.transactionForm = { type: 'expense', category_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' };
      this.showTransactionForm = false;
      this.budgetAlert = null;
    },

    async deleteTransaction(id) {
      if (!confirm('Delete this transaction?')) return;
      try {
        await this.api('DELETE', '/transactions/' + id);
        this.loadTransactions();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    async loadBudgets() {
      try {
        this.budgets = await this.api('GET', '/budgets');
      } catch (e) { console.error(e); }
    },

    async saveBudget() {
      this.budgetError = '';
      try {
        const form = { ...this.budgetForm, amount: parseFloat(this.budgetForm.amount), month: parseInt(this.budgetForm.month), year: parseInt(this.budgetForm.year), alert_threshold: parseFloat(this.budgetForm.alert_threshold) };
        await this.api('POST', '/budgets', form);
        this.showBudgetForm = false;
        this.loadBudgets();
        this.loadDashboard();
      } catch (e) {
        this.budgetError = e.message;
      }
    },

    async deleteBudget(id) {
      if (!confirm('Delete this budget?')) return;
      try {
        await this.api('DELETE', '/budgets/' + id);
        this.loadBudgets();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    async loadGoals() {
      try {
        this.goals = await this.api('GET', '/goals');
      } catch (e) { console.error(e); }
    },

    async saveGoal() {
      try {
        await this.api('POST', '/goals', { ...this.goalForm, target_amount: parseFloat(this.goalForm.target_amount) });
        this.showGoalForm = false;
        this.goalForm = { name: '', target_amount: '', deadline: '' };
        this.loadGoals();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    async contributeGoal(g) {
      if (!g._contribute || g._contribute <= 0) return;
      try {
        await this.api('POST', '/goals/' + g.id + '/contribute', { amount: parseFloat(g._contribute) });
        g._contribute = '';
        this.loadGoals();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    async deleteGoal(id) {
      if (!confirm('Delete this goal?')) return;
      try {
        await this.api('DELETE', '/goals/' + id);
        this.loadGoals();
        this.loadDashboard();
      } catch (e) { alert(e.message); }
    },

    async loadReports() {
      try {
        let url = '/reports';
        const params = [];
        if (this.reportFrom) params.push('from=' + this.reportFrom);
        if (this.reportTo) params.push('to=' + this.reportTo);
        if (params.length) url += '?' + params.join('&');
        this.report = await this.api('GET', url);
      } catch (e) { console.error(e); }
    },

    async loadNotifications() {
      try {
        this.notifications = await this.api('GET', '/notifications');
      } catch (e) { console.error(e); }
    },

    async markAllRead() {
      try {
        await this.api('PUT', '/notifications/read-all');
        this.unreadCount = 0;
        this.loadNotifications();
      } catch (e) { console.error(e); }
    }
  };
}
