import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, useColorScheme, AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppNotificationHost from './components/AppNotificationHost';
import AppLockScreen from './components/AppLockScreen';
import { ThemeProvider } from './components/ThemeContext';
import { Alert } from './services/appAlert';
import { getLocalSecurity } from './services/localSecurity';
import { LIGHT_PALETTE } from './services/themeStyles';

// Componente de la Barra de Navegación Inferior Modular
import BottomTabBar from './components/TabNavigator';

// Pantallas del módulo de Autenticación
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import { supabase } from './services/supabase';
import { fetchCurrencyRates, SUPPORTED_CURRENCIES } from './services/currencyService';
import { checkRecurringPaymentsAlerts } from './services/notificationService';

// Pantallas del Dashboard y Menú principal
import HomeScreen from './screens/dashboard/HomeScreen';
import MenuScreen from './screens/dashboard/MenuScreen';
import ProfileScreen from './screens/dashboard/ProfileScreen';

// Pantallas de Preferencias y Ajustes
import PreferencesScreen from './screens/preferences/PreferencesScreen';
import SettingsScreen from './screens/settings/HomeSettingsScreen';

// Pantallas del módulo de Cuentas
import AccountsScreen from './screens/accounts/AccountsScreen';
import AccountDetailScreen from './screens/accounts/AccountDetailScreen';
import EditAccountScreen from './screens/accounts/EditAccountScreen';

// Pantallas del módulo de Tarjetas de Crédito
import CreditCardsScreen from './screens/creditCards/CreditCardsScreen';
import AddCreditCardScreen from './screens/creditCards/AddCreditCardScreen';
import CreditCardDetailScreen from './screens/creditCards/CreditCardDetailScreen';
import AddCardMovementScreen from './screens/creditCards/AddCardMovementScreen';

// Pantallas del módulo de Movimientos
import AddMovementScreen from './screens/movements/AddMovementScreen';
import MovementsScreen from './screens/movements/MovementsScreen';
import TransferScreen from './screens/movements/TransferScreen';

// Pantallas del módulo de Planificación
import BudgetsScreen from './screens/planning/BudgetsScreen';
import BudgetFormScreen from './screens/planning/BudgetFormScreen';
import GoalsScreen from './screens/planning/GoalsScreen';
import RecurringScreen from './screens/planning/RecurringScreen';
import RecurringFormScreen from './screens/planning/RecurringFormScreen';

// Pantallas del módulo de Deudas
import DebtsScreen from './screens/debts/DebtsScreen';
import DebtFormScreen from './screens/debts/DebtFormScreen';

// Pantallas del módulo de Categorías
import CategoriesScreen from './screens/categories/CategoriesScreen';
import NewSubCategoryScreen from './screens/categories/NewSubCategoryScreen';
import NewCategoryScreen from './screens/categories/NewCategoryScreen';
import EditCategoryScreen from './screens/categories/EditCategoryScreen';

// Pantallas del módulo de Compras
import ShoppingListsScreen from './screens/shopping/ShoppingListsScreen';
import ShoppingDetailScreen from './screens/shopping/ShoppingDetailScreen';

