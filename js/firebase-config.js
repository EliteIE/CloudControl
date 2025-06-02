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
  db = firebase.firestore(); // Firestore é instanciado aqui

  // --- INÍCIO DA SEÇÃO CORRIGIDA ---

  // Configurações de desenvolvimento vs produção
  const isDevelopment = location.hostname === 'localhost' ||
                       location.hostname === '127.0.0.1' ||
                       location.hostname.includes('localhost:'); // Mais específico para localhost com porta

  if (isDevelopment) {
    console.log('🔧 Modo de desenvolvimento ativo. Configurando emulador do Firestore...');
    // Aplicar configurações do emulador PRIMEIRO para o objeto db
    // É crucial que esta seja a primeira operação de settings no objeto 'db'
    // se você pretende usar o emulador.
    try {
        db.settings({
            host: 'localhost:8080', // Endereço do emulador Firestore
            ssl: false,
            // experimentalForceLongPolling: true, // Descomente se necessário para o emulador
        });
        console.log('🛠️ Emulador do Firestore configurado para localhost:8080');
        firebase.firestore.setLogLevel('debug'); // Habilitar logs detalhados em desenvolvimento
    } catch (e) {
        // Este erro "Firestore has already been started" pode acontecer se o db já foi usado.
        if (e.message.includes("already been started")) {
            console.warn("⚠️ Firestore já iniciado, não foi possível reconfigurar para emulador. Isso pode ser normal em HMR ou se outra config foi aplicada antes.");
        } else {
            console.error("❌ Erro ao configurar emulador do Firestore:", e);
        }
    }
  } else {
    console.log('🚀 Modo de produção ativo');
    firebase.firestore.setLogLevel('silent'); // Desabilitar logs em produção
  }

  // Aplicar outras configurações gerais do Firestore DEPOIS da configuração do emulador (se houver)
  // Estas configurações podem ser aplicadas mesmo que o emulador não esteja em uso.
  try {
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true // Garante que as atualizações de documentos mesclem os dados
    });
    console.log('⚙️ Configurações gerais do Firestore (cache, merge) aplicadas.');
  } catch(e) {
    // Se o erro for "already been started" e não estamos em desenvolvimento (onde já tentamos o emulador),
    // então algo está chamando settings() fora de ordem.
    // Se for em desenvolvimento e o emulador já foi configurado, este erro pode ser ignorado para estas settings.
    if (e.message.includes("already been started") && !isDevelopment) {
        console.warn("⚠️ Firestore já iniciado, não foi possível aplicar configurações gerais (cache, merge). Verifique a ordem das inicializações.");
    } else if (!e.message.includes("already been started")) { // Logar outros erros
        console.error("❌ Erro ao aplicar configurações gerais do Firestore:", e);
    }
  }

  // Habilitar persistência offline (opcional, mas se usado, depois das settings)
  // A persistência pode ser habilitada uma única vez.
  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('✅ Persistência offline habilitada');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Múltiplas abas abertas, persistência offline pode ser afetada ou desabilitada em uma das abas.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline.');
      } else {
        console.error('❌ Erro ao habilitar persistência offline:', err);
      }
    });

  // --- FIM DA SEÇÃO CORRIGIDA ---

  console.log('✅ Serviços Firebase configurados:');
  console.log('   - Authentication: ✅');
  console.log('   - Firestore: ✅');

} catch (error) {
  console.error('❌ Erro ao configurar serviços Firebase:', error);
  throw error; // Re-throw para que o erro seja visível e interrompa se crítico
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
