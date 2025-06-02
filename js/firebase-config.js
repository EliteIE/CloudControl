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
  
  console.log('✅ Serviços Firebase configurados:');
  console.log('   - Authentication: ✅');
  console.log('   - Firestore: ✅');
  
  // Habilitar persistência offline (opcional) - COMENTADO para evitar problemas
  // db.enablePersistence({ synchronizeTabs: true })
  //   .then(() => {
  //     console.log('✅ Persistência offline habilitada');
  //   })
  //   .catch((err) => {
  //     if (err.code === 'failed-precondition') {
  //       console.warn('⚠️ Múltiplas abas abertas, persistência offline desabilitada');
  //     } else if (err.code === 'unimplemented') {
  //       console.warn('⚠️ Navegador não suporta persistência offline');
  //     }
  //   });
  
} catch (error) {
  console.error('❌ Erro ao configurar serviços Firebase:', error);
  throw error;
}

// Configurações de desenvolvimento vs produção - REMOVIDO O MODO LOCAL
const isDevelopment = location.hostname === 'localhost' || 
                     location.hostname === '127.0.0.1' || 
                     location.hostname.includes('localhost');

if (isDevelopment) {
  console.log('🔧 Modo de desenvolvimento ativo');
  // NÃO conectar ao emulador local por padrão
  // Se quiser usar o emulador, descomente as linhas abaixo:
  // auth.useEmulator('http://localhost:9099');
  // db.useEmulator('localhost', 8080);
} else {
  console.log('🚀 Modo de produção ativo');
}

// Função utilitária para verificar conexão
window.checkFirebaseConnection = async function() {
  try {
    // Tentar uma operação simples para verificar conectividade
    const testDoc = await db.collection('_test').doc('connection').get();
    console.log('✅ Conexão com Firestore verificada');
    return true;
  } catch (error) {
    // Ignorar erro se for apenas documento não encontrado
    if (error.code === 'permission-denied') {
      console.log('✅ Firestore conectado (permissão negada é esperada para _test)');
      return true;
    }
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

// Tratar erros de rede automaticamente
if (db.onSnapshotsInSync) {
  db.onSnapshotsInSync(() => {
    console.log('📡 Dados sincronizados com o servidor');
  });
}

// Expor instâncias globalmente para acesso em outros scripts
window.firebase = firebase;
window.auth = auth;
window.db = db;

// Log final de confirmação
console.log('🎉 Firebase EliteControl configurado e pronto para uso!');
console.log('📊 Projeto:', firebaseConfig.projectId);
console.log('🔐 Domínio:', firebaseConfig.authDomain);

// Teste rápido de autenticação
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('👤 Usuário autenticado:', user.email);
  } else {
    console.log('👤 Nenhum usuário autenticado');
  }
});
