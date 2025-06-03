// js/firebase-config.js
// Configuração do Firebase - EliteControl Sistema - CORRIGIDO

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

  // Configurações de desenvolvimento vs produção
  const isDevelopment = location.hostname === 'localhost' ||
                       location.hostname === '127.0.0.1' ||
                       location.hostname.includes('localhost:');

  if (isDevelopment) {
    console.log('🔧 Modo de desenvolvimento ativo');
    firebase.firestore.setLogLevel('debug');
  } else {
    console.log('🚀 Modo de produção ativo');
    firebase.firestore.setLogLevel('silent');
  }

  // Aplicar configurações gerais do Firestore
  try {
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      merge: true
    });
    console.log('⚙️ Configurações do Firestore aplicadas.');
  } catch(e) {
    if (e.message.includes("already been started")) {
        console.warn("⚠️ Firestore já iniciado, configurações não puderam ser aplicadas.");
    } else {
        console.error("❌ Erro ao aplicar configurações do Firestore:", e);
    }
  }

  // Habilitar persistência offline
  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('✅ Persistência offline habilitada');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Múltiplas abas abertas, persistência offline pode ser afetada.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline.');
      } else {
        console.error('❌ Erro ao habilitar persistência offline:', err);
      }
    });

  console.log('✅ Serviços Firebase configurados:');
  console.log('   - Authentication: ✅');
  console.log('   - Firestore: ✅');

} catch (error) {
  console.error('❌ Erro ao configurar serviços Firebase:', error);
  throw error;
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

// Expor instâncias globalmente para acesso em outros scripts
window.firebase = firebase;
window.auth = auth;
window.db = db;

// Log final de confirmação
console.log('🎉 Firebase EliteControl configurado e pronto para uso!');
console.log('📊 Projeto:', firebaseConfig.projectId);
console.log('🔐 Domínio:', firebaseConfig.authDomain);
