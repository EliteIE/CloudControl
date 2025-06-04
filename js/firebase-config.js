// js/firebase-config.js
// Configuração do Firebase - EliteControl Sistema v2.0 - OTIMIZADO

// IMPORTANTE: Substitua estas configurações pelas do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1t6vbSqI2s1Wsw3eGSMozWaZSTMDfukA",
  authDomain: "elitecontrol-765fd.firebaseapp.com",
  projectId: "elitecontrol-765fd",
  storageBucket: "elitecontrol-765fd.appspot.com",
  messagingSenderId: "939140418428",
  appId: "1:939140418428:web:beeca76505e69329baf2f9",
  measurementId: "G-PNDBZB9HR5"
};

// Estado da aplicação
const AppState = {
  isInitialized: false,
  isOnline: navigator.onLine,
  retryCount: 0,
  maxRetries: 3,
  retryDelay: 1000
};

// Verificar se o Firebase SDK foi carregado
if (typeof firebase === 'undefined') {
  console.error('❌ Firebase SDK não foi carregado! Verifique se os scripts estão incluídos.');
  throw new Error('Firebase SDK não encontrado');
}

// Inicializar Firebase com tratamento de erros robusto
let app, auth, db;

async function initializeFirebase() {
  try {
    console.log('🔧 Inicializando Firebase...');
    
    // Verificar se o Firebase já foi inicializado
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado com sucesso');
    } else {
      app = firebase.app();
      console.log('✅ Firebase já estava inicializado');
    }

    // Inicializar serviços
    auth = firebase.auth();
    db = firebase.firestore();

    // Configurar ambiente
    const isDevelopment = location.hostname === 'localhost' ||
                         location.hostname === '127.0.0.1' ||
                         location.hostname.includes('localhost:') ||
                         location.hostname.includes('127.0.0.1:');

    if (isDevelopment) {
      console.log('🔧 Modo de desenvolvimento ativo');
      firebase.firestore.setLogLevel('debug');
      
      // Emulators para desenvolvimento local (descomente se necessário)
      // auth.useEmulator('http://localhost:9099');
      // db.useEmulator('localhost', 8080);
    } else {
      console.log('🚀 Modo de produção ativo');
      firebase.firestore.setLogLevel('silent');
    }

    // Aplicar configurações do Firestore
    await configureFirestore();
    
    // Configurar persistência offline
    await enableOfflinePersistence();
    
    // Configurar monitoramento de conectividade
    setupConnectivityMonitoring();
    
    // Configurar auth state persistence
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    
    AppState.isInitialized = true;
    console.log('✅ Firebase totalmente configurado e pronto para uso!');
    
    return { auth, db, app };
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    
    // Retry logic
    if (AppState.retryCount < AppState.maxRetries) {
      AppState.retryCount++;
      console.log(`🔄 Tentativa ${AppState.retryCount}/${AppState.maxRetries} em ${AppState.retryDelay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, AppState.retryDelay));
      AppState.retryDelay *= 2; // Exponential backoff
      
      return initializeFirebase();
    }
    
    throw error;
  }
}

// Configurar Firestore com tratamento de erros
async function configureFirestore() {
  try {
    // Configurações de performance
    const settings = {
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      merge: true,
      // Configurações adicionais para melhor performance
      experimentalForceLongPolling: false, // Use WebSocket quando possível
      experimentalAutoDetectLongPolling: true
    };
    
    db.settings(settings);
    console.log('⚙️ Configurações do Firestore aplicadas com sucesso');
    
  } catch (error) {
    if (error.message.includes("already been started")) {
      console.warn("⚠️ Firestore já iniciado, configurações não puderam ser aplicadas");
    } else {
      console.error("❌ Erro ao aplicar configurações do Firestore:", error);
      throw error;
    }
  }
}

// Habilitar persistência offline com tratamento robusto
async function enableOfflinePersistence() {
  try {
    await db.enablePersistence({ 
      synchronizeTabs: true,
      experimentalTabSynchronization: true
    });
    console.log('✅ Persistência offline habilitada com sincronização de abas');
    
  } catch (error) {
    switch (error.code) {
      case 'failed-precondition':
        console.warn('⚠️ Múltiplas abas abertas, persistência offline pode ser limitada');
        // Tentar sem sincronização de abas
        try {
          await db.enablePersistence({ synchronizeTabs: false });
          console.log('✅ Persistência offline habilitada sem sincronização de abas');
        } catch (fallbackError) {
          console.error('❌ Não foi possível habilitar persistência offline:', fallbackError);
        }
        break;
        
      case 'unimplemented':
        console.warn('⚠️ Navegador não suporta persistência offline');
        break;
        
      default:
        console.error('❌ Erro desconhecido ao habilitar persistência offline:', error);
    }
  }
}

// Monitoramento de conectividade
function setupConnectivityMonitoring() {
  // Monitorar estado online/offline
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Monitorar mudanças no Firestore
  db.enableNetwork().then(() => {
    console.log('🌐 Rede Firestore habilitada');
  }).catch(error => {
    console.error('❌ Erro ao habilitar rede Firestore:', error);
  });
}

function handleOnline() {
  AppState.isOnline = true;
  console.log('🌐 Conexão online restaurada');
  
  // Tentar reabilitar rede do Firestore
  db.enableNetwork().catch(error => {
    console.error('❌ Erro ao reabilitar rede Firestore:', error);
  });
  
  // Disparar evento customizado
  window.dispatchEvent(new CustomEvent('firebase:online'));
  
  // Mostrar notificação se disponível
  if (window.showTemporaryAlert) {
    window.showTemporaryAlert('Conexão restaurada', 'success', 3000);
  }
}

function handleOffline() {
  AppState.isOnline = false;
  console.warn('📡 Conexão offline - dados serão sincronizados quando voltar online');
  
  // Disparar evento customizado
  window.dispatchEvent(new CustomEvent('firebase:offline'));
  
  // Mostrar notificação se disponível
  if (window.showTemporaryAlert) {
    window.showTemporaryAlert('Modo offline ativo', 'warning', 3000);
  }
}

// Função utilitária para verificar conexão com Firestore
async function checkFirestoreConnection() {
  try {
    console.log('🔍 Verificando conexão com Firestore...');
    
    // Tentar uma operação simples
    const testRef = db.collection('_connection_test').doc('test');
    await testRef.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      test: true
    }, { merge: true });
    
    // Limpar documento de teste
    await testRef.delete();
    
    console.log('✅ Conexão com Firestore verificada');
    return true;
    
  } catch (error) {
    console.error('❌ Erro de conexão com Firestore:', error);
    return false;
  }
}

// Função utilitária para verificar status de autenticação
function checkAuthStatus() {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(false);
      return;
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

// Função para retry de operações
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`❌ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
}

// Função para obter timestamp do servidor
function getServerTimestamp() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

// Função para obter timestamp atual
function getCurrentTimestamp() {
  return firebase.firestore.Timestamp.now();
}

// Função para converter timestamp para Date
function timestampToDate(timestamp) {
  if (!timestamp) return null;
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  return new Date(timestamp);
}

// Configurar listeners de erro global
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.code && event.reason.code.startsWith('firestore/')) {
    console.error('❌ Erro não tratado do Firestore:', event.reason);
    
    // Tentar reconectar se for erro de rede
    if (event.reason.code === 'firestore/unavailable') {
      setTimeout(checkFirestoreConnection, 5000);
    }
  }
});

