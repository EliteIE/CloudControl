// js/firebase-config.js
// Configuração do Firebase - EliteControl Sistema

// IMPORTANTE: Substitua estas configurações pelas do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1t6vbSqI2s1Wsw3eGSMozWaZSTMDfukA",
  authDomain: "elitecontrol-765fd.firebaseapp.com",
  projectId: "elitecontrol-765fd",
  storageBucket: "elitecontrol-765fd.appspot.com",
  messagingSenderId: "939140418428",
  appId: "1:939140418428:web:beeca76505e69329baf2f9",
  measurementId: "G-PNDBZB9HR5" // Opcional, apenas para Google Analytics
};

// Verificar se o Firebase SDK foi carregado
if (typeof firebase === 'undefined') {
  console.error('❌ Firebase SDK não foi carregado! Verifique se os scripts estão incluídos.');
  throw new Error('Firebase SDK não encontrado');
}

// Inicializar Firebase
let app;
try {
  // Verificar se o Firebase já foi inicializado para evitar erros
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado com sucesso');
  } else {
    app = firebase.app(); // Usar a instância já inicializada
    console.log('✅ Firebase já estava inicializado');
  }
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
  throw error;
}

// Inicializar serviços do Firebase
let auth, db;

try {
  auth = firebase.auth();
  db = firebase.firestore();
  
  // Configurações opcionais do Firestore para melhor performance
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
  });
  
  // Habilitar persistência offline (opcional)
  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('✅ Persistência offline habilitada');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Múltiplas abas abertas, persistência offline desabilitada');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline');
      }
    });
  
  console.log('✅ Serviços Firebase configurados:');
  console.log('   - Authentication: ✅');
  console.log('   - Firestore: ✅');
  
} catch (error) {
  console.error('❌ Erro ao configurar serviços Firebase:', error);
  throw error;
}

// Configurações de desenvolvimento vs produção
const isDevelopment = location.hostname === 'localhost' || 
                     location.hostname === '127.0.0.1' || 
                     location.hostname.includes('localhost');

if (isDevelopment) {
  console.log('🔧 Modo de desenvolvimento ativo');
  
  // Configurações específicas para desenvolvimento
  firebase.firestore().settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  // Habilitar logs detalhados em desenvolvimento
  firebase.firestore.setLogLevel('debug');
} else {
  console.log('🚀 Modo de produção ativo');
  
  // Desabilitar logs em produção
  firebase.firestore.setLogLevel('silent');
}

// Função utilitária para verificar conexão
window.checkFirebaseConnection = async function() {
  try {
    // Tentar uma operação simples para verificar conectividade
    await db.collection('_test').limit(1).get();
    console.log('✅ Conexão com Firestore verificada');
    return true;
  } catch (error) {
    console.error('❌ Erro de conexão com Firestore:', error);
    return false;
  }
};

// Função utilitária para verificar autenticação
window.checkAuthStatus = function() {
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
};

// Event listeners para monitorar estado da conexão
window.addEventListener('online', () => {
  console.log('🌐 Conexão online restaurada');
});

window.addEventListener('offline', () => {
  console.warn('📡 Conexão offline - dados serão sincronizados quando voltar online');
});

// Configuração de timeout para operações do Firestore
const originalTimeout = firebase.firestore().settings;
firebase.firestore().settings({
  ...originalTimeout,
  experimentalForceLongPolling: false, // Melhor para conexões instáveis
});

// Tratar erros de rede automaticamente
db.onSnapshotsInSync(() => {
  console.log('📡 Dados sincronizados com o servidor');
});

// Expor instâncias globalmente para acesso em outros scripts
window.firebase = firebase;
window.auth = auth;
window.db = db;

// Log final de confirmação
console.log('🎉 Firebase EliteControl configurado e pronto para uso!');
console.log('📊 Projeto:', firebaseConfig.projectId);
console.log('🔐 Domínio:', firebaseConfig.authDomain);