// Pantallas del módulo de Herramientas
import ConverterCalculatorScreen from './screens/tools/ConverterCalculatorScreen';
import CalculatorScreen from './screens/tools/CalculatorScreen';
import ExportScreen from './screens/tools/ExportScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado en pantalla:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Error al cargar la pantalla
          </Text>
          <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#a3e635', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 }}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold' }}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const systemColorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('login');
  const [userName, setUserName] = useState('Usuario');
  const [userEmail, setUserEmail] = useState('usuario@correo.com');
  const [userId, setUserId] = useState(null);
  const [userAvatar, setUserAvatar] = useState('person');
  const [userAvatarBg, setUserAvatarBg] = useState('#a3e635');

  const [currentScreen, setCurrentScreen] = useState('home');
  const [navigationHistory, setNavigationHistory] = useState([]);
  
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState('VES');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [selectedShoppingList, setSelectedShoppingList] = useState(null);
  const [categories, setCategories] = useState([]); 
  const [selectedParentCategory, setSelectedParentCategory] = useState(null); 
  const [selectedCategoryToEdit, setSelectedCategoryToEdit] = useState(null);
  const [budgetFormParams, setBudgetFormParams] = useState(null);
  const [debtFormParams, setDebtFormParams] = useState(null);
  const [recurringFormParams, setRecurringFormParams] = useState(null);
  
  const [appSettings, setAppSettings] = useState({
    activeShortcuts: ['compras', 'cuentas', 'pagos', 'recurrentes'],
    activeWidgets: ['brecha', 'pagos', 'movimientos'],
    displayCurrencies: ['USD', 'EUR', 'USDT', 'VES'],
    primaryCurrency: 'VES',
    workingCountry: 'VE',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const isLightTheme = appSettings.themeMode === 'light' || (
    appSettings.themeMode !== 'dark' && systemColorScheme === 'light'
  );
  const [localSecurity, setLocalSecurity] = useState(null);
  const [securityReady, setSecurityReady] = useState(false);
  const [appLocked, setAppLocked] = useState(false);
  const [securityLoadError, setSecurityLoadError] = useState(false);
  const [securityLoadAttempt, setSecurityLoadAttempt] = useState(0);
  const previousAppState = useRef(AppState.currentState);
    
  const [rates, setRates] = useState({
    bcvRate: 1,
    eurRate: 1,
    binanceRate: 1,
    lastUpdate: null
  });
  const conversionRates = {
    ...rates,
    useVenezuelanRates: appSettings.workingCountry === 'VE' && appSettings.primaryCurrency === 'VES',
  };

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [movements, setMovements] = useState([]);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);

  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      !settingsLoaded ||
      !isAuthenticated ||
      appSettings.notifications?.pushReminders !== true
    ) return;

    const requestNotificationPermission = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.log('Permiso de notificaciones no concedido por el usuario.');
          }
        }
      } catch (error) {
        console.error('Error al solicitar permisos de notificaciones:', error);
      }
    };

    requestNotificationPermission();
  }, [appSettings.notifications?.pushReminders, isAuthenticated, settingsLoaded]);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            if (profile.full_name) setUserName(profile.full_name);
            if (profile.avatar) setUserAvatar(profile.avatar);
            if (profile.avatar_bg) setUserAvatarBg(profile.avatar_bg);
          } else {
            setUserName(session.user.user_metadata?.full_name || session.user.email.split('@')[0]);
          }

          loadCloudData(session.user.id);
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error);
      }
    };

    checkUserSession();
  }, []);

  const refreshUserData = async (currentUserId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      if (profile) {
        if (profile.full_name) setUserName(profile.full_name);
        if (profile.email) setUserEmail(profile.email);
        if (profile.avatar) setUserAvatar(profile.avatar);
        if (profile.avatar_bg) setUserAvatarBg(profile.avatar_bg);
      }
    } catch (error) {
      console.error('Error al refrescar datos del perfil:', error);
    }
  };

  const loadCloudData = async (currentUserId) => {
    try {
      const { data: accountsData } = await supabase.from('accounts').select('*').eq('user_id', currentUserId);
      if (accountsData) setAccounts(accountsData);

      const { data: categoriesData } = await supabase.from('categories').select('*').eq('user_id', currentUserId);
      if (categoriesData) setCategories(categoriesData);

      const { data: debtsData } = await supabase.from('debts').select('*').eq('user_id', currentUserId);
      const { data: recData } = await supabase.from('recurring_templates').select('*').eq('user_id', currentUserId);

      const formattedDebts = (debtsData || []).map(d => ({
        ...d,
        due_date: d.due_date || d.dueDate || d.date,
        amount: parseFloat(d.amount || d.debtAmount || 0)
      }));

      const formattedRecurringAsDebts = (recData || []).map(r => ({
        id: `rec-${r.id}`,
        contact_name: r.name,
        type: (r.type || '').toLowerCase() === 'ingreso' ? 'receive' : 'pay',
        amount: parseFloat(r.amount || 0),
        currency: r.currency || 'USD',
        category: r.category,
        description: `Recurrente (${r.frequency || 'Mensual'})`,
        due_date: r.start_date ? `${r.start_date}T00:00:00Z` : null,
        status: 'pending'
      }));

      setTransactions([...formattedDebts, ...formattedRecurringAsDebts]);

      const { data: goalsData } = await supabase.from('goals').select('*').eq('user_id', currentUserId);
      if (goalsData) {
        const formattedGoals = goalsData.map(item => ({
          id: item.id,
          name: item.name,
          current: parseFloat(item.current) || 0,
          target: parseFloat(item.target) || 0,
          color: item.color || '#a3e635',
          icon: item.icon || 'flag-outline',
          isProtected: item.is_protected || false,
        }));
        setGoals(formattedGoals);
      }

      const { data: movementsData } = await supabase.from('movements').select('*').eq('user_id', currentUserId);
      if (movementsData) {
        const formattedMovements = movementsData.map(m => ({
          ...m,
          accountId: m.account_id,
          monthIndex: m.month_index !== undefined ? m.month_index : new Date().getMonth(),
          amount: parseFloat(m.amount) || 0
        }));
        setMovements(formattedMovements);
      }

      const { data: listsData } = await supabase.from('shopping_lists').select('*').eq('user_id', currentUserId);
      if (listsData) {
        const formattedLists = listsData.map(l => ({
          ...l,
          totalUsd: parseFloat(l.total_usd || l.totalUsd || 0),
          productsCount: parseInt(l.products_count || l.productsCount || 0, 10),
          products: l.products || [],
          budgetLimit: l.budget_limit !== undefined && l.budget_limit !== null ? parseFloat(l.budget_limit) : null,
          budgetCurrency: l.budget_currency || 'USD'
        }));
        setShoppingLists(formattedLists);
      }

      const { data: recurringData } = await supabase.from('recurring_templates').select('*').eq('user_id', currentUserId);
      if (recurringData) setRecurringTemplates(recurringData);

      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('settings')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (prefsData && prefsData.settings) {
        setAppSettings(prev => ({ ...prev, ...prefsData.settings }));
        const savedPrimaryCurrency = prefsData.settings.primaryCurrency;
        if (SUPPORTED_CURRENCIES.some(currency => currency.code === savedPrimaryCurrency)) {
          setSelectedCurrencyFilter(savedPrimaryCurrency);
        }
      }
      
      setSettingsLoaded(true);
    } catch (error) {
      console.error('Error al conectar con la base de datos en la nube:', error);
      setSettingsLoaded(true);
    }
  };
  
  const updateGlobalSetting = async (key, value) => {
    const updatedSettings = { ...appSettings, [key]: value };
    setAppSettings(updatedSettings);
    if (key === 'primaryCurrency' && SUPPORTED_CURRENCIES.some(currency => currency.code === value)) {
      setSelectedCurrencyFilter(value);
    }

    if (!userId) return;

    try {
      const { data: existingPref, error: readError } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (readError) throw readError;

      if (existingPref) {
        const { error } = await supabase
          .from('user_preferences')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert([{
            user_id: userId,
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Error inesperado al sincronizar la preferencia ${key}:`, error);
      setAppSettings(appSettings);
      if (key === 'primaryCurrency') {
        setSelectedCurrencyFilter(appSettings.primaryCurrency || 'VES');
      }
      Alert.alert('No se guardó el ajuste', 'Comprueba tu conexión e inténtalo de nuevo.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSecurityReady(false);
      setLocalSecurity(null);
      setAppLocked(false);
      setSecurityLoadError(false);
      return;
    }

    let cancelled = false;
    setSecurityReady(false);
    setSecurityLoadError(false);
    getLocalSecurity(userId)
      .then(config => {
        if (cancelled) return;
        setLocalSecurity(config);
        setAppLocked(Boolean(config.pinHash));
        setSecurityReady(true);
      })
      .catch(error => {
        console.error('Error al cargar el bloqueo local de Kronos:', error);
        if (cancelled) return;
        setSecurityLoadError(true);
        setSecurityReady(true);
        setAppLocked(true);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, userId, securityLoadAttempt]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const wasActive = previousAppState.current === 'active';
      previousAppState.current = nextState;
      if (wasActive && nextState !== 'active' && localSecurity?.pinHash) {
        setAppLocked(true);
      }
    });
    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'hidden' && localSecurity?.pinHash) {
        setAppLocked(true);
      }
    };
    globalThis.document?.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      subscription.remove();
      globalThis.document?.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localSecurity?.pinHash]);

  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      !isAuthenticated ||
      !settingsLoaded ||
      appSettings.notifications?.pushReminders === false
    ) return;

    checkRecurringPaymentsAlerts(transactions);
  }, [appSettings.notifications?.pushReminders, isAuthenticated, settingsLoaded, transactions]);

  const handleUpdateProfile = (newName, newEmail) => {
    setUserName(newName);
    setUserEmail(newEmail);
  };

  const handleSetAccounts = async (newAccounts) => {
    if (Array.isArray(newAccounts)) {
      setAccounts(newAccounts);
    }
  };

  const handleSetMovements = async (newMovements) => {
    if (!Array.isArray(newMovements)) {
      console.warn('⚠️ handleSetMovements recibió un valor que no es un arreglo:', newMovements);
      return;
    }

    setMovements(newMovements);

    if (!userId) return;

    try {
      const payload = newMovements.map(m => ({
        id: m.id,
        user_id: userId,
        account_id: m.account_id || m.accountId || null,
        title: m.title,
        category: m.category || 'Sin categoría',
        amount: parseFloat(m.amount) || 0,
        sub_amount: m.sub_amount || null,
        time: m.time || '',
        type: m.type || 'Egresos',
        commission_type: m.commission_type || null,
        commission_base_amount: m.commission_base_amount ?? null,
        related_movement_id: m.related_movement_id || null,
        month_index: m.month_index !== undefined ? m.month_index : (m.monthIndex !== undefined ? m.monthIndex : new Date().getMonth()),
        day: m.day !== undefined ? m.day : new Date().getDate()
      }));

      await supabase
        .from('movements')
        .upsert(payload, { onConflict: 'id' });
    } catch (error) {
      console.error('Error al sincronizar movimientos:', error);
    }
  };
  
  const handleSetShoppingLists = async (newLists) => {
    setShoppingLists(newLists);
    
    if (!userId) return;
    
    try {
      const payload = newLists.map(list => ({
        id: list.id,
        user_id: userId,
        title: list.title,
        date: list.date,
        month: list.month,
        total_usd: list.totalUsd,
        products_count: list.productsCount,
        completed: list.completed,
        account_name: list.accountName || null,
        completed_at: list.completedAt || null,
        products: list.products || [],
        budget_limit: list.budgetLimit !== undefined ? list.budgetLimit : null,
        budget_currency: list.budgetCurrency || 'USD'
      }));

      await supabase
        .from('shopping_lists')
        .upsert(payload, { onConflict: 'id' });
    } catch (error) {
      console.error('Error al sincronizar listas de compras:', error);
    }
  };

  const handleUniversalDeleteShoppingList = async (listId) => {
    const updated = shoppingLists.filter(l => l.id !== listId);
    handleSetShoppingLists(updated);

    if (userId) {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error al eliminar la lista en Supabase:', error.message);
      }
    }
  };

  useEffect(() => {
    const loadRates = async () => {
      try {
        const latestRates = await fetchCurrencyRates();
        setRates(latestRates);
      } catch (error) {
        console.error('Error al actualizar tasas:', error);
      }
    };
    loadRates();
  }, []);

  const [movementFilterParam, setMovementFilterParam] = useState(null);

  const navigateTo = (screenName, param = null) => {
    if (screenName === 'accountDetail' && param) setSelectedAccount(param);
    if (screenName === 'creditCardDetail' && param) setSelectedCard(param);
    if (screenName === 'addCreditCard') setSelectedCard(param || null);
    if (screenName === 'addCardMovement' && param) setSelectedCard(param);
    if (screenName === 'addMovement') {
      setSelectedMovement(param || null);
      if (!param && currentScreen !== 'accountDetail') setSelectedAccount(null);
    }
    if (screenName === 'shoppingDetail') setSelectedShoppingList(param || null);
    if (screenName === 'budgetForm') setBudgetFormParams(param || null);
    if (screenName === 'debtForm') setDebtFormParams(param || null);
    if (screenName === 'RecurringForm') setRecurringFormParams(param || null);
    if (screenName === 'movements') {
      setMovementFilterParam(param?.filter || null);
    }
    if (screenName === 'NewSubCategory') setSelectedParentCategory(param);
    if (screenName === 'EditCategory') setSelectedCategoryToEdit(param);

    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screenName);
  };

  const goBack = () => {
    setNavigationHistory(prev => {
      if (prev.length === 0) {
        setCurrentScreen('home');
        return [];
      }
      const newHistory = [...prev];
      let previousScreen = newHistory.pop();
      
      if (previousScreen === 'creditCardDetail' || previousScreen === 'creditCards') {
        previousScreen = 'home';
      }

      setCurrentScreen(previousScreen);
      return newHistory;
    });
  };

  const createNavigationProp = (screen) => {
    const navFn = (targetScreen, params) => navigateTo(targetScreen, params);
    navFn.navigate = (targetScreen, params) => navigateTo(targetScreen, params);
    navFn.goBack = goBack;
    navFn.push = (targetScreen, params) => navigateTo(targetScreen, params);
    return navFn;
  };

  const navObj = createNavigationProp(currentScreen);

  const currentAccountData = accounts.find(a => a.id === selectedAccount?.id) || selectedAccount;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setIsAuthenticated(false);
    setAuthScreen('login');
    setUserEmail('');
    setUserName('Usuario');
    setUserId(null);
    setLocalSecurity(null);
    setSecurityReady(false);
    setAppLocked(false);
    setSecurityLoadError(false);
    setUserAvatar('person');
    setUserAvatarBg('#a3e635');
    setNavigationHistory([]);
    setCurrentScreen('home');
  };

  if (!isAuthenticated) {
    if (authScreen === 'login') {
      return (
        <ThemeProvider mode={appSettings.themeMode || 'system'}>
        <SafeAreaProvider>
          <SafeAreaView style={[styles.container, isLightTheme && { backgroundColor: LIGHT_PALETTE.background }]}>
            <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} backgroundColor={isLightTheme ? LIGHT_PALETTE.background : '#000'} />
            <LoginScreen 
              onLoginSuccess={(email, name) => {
                setUserEmail(email);
                setUserName(name);
                setIsAuthenticated(true);
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session?.user) {
                    setUserId(session.user.id);
                    loadCloudData(session.user.id);
                  }
                });
              }}
              onSwitchToRegister={() => setAuthScreen('register')}
            />
            <AppNotificationHost />
          </SafeAreaView>
        </SafeAreaProvider>
        </ThemeProvider>
      );
    } else {
      return (
        <ThemeProvider mode={appSettings.themeMode || 'system'}>
        <SafeAreaProvider>
          <SafeAreaView style={[styles.container, isLightTheme && { backgroundColor: LIGHT_PALETTE.background }]}>
            <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} backgroundColor={isLightTheme ? LIGHT_PALETTE.background : '#000'} />
            <RegisterScreen 
              onRegisterSuccess={(email, name) => {
                setUserEmail(email);
                setUserName(name);
                setIsAuthenticated(true);
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session?.user) {
                    setUserId(session.user.id);
                    loadCloudData(session.user.id);
                  }
                });
              }}
              onSwitchToLogin={() => setAuthScreen('login')}
            />
            <AppNotificationHost />
          </SafeAreaView>
        </SafeAreaProvider>
        </ThemeProvider>
      );
    }
  }

  const renderScreen = () => {
    if (!settingsLoaded && (currentScreen === 'home' || !currentScreen)) {
      return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    }

    switch (currentScreen) {
      case 'budgets':
      case 'presupuestos':
        return (
          <BudgetsScreen 
            navigation={navigateTo}
            userId={userId}
            rates={rates}
            accounts={accounts}
          />
        );
      case 'goals':
      case 'metas':
        return (
          <GoalsScreen 
            navigation={navigateTo}
            userId={userId}
          />
        );
      case 'budgetForm':
        return (
          <BudgetFormScreen 
            navigation={navigateTo}
            route={{ params: budgetFormParams }}
            userId={userId}
          />
        );
      case 'debts':
        return (
          <DebtsScreen 
            navigation={navigateTo}
            userId={userId}
            accounts={accounts}         
            categories={categories}
            setAccounts={handleSetAccounts} 
            setMovements={handleSetMovements}
            setTransactions={setTransactions}
          />
        );
      case 'debtForm':
        return (
          <DebtFormScreen 
            navigation={navigateTo}
            route={{ params: debtFormParams }}
            userId={userId}
          />
        );
      case 'recurring':
      case 'recurrentes':
        return (
          <RecurringScreen 
            navigation={{ goBack, navigate: navigateTo }}
            userId={userId}
            categories={categories}
          />
        );
      case 'RecurringForm':
        return (
          <RecurringFormScreen 
            navigation={{ goBack, navigate: navigateTo }}
            route={{ params: recurringFormParams || { userId } }}
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            navigation={navigateTo}
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            userAvatarBg={userAvatarBg}
            movements={movements}
            accounts={accounts}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        );
      case 'menu':
        return (
          <MenuScreen 
            navigation={{ goBack, navigate: navigateTo }}
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            userAvatar={userAvatar}
            userAvatarBg={userAvatarBg}
          />
        );
      case 'preferences':
      case 'editProfile':
        return (
          <PreferencesScreen 
            userId={userId}
            navigation={navigateTo}
            rates={conversionRates}
            accounts={accounts}
            transactions={transactions}
            movements={movements}
            goals={goals}
            shoppingLists={shoppingLists}
            recurringTemplates={recurringTemplates}
            categories={categories}
            settings={appSettings}
            onUpdateSetting={updateGlobalSetting}
            onLocalSecurityChanged={setLocalSecurity}
            onProfileUpdated={() => refreshUserData(userId)}
            onLogout={handleLogout}
            initialModal={currentScreen === 'editProfile' ? 'profile' : null}
          />
        );
      case 'ajustes':
        return (
          <SettingsScreen 
            navigation={navigateTo}
            activeShortcuts={appSettings.activeShortcuts}
            setActiveShortcuts={(newShortcuts) => updateGlobalSetting('activeShortcuts', newShortcuts)}
            activeWidgets={appSettings.activeWidgets}
            setActiveWidgets={(newWidgets) => updateGlobalSetting('activeWidgets', newWidgets)}
          />
        );
      case 'accounts':
      case 'cuentas':
        return (
          <AccountsScreen 
            navigation={navObj}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            rates={conversionRates}
            onSelectAccount={(acc) => setSelectedAccount(acc)}
            favoriteAccountId={appSettings.favoriteAccountId}
            onFavoriteAccountChange={(accountId) => updateGlobalSetting('favoriteAccountId', accountId)}
            primaryCurrency={selectedCurrencyFilter}
            onPrimaryCurrencyChange={(currency) => updateGlobalSetting('primaryCurrency', currency)}
            displayCurrencies={appSettings.displayCurrencies || ['USD', 'EUR', 'USDT', 'VES']}
            userId={userId}
          />
        );
      case 'accountDetail':
        return (
          <AccountDetailScreen 
            navigation={(screen, param) => navigateTo(screen, param)}
            onGoBack={goBack}
            account={currentAccountData}
            rates={conversionRates}
            movements={movements}
            setMovements={handleSetMovements}
            categories={categories}
            userId={userId}
          />
        );
      case 'addMovement':
        return (
          <AddMovementScreen
            navigation={(screen, params) => navigateTo(screen, params)}
            onGoBack={goBack}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            setMovements={handleSetMovements}
            rates={conversionRates}
            currentAccount={currentAccountData}
            favoriteAccountId={appSettings.favoriteAccountId}
            selectedMovement={selectedMovement}
            userId={userId}
          />
        );
      case 'transfer':
        return (
          <TransferScreen
            navigation={navigateTo}
            onGoBack={goBack}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            setMovements={handleSetMovements}
            rates={conversionRates}
            currentAccount={currentAccountData}
            userId={userId}
          />
        );
      case 'editAccount':
        return (
          <EditAccountScreen 
            navigation={navigateTo}
            onGoBack={goBack}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            currentAccount={currentAccountData}
            userId={userId}
          />
        );
      case 'shoppingLists':
      case 'compras':
        return (
          <ShoppingListsScreen 
            navigation={navigateTo}
            shoppingLists={shoppingLists}
            setShoppingLists={handleSetShoppingLists}
            onDeleteList={handleUniversalDeleteShoppingList}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            setMovements={handleSetMovements}
            rates={conversionRates}
          />
        );
      case 'shoppingDetail':
        return (
          <ShoppingDetailScreen
            navigation={navigateTo}
            onGoBack={goBack}
            routeParams={selectedShoppingList}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            setMovements={handleSetMovements}
            rates={conversionRates}
            userId={userId}
            onSaveList={(savedList) => {
              const updated = shoppingLists.some(l => l.id === savedList.id)
                ? shoppingLists.map(l => l.id === savedList.id ? savedList : l)
                : [savedList, ...shoppingLists];
              handleSetShoppingLists(updated);
            }}
            onDeleteList={handleUniversalDeleteShoppingList}
          />
        );
      case 'converterCalculator':
        return <ConverterCalculatorScreen navigation={navigateTo} rates={conversionRates} />;
      case 'movements':
        return (
          <MovementsScreen 
            navigation={navigateTo} 
            movements={movements} 
            accounts={accounts} 
            categories={categories}
            initialFilter={movementFilterParam}
            rates={conversionRates}
          />
        );
      case 'exportMovements':
        return (
          <ExportScreen 
            navigation={{ goBack, navigate: navigateTo }}
            userId={userId}
            rates={conversionRates}
          />
        );
      case 'categorias':
        return <CategoriesScreen navigation={navigateTo} userId={userId} />;
      case 'NewSubCategory':
        return (
          <NewSubCategoryScreen 
            navigation={navigateTo}
            route={{ params: selectedParentCategory }}
            categories={categories}
            setCategories={setCategories}
            userId={userId}
          />
        );
      case 'NewCategory':
        return <NewCategoryScreen navigation={navigateTo} userId={userId} />;
      case 'EditCategory':
        return (
          <EditCategoryScreen 
            navigation={navigateTo}
            route={{ params: selectedCategoryToEdit }}
            categories={categories}
            setCategories={setCategories}
            userId={userId}
          />
        );
      case 'creditCards':
        return <CreditCardsScreen navigation={navigateTo} userId={userId} />;
      case 'addCreditCard':
              return (
                <AddCreditCardScreen
                  navigation={{
                    navigate: navigateTo,
                    goBack: goBack,
                    canGoBack: () => navigationHistory.length > 0
                  }}
                  userId={userId}
                  route={{ params: selectedCard }}
                />
              );
                    case 'creditCardDetail':
        return <CreditCardDetailScreen navigation={navigateTo} route={{ params: selectedCard }} />; 
      case 'addCardMovement':
        return <AddCardMovementScreen navigation={navigateTo} route={{ params: selectedCard }} />;
      case 'home':
      default:
        return (
          <HomeScreen 
            navigation={navigateTo}
            userName={userName}
            userAvatar={userAvatar}
            userAvatarBg={userAvatarBg}
            accounts={accounts}
            transactions={transactions}
            movements={movements}
            goals={goals}
            recurringTemplates={recurringTemplates}
            rates={conversionRates}
            selectedCurrencyFilter={selectedCurrencyFilter}
            setSelectedCurrencyFilter={(currency) => updateGlobalSetting('primaryCurrency', currency)}
            displayCurrencies={appSettings.displayCurrencies || ['USD', 'EUR', 'USDT', 'VES']}
            activeShortcuts={appSettings.activeShortcuts}
            activeWidgets={appSettings.activeWidgets}
          />
        );
    }
  };

  // Definimos las pantallas que mostrarán la barra de navegación inferior
  const showTabBar = 
    currentScreen === 'home' || 
    currentScreen === 'budgets' || 
    currentScreen === 'presupuestos' || 
    currentScreen === 'accounts' || 
    currentScreen === 'cuentas' || 
    currentScreen === 'profile' || 
    currentScreen === 'menu';

  if (isAuthenticated && (!userId || !securityReady || appLocked)) {
    return (
      <ThemeProvider mode={appSettings.themeMode || 'system'}>
      <SafeAreaProvider>
        <AppLockScreen
          userId={userId}
          biometricEnabled={Boolean(localSecurity?.biometricEnabled)}
          isLight={isLightTheme}
          loading={!userId || !securityReady}
          loadingError={securityLoadError}
          onRetry={() => setSecurityLoadAttempt(attempt => attempt + 1)}
          onUnlock={() => setAppLocked(false)}
          onLogout={handleLogout}
        />
      </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider mode={appSettings.themeMode || 'system'}>
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isLightTheme ? LIGHT_PALETTE.background : '#000' }]}>
        <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} backgroundColor={isLightTheme ? LIGHT_PALETTE.background : '#000'} />
        
        <View style={[styles.screenContainer, !showTabBar && { paddingBottom: 0 }]}>
          <ScreenErrorBoundary key={currentScreen} onReset={() => navigateTo('home')}>
            {renderScreen()}
          </ScreenErrorBoundary>
        </View>

        {showTabBar && (
          <BottomTabBar currentScreen={currentScreen} navigation={navigateTo} />
        )}
        <AppNotificationHost />
      </SafeAreaView>
    </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
    paddingBottom: 65,
  },
});