// Performance monitoring
const performanceMonitor = {
  operationTimes: {},
  
  startOperation(operationName) {
    this.operationTimes[operationName] = performance.now();
  },
  
  endOperation(operationName) {
    if (this.operationTimes[operationName]) {
      const duration = performance.now() - this.operationTimes[operationName];
      console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      delete this.operationTimes[operationName];
      return duration;
    }
  }
};

// Inicializar Firebase automaticamente
initializeFirebase().catch(error => {
  console.error('❌ Falha crítica ao inicializar Firebase:', error);
  
  // Mostrar erro para o usuário
  if (window.showTemporaryAlert) {
    window.showTemporaryAlert('Erro de conexão. Verifique sua internet.', 'error', 10000);
  }
});

// Expor funcionalidades globalmente
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.checkFirestoreConnection = checkFirestoreConnection;
window.checkAuthStatus = checkAuthStatus;
window.retryOperation = retryOperation;
window.getServerTimestamp = getServerTimestamp;
window.getCurrentTimestamp = getCurrentTimestamp;
window.timestampToDate = timestampToDate;
window.performanceMonitor = performanceMonitor;
window.AppState = AppState;

// Utilitários para desenvolvimento
if (AppState.isDevelopment) {
  window.FirebaseUtils = {
    clearCache: () => db.clearPersistence(),
    disableNetwork: () => db.disableNetwork(),
    enableNetwork: () => db.enableNetwork(),
    getAppState: () => AppState,
    resetRetryCount: () => { AppState.retryCount = 0; AppState.retryDelay = 1000; }
  };
}

// Log de inicialização completa
console.log('🎉 Firebase EliteControl v2.0 configurado e pronto para uso!');
console.log('📊 Projeto:', firebaseConfig.projectId);
console.log('🔐 Domínio:', firebaseConfig.authDomain);
console.log('🌐 Status:', AppState.isOnline ? 'Online' : 'Offline');

// Exportar configurações para módulos ES6 se necessário
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    auth,
    db,
    app,
    checkFirestoreConnection,
    checkAuthStatus,
    retryOperation,
    getServerTimestamp,
    getCurrentTimestamp,
    timestampToDate,
    performanceMonitor,
    AppState
  };
}
