import * as Notifications from 'expo-notifications';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Pantallas del módulo de Autenticación
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import { supabase } from './services/supabase';
import { fetchCurrencyRates } from './services/currencyService';


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

// Configurar cómo se comportan las notificaciones al recibirlas en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('login');
  const [userName, setUserName] = useState('Usuario');
  const [userEmail, setUserEmail] = useState('usuario@correo.com');
  const [userId, setUserId] = useState(null);
  const [userAvatar, setUserAvatar] = useState('person');
  const [userAvatarBg, setUserAvatarBg] = useState('#a3e635');

  const [currentScreen, setCurrentScreen] = useState('home');
  const [navigationHistory, setNavigationHistory] = useState([]);
  
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState('USD');
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
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
    
  const [rates, setRates] = useState({
    bcvRate: 1,
    eurRate: 1,
    binanceRate: 1,
    lastUpdate: null
  });

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [movements, setMovements] = useState([]);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);

  // Solicitar permisos de notificación al iniciar la app
  useEffect(() => {
    const requestNotificationPermission = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permiso de notificaciones no concedido por el usuario.');
      }
    };

    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);
          
          // Consultamos el perfil guardado en la tabla profiles
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

  // Función para recargar el nombre, correo y avatar tras guardarlos en preferencias
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
      // 1. Cuentas
      const { data: accountsData } = await supabase.from('accounts').select('*').eq('user_id', currentUserId);
      if (accountsData) setAccounts(accountsData);

      // 2. Categorías
      const { data: categoriesData } = await supabase.from('categories').select('*').eq('user_id', currentUserId);
      if (categoriesData) setCategories(categoriesData);

      // 3. Deudas y Recurrentes para transacciones
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

      // 4. Metas (Goals)
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

      // 5. Movimientos (Ingresos y Egresos)
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

      // 6. Listas de Compras
      const { data: listsData } = await supabase.from('shopping_lists').select('*').eq('user_id', currentUserId);
      if (listsData) {
        const formattedLists = listsData.map(l => ({
          ...l,
          totalUsd: parseFloat(l.total_usd || l.totalUsd || 0),
          productsCount: parseInt(l.products_count || l.productsCount || 0, 10),
          products: l.products || []
        }));
        setShoppingLists(formattedLists);
      }

      // 7. Plantillas Recurrentes
      const { data: recurringData } = await supabase.from('recurring_templates').select('*').eq('user_id', currentUserId);
      if (recurringData) setRecurringTemplates(recurringData);

      // 8. Preferencias de la App
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('settings')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (prefsData && prefsData.settings) {
        setAppSettings(prev => ({ ...prev, ...prefsData.settings }));
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

    if (!userId) return;

    try {
      const { data: existingPref } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPref) {
        await supabase
          .from('user_preferences')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_preferences')
          .insert([{
            user_id: userId,
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error(`Error inesperado al sincronizar la preferencia ${key}:`, error);
    }
  };

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
        products: list.products || []
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
        Alert.alert('Error', 'No se pudo eliminar la lista de la base de datos.');
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
    if (screenName === 'addCardMovement' && param) setSelectedCard(param);
    if (screenName === 'addMovement') setSelectedMovement(param || null);
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

  const currentAccountData = accounts.find(a => a.id === selectedAccount?.id) || selectedAccount;

  if (!isAuthenticated) {
    if (authScreen === 'login') {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
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
          </SafeAreaView>
        </SafeAreaProvider>
      );
    } else {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
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
          </SafeAreaView>
        </SafeAreaProvider>
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
            onLogout={async () => {
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setNavigationHistory([]);
              setCurrentScreen('home');
            }}
          />
        );
      case 'menu':
        return (
          <MenuScreen 
            navigation={{ goBack, navigate: navigateTo }}
            userId={userId}
            userEmail={userEmail}
            userName={userName}
          />
        );
      case 'preferences':
        return (
          <PreferencesScreen 
            userId={userId}
            navigation={navigateTo}
            accounts={accounts}
            transactions={transactions}
            onProfileUpdated={() => refreshUserData(userId)}
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
            navigation={navigateTo}
            accounts={accounts}
            setAccounts={handleSetAccounts}
            movements={movements}
            rates={rates}
            onSelectAccount={(acc) => setSelectedAccount(acc)}
            userId={userId}
          />
        );
      case 'accountDetail':
        return (
          <AccountDetailScreen 
            navigation={(screen, param) => navigateTo(screen, param)}
            onGoBack={goBack}
            account={currentAccountData}
            rates={rates}
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
            rates={rates}
            currentAccount={currentAccountData}
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
            rates={rates}
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
            rates={rates}
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
            rates={rates}
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
        return <ConverterCalculatorScreen navigation={navigateTo} rates={rates} />;
      case 'movements':
        return (
          <MovementsScreen 
            navigation={navigateTo} 
            movements={movements} 
            accounts={accounts} 
            categories={categories}
            initialFilter={movementFilterParam}
            bcvRate={rates.bcvRate}
          />
        );
      case 'exportMovements':
        return (
          <ExportScreen 
            navigation={{ goBack, navigate: navigateTo }}
            userId={userId}
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
        return <AddCreditCardScreen navigation={navigateTo} userId={userId} />;
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
            rates={rates}
            selectedCurrencyFilter={selectedCurrencyFilter}
            setSelectedCurrencyFilter={setSelectedCurrencyFilter}
            activeShortcuts={appSettings.activeShortcuts}
            activeWidgets={appSettings.activeWidgets}
          />
        );
    }
  };

  const showTabBar = currentScreen === 'home' || currentScreen === 'budgets' || currentScreen === 'presupuestos' || currentScreen === 'profile' || currentScreen === 'menu';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        <View style={[styles.screenContainer, !showTabBar && { paddingBottom: 0 }]}>
          {renderScreen()}
        </View>

        {showTabBar && (
          <View style={styles.bottomTabBar}>
            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => navigateTo('home')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={currentScreen === 'home' ? "home" : "home-outline"} 
                size={22} 
                color={currentScreen === 'home' ? '#a3e635' : '#888'} 
              />
              <Text style={[styles.tabLabel, currentScreen === 'home' && styles.tabLabelActive]}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => navigateTo('budgets')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={currentScreen === 'budgets' || currentScreen === 'presupuestos' ? "pie-chart" : "pie-chart-outline"} 
                size={22} 
                color={currentScreen === 'budgets' || currentScreen === 'presupuestos' ? '#a3e635' : '#888'} 
              />
              <Text style={[styles.tabLabel, (currentScreen === 'budgets' || currentScreen === 'presupuestos') && styles.tabLabelActive]}>Presupuesto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => navigateTo('menu')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={currentScreen === 'profile' || currentScreen === 'menu' ? "menu" : "menu-outline"} 
                size={24} 
                color={currentScreen === 'profile' || currentScreen === 'menu' ? '#a3e635' : '#888'} 
              />
              <Text style={[styles.tabLabel, (currentScreen === 'profile' || currentScreen === 'menu') && styles.tabLabelActive]}>Menú</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
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
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    zIndex: 999,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#a3e635',
    fontWeight: 'bold',
  },
});