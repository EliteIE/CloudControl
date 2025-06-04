// js/main.js - EliteControl v2.0 Sistema Completo e Otimizado
// Desenvolvido por Elite Intelligence Assistant v3.0

// === NAMESPACE PRINCIPAL ===
const EliteControl = {
    // Estados da aplicação
    state: {
        currentUser: null,
        modalEventListenersAttached: false,
        isModalProcessing: false,
        saleCart: [],
        availableProducts: [],
        selectedCustomer: null,
        isInitialized: false,
        charts: {},
        notifications: [],
        settings: {
            theme: 'dark',
            language: 'pt-BR',
            autoSave: true,
            notifications: true
        }
    },

    // Elementos do DOM
    elements: {
        productModal: null,
        productForm: null,
        productModalTitle: null,
        productIdField: null,
        productNameField: null,
        productCategoryField: null,
        productPriceField: null,
        productStockField: null,
        productLowStockAlertField: null,
        closeProductModalButton: null,
        cancelProductFormButton: null,
        saveProductButton: null
    },

    // Dados de teste
    testUsers: {
        'admin@elitecontrol.com': {
            name: 'Administrador Elite',
            role: 'Dono/Gerente',
            email: 'admin@elitecontrol.com'
        },
        'estoque@elitecontrol.com': {
            name: 'Controlador de Estoque',
            role: 'Controlador de Estoque',
            email: 'estoque@elitecontrol.com'
        },
        'vendas@elitecontrol.com': {
            name: 'Vendedor Elite',
            role: 'Vendedor',
            email: 'vendas@elitecontrol.com'
        }
    },

    // Produtos de exemplo
    sampleProducts: [
        { name: 'Notebook Dell Inspiron 15', category: 'Eletrônicos', price: 2499.99, stock: 12, lowStockAlert: 5 },
        { name: 'Mouse Logitech MX Master 3', category: 'Periféricos', price: 399.90, stock: 25, lowStockAlert: 10 },
        { name: 'Teclado Mecânico Corsair', category: 'Periféricos', price: 549.99, stock: 8, lowStockAlert: 5 },
        { name: 'Monitor LG 27" 4K', category: 'Monitores', price: 1299.99, stock: 6, lowStockAlert: 3 },
        { name: 'SSD Samsung 1TB', category: 'Armazenamento', price: 499.99, stock: 30, lowStockAlert: 15 },
        { name: 'Webcam Logitech C920', category: 'Periféricos', price: 299.99, stock: 15, lowStockAlert: 8 },
        { name: 'Headset HyperX Cloud', category: 'Áudio', price: 349.99, stock: 20, lowStockAlert: 10 },
        { name: 'Smartphone Samsung Galaxy', category: 'Celulares', price: 1899.99, stock: 5, lowStockAlert: 3 }
    ]
};

// === INICIALIZAÇÃO PRINCIPAL ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando EliteControl v2.0...');
    
    // Verificar dependências
    if (!checkDependencies()) {
        showCriticalError('Dependências não carregadas. Verifique a conexão.');
        return;
    }

    // Configurar sistema
    setupGlobalErrorHandling();
    setupServiceWorker();
    initializeSystem();
});

// === VERIFICAÇÃO DE DEPENDÊNCIAS ===
function checkDependencies() {
    const required = ['firebase', 'db', 'auth'];
    const missing = required.filter(dep => typeof window[dep] === 'undefined');
    
    if (missing.length > 0) {
        console.error('❌ Dependências faltando:', missing);
        return false;
    }
    
    return true;
}

// === TRATAMENTO GLOBAL DE ERROS ===
function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('❌ Erro global:', event.error);
        showTemporaryAlert('Ocorreu um erro inesperado. Recarregue a página se necessário.', 'error');
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Promise rejeitada:', event.reason);
        event.preventDefault();
    });
}

// === SERVICE WORKER ===
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ Service Worker registrado'))
            .catch(() => console.log('⚠️ Service Worker não disponível'));
    }
}

// === INICIALIZAÇÃO DO SISTEMA ===
async function initializeSystem() {
    try {
        // Configurar event listeners básicos
        setupEventListeners();
        
        // Inicializar elementos do modal
        initializeModalElements();
        
        // Configurar autenticação
        firebase.auth().onAuthStateChanged(handleAuthStateChange);
        
        // Marcar como inicializado
        EliteControl.state.isInitialized = true;
        
        console.log('✅ Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showCriticalError('Falha na inicialização do sistema');
    }
}

// === AUTENTICAÇÃO ===
async function handleAuthStateChange(user) {
    console.log('🔐 Estado de autenticação alterado:', user ? 'Logado' : 'Deslogado');

    if (user) {
        try {
            // Garantir dados de teste
            await ensureTestDataExists();
            
            // Buscar dados do usuário
            let userData = await DataService.getUserData(user.uid);

            if (!userData) {
                userData = await findUserByEmail(user.email);
            }

            if (!userData && EliteControl.testUsers[user.email]) {
                userData = await createTestUser(user.uid, user.email);
            }

            if (userData && userData.role) {
                // Salvar dados do usuário
                EliteControl.state.currentUser = { uid: user.uid, email: user.email, ...userData };
                localStorage.setItem('elitecontrol_user_role', userData.role);

                // Inicializar interface
                await initializeUserInterface();
                
                // Navegar para seção apropriada
                await handleNavigation();

            } else {
                throw new Error('Dados do usuário não encontrados ou inválidos');
            }

        } catch (error) {
            console.error("❌ Erro no processo de autenticação:", error);
            showTemporaryAlert("Erro ao carregar dados do usuário.", "error");
            
            if (!window.location.pathname.includes('index.html')) {
                await firebase.auth().signOut();
            }
        }
    } else {
        handleLoggedOut();
    }
}

// === INTERFACE DO USUÁRIO ===
async function initializeUserInterface() {
    const currentUser = EliteControl.state.currentUser;
    console.log("🎨 Inicializando interface para:", currentUser.role);

    // Atualizar informações do usuário
    updateUserInfo(currentUser);
    
    // Inicializar sidebar
    initializeSidebar(currentUser.role);
    
    // Inicializar notificações
    initializeNotifications();
    
    // Mostrar mensagem de boas-vindas
    if (window.location.href.includes('dashboard.html') && 
        !sessionStorage.getItem('welcomeAlertShown')) {
        const userName = currentUser.name || currentUser.email.split('@')[0];
        showTemporaryAlert(`Bem-vindo, ${userName}! Sistema EliteControl v2.0`, 'success', 5000);
        sessionStorage.setItem('welcomeAlertShown', 'true');
    }
}

// === NAVEGAÇÃO ===
async function handleNavigation() {
    const currentUser = EliteControl.state.currentUser;
    const currentPath = window.location.pathname;
    const isIndexPage = currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/');
    const isDashboardPage = currentPath.includes('dashboard.html');

    if (isIndexPage) {
        console.log("🔄 Redirecionando para dashboard...");
        window.location.href = 'dashboard.html' + (window.location.hash || '');
    } else if (isDashboardPage) {
        console.log("📊 Carregando dashboard...");
        const section = window.location.hash.substring(1);
        const defaultSection = getDefaultSection(currentUser.role);
        const targetSection = section || defaultSection;

        await loadSectionContent(targetSection);
        updateSidebarActiveState(targetSection);
    } else {
        console.log("🔄 Redirecionando para dashboard...");
        window.location.href = 'dashboard.html';
    }
}

function handleLoggedOut() {
    console.log("🔒 Usuário deslogado");
    
    // Limpar dados
    EliteControl.state.currentUser = null;
    localStorage.removeItem('elitecontrol_user_role');
    sessionStorage.removeItem('welcomeAlertShown');

    // Limpar interface se estiver no dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        clearDashboardUI();
    }

    // Redirecionar para login se necessário
    const isIndexPage = window.location.pathname.includes('index.html') ||
                       window.location.pathname === '/' ||
                       window.location.pathname.endsWith('/');

    if (!isIndexPage) {
        console.log("🔄 Redirecionando para login...");
        window.location.href = 'index.html';
    }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    console.log("🔧 Configurando event listeners globais");

    // Formulários
    setupFormListeners();
    
    // Navegação
    setupNavigationListeners();
    
    // Dropdowns
    setupDropdownListeners();
    
    // Produtos
    setupProductActionListeners();
    
    // Modal de produtos
    setupModalEventListeners();
    
    console.log("✅ Event listeners configurados");
}

function setupFormListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

function setupNavigationListeners() {
    // Hash change
    window.addEventListener('hashchange', handleHashChange);

    // Links de navegação
    document.addEventListener('click', function(e) {
        const navLink = e.target.closest('#navLinks a.nav-link');
        if (navLink) {
            e.preventDefault();
            const section = navLink.dataset.section;
            if (section) {
                window.location.hash = '#' + section;
            }
        }
    });
}

function setupDropdownListeners() {
    // Notificações
    const notificationButton = document.getElementById('notificationBellButton');
    const notificationDropdown = document.getElementById('notificationDropdown');

    if (notificationButton && notificationDropdown) {
        notificationButton.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });
    }

    // Menu do usuário
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
    }

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
        if (notificationDropdown && !notificationButton?.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }

        if (userDropdown && !userMenuButton?.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
    });

    // Marcar todas as notificações como lidas
    const markAllButton = document.getElementById('markAllAsReadButton');
    if (markAllButton) {
        markAllButton.addEventListener('click', markAllNotificationsAsRead);
    }
}

function setupProductActionListeners() {
    // Usar delegação de eventos para produtos criados dinamicamente
    document.addEventListener('click', function(e) {
        // Adicionar produto
        if (e.target.closest('#openAddProductModalButton')) {
            e.preventDefault();
            openProductModal();
            return;
        }

        // Editar produto
        const editButton = e.target.closest('.edit-product-btn');
        if (editButton) {
            e.preventDefault();
            const productId = editButton.dataset.productId;
            if (productId) {
                handleEditProduct(productId);
            }
            return;
        }

        // Excluir produto
        const deleteButton = e.target.closest('.delete-product-btn');
        if (deleteButton) {
            e.preventDefault();
            const productId = deleteButton.dataset.productId;
            const productName = deleteButton.dataset.productName;
            if (productId && productName) {
                handleDeleteProduct(productId, productName);
            }
            return;
        }
    });
}

// === HASH CHANGE ===
function handleHashChange() {
    const currentUser = EliteControl.state.currentUser;
    if (!currentUser) return;

    const section = window.location.hash.substring(1);
    const defaultSection = getDefaultSection(currentUser.role);
    const targetSection = section || defaultSection;

    updateSidebarActiveState(targetSection);
    loadSectionContent(targetSection);
}

// === LOGIN/LOGOUT ===
async function handleLogin(e) {
    e.preventDefault();
    console.log("🔑 Processando login");

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const perfil = document.getElementById('perfil')?.value;

    // Validações
    if (!email || !password) {
        showLoginError('Por favor, preencha email e senha.');
        return;
    }

    if (!perfil) {
        showLoginError('Por favor, selecione seu perfil.');
        return;
    }

    const loginButton = e.target.querySelector('button[type="submit"]');
    const originalText = loginButton?.textContent;

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
    }

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);

        const user = firebase.auth().currentUser;
        if (user) {
            let userData = await DataService.getUserData(user.uid);

            if (!userData) {
                userData = await findUserByEmail(email);
            }

            if (!userData && EliteControl.testUsers[email]) {
                userData = await createTestUser(user.uid, email);
            }

            if (userData && userData.role === perfil) {
                showLoginError('');
                console.log("✅ Login realizado com sucesso");
            } else if (userData && userData.role !== perfil) {
                await firebase.auth().signOut();
                showLoginError(`Perfil selecionado (${perfil}) não corresponde ao seu perfil (${userData.role}).`);
            } else {
                await firebase.auth().signOut();
                showLoginError('Não foi possível verificar os dados do perfil.');
            }
        }

    } catch (error) {
        console.error("❌ Erro de login:", error);
        
        let message = "Email ou senha inválidos.";
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                message = "Usuário não encontrado ou credenciais incorretas.";
                break;
            case 'auth/wrong-password':
                message = "Senha incorreta.";
                break;
            case 'auth/invalid-email':
                message = "Formato de email inválido.";
                break;
            case 'auth/network-request-failed':
                message = "Erro de rede. Verifique sua conexão.";
                break;
            case 'auth/too-many-requests':
                message = "Muitas tentativas. Tente novamente mais tarde.";
                break;
        }

        showLoginError(message);

    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = originalText;
        }
    }
}

async function handleLogout() {
    console.log("👋 Realizando logout");

    try {
        await firebase.auth().signOut();
        sessionStorage.removeItem('welcomeAlertShown');
        window.location.hash = '';
        console.log("✅ Logout realizado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao fazer logout:", error);
        showTemporaryAlert('Erro ao sair. Tente novamente.', 'error');
    }
}

// === CARREGAMENTO DE SEÇÕES ===
async function loadSectionContent(sectionId) {
    console.log(`📄 Carregando seção: ${sectionId}`);

    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("❌ Área de conteúdo dinâmico não encontrada");
        return;
    }

    // Mostrar loading
    showLoadingState(dynamicContentArea, `Carregando ${sectionId}...`);

    try {
        const currentUser = EliteControl.state.currentUser;
        
        switch (sectionId) {
            case 'produtos':
                await loadProductsSection(dynamicContentArea);
                break;

            case 'produtos-consulta':
                await loadProductsConsultSection(dynamicContentArea);
                break;

            case 'geral':
            case 'vendas-painel':
            case 'estoque':
                await loadDashboardSection(dynamicContentArea);
                break;

            case 'registrar-venda':
                await loadRegisterSaleSection(dynamicContentArea);
                break;

            case 'vendas':
                await loadSalesSection(dynamicContentArea);
                break;

            case 'minhas-vendas':
                await loadMySalesSection(dynamicContentArea);
                break;

            case 'clientes':
                await loadCustomersSection(dynamicContentArea);
                break;

            case 'usuarios':
                await loadUsersSection(dynamicContentArea);
                break;

            case 'fornecedores':
                await loadSuppliersSection(dynamicContentArea);
                break;

            case 'movimentacoes':
                await loadMovementsSection(dynamicContentArea);
                break;

            case 'relatorios-estoque':
                await loadStockReportsSection(dynamicContentArea);
                break;

            case 'config':
                await loadConfigSection(dynamicContentArea);
                break;

            default:
                dynamicContentArea.innerHTML = `
                    <div class="p-8 text-center text-slate-400">
                        <i class="fas fa-construction fa-3x mb-4"></i>
                        <p>Seção "${sectionId}" em desenvolvimento.</p>
                        <p class="text-sm mt-2">Estamos trabalhando para disponibilizar em breve!</p>
                    </div>
                `;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar seção ${sectionId}:`, error);
        showErrorState(dynamicContentArea, `Erro ao carregar ${sectionId}`, error.message);
        showTemporaryAlert(`Erro ao carregar ${sectionId}.`, 'error');
    }
}

// === SEÇÕES ESPECÍFICAS ===

// Produtos
async function loadProductsSection(container) {
    const products = await DataService.getProducts();
    const userRole = EliteControl.state.currentUser.role;
    renderProductsList(products, container, userRole);
}

async function loadProductsConsultSection(container) {
    const products = await DataService.getProducts();
    renderProductsConsult(products, container);
}

// Dashboard
async function loadDashboardSection(container) {
    await loadDashboardData(container);
}

// Vendas
async function loadRegisterSaleSection(container) {
    renderRegisterSaleForm(container);
    
    // Carregar produtos disponíveis
    const products = await DataService.getProducts();
    EliteControl.state.availableProducts = products;
    
    // Configurar interface de venda
    setupSaleFormEventListeners();
    renderAvailableProducts(products);
    
    // Atualizar horário
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
}

async function loadSalesSection(container) {
    const sales = await DataService.getSales();
    renderSalesList(sales, container, false);
}

async function loadMySalesSection(container) {
    const currentUser = EliteControl.state.currentUser;
    const mySales = await DataService.getSalesBySeller(currentUser.uid);
    renderSalesList(mySales, container, true);
}

// Clientes
async function loadCustomersSection(container) {
    const currentUser = EliteControl.state.currentUser;
    
    if (currentUser.role !== 'Dono/Gerente') {
        container.innerHTML = `
            <div class="text-center py-16 text-red-400">
                <i class="fas fa-lock fa-4x mb-4"></i>
                <p class="text-lg">Acesso restrito ao administrador</p>
            </div>
        `;
        return;
    }

    await renderCustomersSection(container);
}

// Usuários
async function loadUsersSection(container) {
    renderUsersSection(container);
}

// Fornecedores
async function loadSuppliersSection(container) {
    renderSuppliersSection(container);
}

// Movimentações
async function loadMovementsSection(container) {
    renderMovementsSection(container);
}

// Relatórios de Estoque
async function loadStockReportsSection(container) {
    renderStockReportsSection(container);
}

// Configurações
async function loadConfigSection(container) {
    renderConfigSection(container);
}

// === RENDERIZAÇÃO DE PRODUTOS ===
function renderProductsList(products, container, userRole) {
    console.log("📦 Renderizando lista de produtos");

    const canEditProducts = userRole === 'Dono/Gerente' || userRole === 'Controlador de Estoque';

    container.innerHTML = `
        <div class="products-container">
            <div class="page-header mb-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">Gestão de Produtos</h2>
                        <p class="text-slate-400 mt-1">Gerencie o catálogo de produtos</p>
                    </div>
                    ${canEditProducts ? `
                        <button id="openAddProductModalButton" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            Adicionar Produto
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="filters-section mb-6">
                <div class="bg-slate-800 rounded-lg p-4">
                    <div class="flex flex-col lg:flex-row gap-4">
                        <div class="flex-1">
                            <div class="relative">
                                <input type="text" 
                                       id="productSearchField"
                                       class="form-input pl-10 w-full"
                                       placeholder="Buscar produtos por nome ou categoria...">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <select id="categoryFilter" class="form-select min-w-[150px]">
                                <option value="">Todas as categorias</option>
                            </select>
                            <select id="stockFilter" class="form-select min-w-[150px]">
                                <option value="">Todos os status</option>
                                <option value="available">Em estoque</option>
                                <option value="low">Estoque baixo</option>
                                <option value="out">Sem estoque</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <div class="text-sm text-slate-400">
                            <span id="productsCount">${products.length}</span> produtos encontrados
                        </div>
                        <button id="clearFiltersButton" class="btn-secondary btn-sm">
                            <i class="fas fa-times mr-1"></i>
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <div id="productsTableContainer" class="products-table-container">
                ${renderProductsTable(products, canEditProducts)}
            </div>
        </div>
    `;

    // Preencher filtros
    populateProductFilters(products);
    
    // Configurar eventos
    setupProductsFilters(products, canEditProducts);
}

function renderProductsTable(products, canEdit) {
    if (!products || products.length === 0) {
        return `
            <div class="bg-slate-800 rounded-lg p-8 text-center">
                <i class="fas fa-box-open fa-3x mb-4 text-slate-400"></i>
                <p class="text-slate-400 text-lg">Nenhum produto encontrado</p>
                ${canEdit ? '<p class="text-sm text-slate-500 mt-2">Clique em "Adicionar Produto" para começar</p>' : ''}
            </div>
        `;
    }

    return `
        <div class="bg-slate-800 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-700">
                    <thead class="bg-slate-700">
                        <tr>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Produto
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                                Categoria
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Preço
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Estoque
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                                Status
                            </th>
                            ${canEdit ? `
                                <th class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    Ações
                                </th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700">
                        ${products.map(product => renderProductRow(product, canEdit)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderProductRow(product, canEdit) {
    const lowStockThreshold = Number(product.lowStockAlert) || 10;
    const isLowStock = product.stock <= lowStockThreshold && product.stock > 0;
    const isOutOfStock = product.stock === 0;

    let statusClass = 'text-green-400';
    let statusIcon = 'fa-check-circle';
    let statusText = 'Em estoque';

    if (isOutOfStock) {
        statusClass = 'text-red-400';
        statusIcon = 'fa-times-circle';
        statusText = 'Sem estoque';
    } else if (isLowStock) {
        statusClass = 'text-yellow-400';
        statusIcon = 'fa-exclamation-triangle';
        statusText = 'Estoque baixo';
    }

    return `
        <tr class="hover:bg-slate-750 transition-colors duration-150">
            <td class="px-4 sm:px-6 py-4">
                <div>
                    <div class="text-sm font-medium text-slate-200">${product.name}</div>
                    <div class="text-xs text-slate-400 sm:hidden">${product.category}</div>
                </div>
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden sm:table-cell">
                ${product.category}
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-300">
                ${formatCurrency(product.price)}
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm text-slate-300">
                <div class="flex items-center">
                    <span class="${statusClass} mr-1">
                        <i class="fas ${statusIcon} text-xs"></i>
                    </span>
                    ${product.stock}
                </div>
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm ${statusClass} hidden lg:table-cell">
                <i class="fas ${statusIcon} mr-2"></i>
                ${statusText}
            </td>
            ${canEdit ? `
                <td class="px-4 sm:px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="product-action-btn edit-product-btn" 
                                data-product-id="${product.id}"
                                title="Editar produto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="product-action-btn delete-product-btn text-red-400 hover:text-red-300" 
                                data-product-id="${product.id}" 
                                data-product-name="${product.name}"
                                title="Excluir produto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            ` : ''}
        </tr>
    `;
}

function populateProductFilters(products) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
}

function setupProductsFilters(allProducts, canEdit) {
    const searchField = document.getElementById('productSearchField');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');
    const clearButton = document.getElementById('clearFiltersButton');
    const productsCount = document.getElementById('productsCount');

    const applyFilters = () => {
        const searchTerm = searchField?.value?.toLowerCase() || '';
        const category = categoryFilter?.value || '';
        const stockStatus = stockFilter?.value || '';

        let filtered = allProducts;

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm)
            );
        }

        // Filtro de categoria
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        // Filtro de estoque
        if (stockStatus) {
            filtered = filtered.filter(p => {
                const lowStockThreshold = Number(p.lowStockAlert) || 10;
                switch (stockStatus) {
                    case 'available':
                        return p.stock > lowStockThreshold;
                    case 'low':
                        return p.stock > 0 && p.stock <= lowStockThreshold;
                    case 'out':
                        return p.stock === 0;
                    default:
                        return true;
                }
            });
        }

        // Atualizar tabela
        const tableContainer = document.getElementById('productsTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = renderProductsTable(filtered, canEdit);
        }

        // Atualizar contador
        if (productsCount) {
            productsCount.textContent = filtered.length;
        }
    };

    // Event listeners
    searchField?.addEventListener('input', applyFilters);
    categoryFilter?.addEventListener('change', applyFilters);
    stockFilter?.addEventListener('change', applyFilters);

    clearButton?.addEventListener('click', () => {
        if (searchField) searchField.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (stockFilter) stockFilter.value = '';
        applyFilters();
    });
}

// === RENDERIZAÇÃO DE CONSULTA DE PRODUTOS ===
function renderProductsConsult(products, container) {
    console.log("🔍 Renderizando consulta de produtos");

    container.innerHTML = `
        <div class="products-consult-container">
            <div class="page-header mb-6">
                <h2 class="text-2xl font-bold text-slate-100">Consultar Produtos</h2>
                <p class="text-slate-400 mt-1">Visualize informações detalhadas dos produtos</p>
            </div>

            <div class="search-section mb-6">
                <div class="bg-slate-800 rounded-lg p-4">
                    <div class="flex flex-col lg:flex-row gap-4">
                        <div class="flex-1">
                            <div class="relative">
                                <input type="text"
                                       id="productConsultSearchInput"
                                       class="form-input pl-10 w-full"
                                       placeholder="Buscar por nome ou categoria...">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <select id="consultCategoryFilter" class="form-select min-w-[150px]">
                                <option value="">Todas as categorias</option>
                            </select>
                            <select id="consultStockFilter" class="form-select min-w-[150px]">
                                <option value="">Todos os status</option>
                                <option value="available">Em estoque</option>
                                <option value="low">Estoque baixo</option>
                                <option value="out">Sem estoque</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <div class="text-sm text-slate-400">
                            <span id="consultResultsCount">${products.length}</span> produtos encontrados
                        </div>
                        <button id="clearConsultFiltersButton" class="btn-secondary btn-sm">
                            <i class="fas fa-times mr-1"></i>
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <div id="productsConsultGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${renderProductsConsultCards(products)}
            </div>
        </div>
    `;

    // Preencher filtros
    populateConsultFilters(products);
    
    // Configurar eventos
    setupConsultFilters(products);
}

function renderProductsConsultCards(products) {
    if (!products || products.length === 0) {
        return `
            <div class="col-span-full text-center py-16 text-slate-400">
                <i class="fas fa-search fa-4x mb-4"></i>
                <p class="text-lg">Nenhum produto encontrado</p>
            </div>
        `;
    }

    return products.map(product => {
        const lowStockThreshold = Number(product.lowStockAlert) || 10;
        const stockClass = product.stock === 0 ? 'out' : 
                          (product.stock <= lowStockThreshold ? 'low' : 'available');
        const stockLabel = product.stock === 0 ? 'Sem estoque' :
                          (product.stock <= lowStockThreshold ? 'Estoque baixo' : 'Em estoque');

        return `
            <div class="product-consult-card ${stockClass}">
                <div class="product-card-header">
                    <h3 class="product-card-name">${product.name}</h3>
                    <span class="stock-badge ${stockClass}">${stockLabel}</span>
                </div>

                <div class="product-card-info">
                    <div class="info-row">
                        <span class="info-label">Categoria:</span>
                        <span class="info-value">${product.category}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Preço:</span>
                        <span class="info-value price">${formatCurrency(product.price)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Estoque:</span>
                        <span class="info-value">${product.stock} unidades</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Alerta em:</span>
                        <span class="info-value">${lowStockThreshold} unidades</span>
                    </div>
                </div>

                <div class="product-card-actions">
                    ${product.stock > 0 ? `
                        <button class="btn-primary btn-sm w-full"
                                onclick="window.location.hash='#registrar-venda'">
                            <i class="fas fa-shopping-cart mr-2"></i>
                            Vender Produto
                        </button>
                    ` : `
                        <button class="btn-secondary btn-sm w-full" disabled>
                            <i class="fas fa-times mr-2"></i>
                            Indisponível
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function populateConsultFilters(products) {
    const categoryFilter = document.getElementById('consultCategoryFilter');
    if (categoryFilter) {
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
}

function setupConsultFilters(allProducts) {
    const searchInput = document.getElementById('productConsultSearchInput');
    const categoryFilter = document.getElementById('consultCategoryFilter');
    const stockFilter = document.getElementById('consultStockFilter');
    const clearButton = document.getElementById('clearConsultFiltersButton');
    const resultsCount = document.getElementById('consultResultsCount');

    const applyFilters = () => {
        const searchTerm = searchInput?.value?.toLowerCase() || '';
        const category = categoryFilter?.value || '';
        const stockStatus = stockFilter?.value || '';

        let filtered = allProducts;

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm)
            );
        }

        // Filtro de categoria
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        // Filtro de estoque
        if (stockStatus) {
            filtered = filtered.filter(p => {
                const lowStockThreshold = Number(p.lowStockAlert) || 10;
                switch (stockStatus) {
                    case 'available':
                        return p.stock > lowStockThreshold;
                    case 'low':
                        return p.stock > 0 && p.stock <= lowStockThreshold;
                    case 'out':
                        return p.stock === 0;
                    default:
                        return true;
                }
            });
        }

        // Atualizar grid
        const grid = document.getElementById('productsConsultGrid');
        if (grid) {
            grid.innerHTML = renderProductsConsultCards(filtered);
        }

        // Atualizar contador
        if (resultsCount) {
            resultsCount.textContent = filtered.length;
        }
    };

    // Event listeners
    searchInput?.addEventListener('input', applyFilters);
    categoryFilter?.addEventListener('change', applyFilters);
    stockFilter?.addEventListener('change', applyFilters);

    clearButton?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (stockFilter) stockFilter.value = '';
        applyFilters();
    });
}

// === MODAL DE PRODUTOS ===
function initializeModalElements() {
    console.log("🔧 Inicializando elementos do modal de produto");
    
    const modalElement = document.getElementById('productModal');
    if (!modalElement) {
        console.warn("⚠️ Modal de produto não encontrado no DOM");
        return false;
    }

    // Mapear elementos
    EliteControl.elements = {
        productModal: modalElement,
        productForm: document.getElementById('productForm'),
        productModalTitle: document.getElementById('productModalTitle'),
        productIdField: document.getElementById('productId'),
        productNameField: document.getElementById('productName'),
        productCategoryField: document.getElementById('productCategory'),
        productPriceField: document.getElementById('productPrice'),
        productStockField: document.getElementById('productStock'),
        productLowStockAlertField: document.getElementById('productLowStockAlert'),
        closeProductModalButton: document.getElementById('closeProductModalButton'),
        cancelProductFormButton: document.getElementById('cancelProductFormButton'),
        saveProductButton: document.getElementById('saveProductButton')
    };

    // Verificar elementos obrigatórios
    const requiredElements = [
        'productForm', 'productModalTitle', 'productNameField',
        'productCategoryField', 'productPriceField', 'productStockField',
        'closeProductModalButton', 'saveProductButton'
    ];

    const missingElements = requiredElements.filter(
        elementName => !EliteControl.elements[elementName]
    );

    if (missingElements.length > 0) {
        console.error("❌ Elementos obrigatórios não encontrados:", missingElements);
        return false;
    }

    console.log("✅ Elementos do modal inicializados");
    return true;
}

function setupModalEventListeners() {
    if (EliteControl.state.modalEventListenersAttached) return;

    console.log("🔧 Configurando event listeners do modal");

    // Fechar modal
    if (EliteControl.elements.closeProductModalButton) {
        EliteControl.elements.closeProductModalButton.addEventListener('click', closeProductModal);
    }

    if (EliteControl.elements.cancelProductFormButton) {
        EliteControl.elements.cancelProductFormButton.addEventListener('click', closeProductModal);
    }

    // Submeter formulário
    if (EliteControl.elements.productForm) {
        EliteControl.elements.productForm.addEventListener('submit', handleProductFormSubmit);
    }

    // Fechar ao clicar fora
    if (EliteControl.elements.productModal) {
        EliteControl.elements.productModal.addEventListener('click', (e) => {
            if (e.target === EliteControl.elements.productModal && !EliteControl.state.isModalProcessing) {
                closeProductModal();
            }
        });
    }

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && 
            EliteControl.elements.productModal && 
            !EliteControl.elements.productModal.classList.contains('hidden') && 
            !EliteControl.state.isModalProcessing) {
            closeProductModal();
        }
    });

    EliteControl.state.modalEventListenersAttached = true;
}

function openProductModal(product = null) {
    console.log("📝 Abrindo modal de produto:", product ? 'Editar' : 'Novo');
    
    // Inicializar elementos se necessário
    if (!EliteControl.elements.productModal) {
        if (!initializeModalElements()) {
            showTemporaryAlert("Modal de produto não disponível nesta página.", "error");
            return;
        }
    }

    // Configurar event listeners se necessário
    if (!EliteControl.state.modalEventListenersAttached) {
        setupModalEventListeners();
    }

    if (EliteControl.state.isModalProcessing) {
        return;
    }

    // Resetar formulário
    if (EliteControl.elements.productForm) {
        EliteControl.elements.productForm.reset();
    }

    if (product) {
        // Modo edição
        if (EliteControl.elements.productModalTitle) {
            EliteControl.elements.productModalTitle.textContent = 'Editar Produto';
        }
        if (EliteControl.elements.productIdField) {
            EliteControl.elements.productIdField.value = product.id;
        }
        if (EliteControl.elements.productNameField) {
            EliteControl.elements.productNameField.value = product.name;
        }
        if (EliteControl.elements.productCategoryField) {
            EliteControl.elements.productCategoryField.value = product.category;
        }
        if (EliteControl.elements.productPriceField) {
            EliteControl.elements.productPriceField.value = product.price;
        }
        if (EliteControl.elements.productStockField) {
            EliteControl.elements.productStockField.value = product.stock;
        }
        if (EliteControl.elements.productLowStockAlertField) {
            EliteControl.elements.productLowStockAlertField.value = product.lowStockAlert || 10;
        }
    } else {
        // Modo criação
        if (EliteControl.elements.productModalTitle) {
            EliteControl.elements.productModalTitle.textContent = 'Adicionar Novo Produto';
        }
        if (EliteControl.elements.productIdField) {
            EliteControl.elements.productIdField.value = '';
        }
        if (EliteControl.elements.productLowStockAlertField) {
            EliteControl.elements.productLowStockAlertField.value = 10;
        }
    }

    // Mostrar modal
    if (EliteControl.elements.productModal) {
        EliteControl.elements.productModal.classList.remove('hidden');
        EliteControl.elements.productModal.classList.add('visible');
    }
    
    // Focar no primeiro campo
    if (EliteControl.elements.productNameField) {
        setTimeout(() => {
            EliteControl.elements.productNameField.focus();
        }, 100);
    }
}

function closeProductModal() {
    if (EliteControl.state.isModalProcessing) {
        return;
    }

    console.log("❌ Fechando modal de produto");

    try {
        // Resetar formulário
        if (EliteControl.elements.productForm) {
            EliteControl.elements.productForm.reset();
        }

        // Limpar campos
        if (EliteControl.elements.productIdField) {
            EliteControl.elements.productIdField.value = '';
        }

        // Restaurar botão
        if (EliteControl.elements.saveProductButton) {
            EliteControl.elements.saveProductButton.disabled = false;
            EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }

        // Esconder modal
        if (EliteControl.elements.productModal) {
            EliteControl.elements.productModal.classList.add('hidden');
            EliteControl.elements.productModal.classList.remove('visible');
        }

    } catch (error) {
        console.error("❌ Erro ao fechar modal:", error);
        if (EliteControl.elements.productModal) {
            EliteControl.elements.productModal.classList.add('hidden');
        }
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    if (EliteControl.state.isModalProcessing) {
        return;
    }

    console.log("💾 Salvando produto...");

    if (!validateProductForm()) {
        return;
    }

    EliteControl.state.isModalProcessing = true;

    const id = EliteControl.elements.productIdField?.value;
    const productData = {
        name: EliteControl.elements.productNameField.value.trim(),
        category: EliteControl.elements.productCategoryField.value.trim(),
        price: parseFloat(EliteControl.elements.productPriceField.value),
        stock: parseInt(EliteControl.elements.productStockField.value),
        lowStockAlert: parseInt(EliteControl.elements.productLowStockAlertField?.value || 10)
    };

    // Mostrar loading no botão
    if (EliteControl.elements.saveProductButton) {
        EliteControl.elements.saveProductButton.disabled = true;
        EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
    }

    try {
        if (id) {
            await DataService.updateProduct(id, productData);
            showTemporaryAlert('Produto atualizado com sucesso!', 'success');
        } else {
            await DataService.addProduct(productData);
            showTemporaryAlert('Produto adicionado com sucesso!', 'success');
        }

        closeProductModal();
        await reloadCurrentSectionIfProducts();

    } catch (error) {
        console.error("❌ Erro ao salvar produto:", error);
        showTemporaryAlert('Erro ao salvar produto. Tente novamente.', 'error');
    } finally {
        EliteControl.state.isModalProcessing = false;

        if (EliteControl.elements.saveProductButton) {
            EliteControl.elements.saveProductButton.disabled = false;
            EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }
    }
}

function validateProductForm() {
    const name = EliteControl.elements.productNameField?.value?.trim();
    const category = EliteControl.elements.productCategoryField?.value?.trim();
    const price = parseFloat(EliteControl.elements.productPriceField?.value);
    const stock = parseInt(EliteControl.elements.productStockField?.value);
    const lowStockAlert = parseInt(EliteControl.elements.productLowStockAlertField?.value);

    if (!name) {
        showTemporaryAlert("Nome do produto é obrigatório.", "warning");
        EliteControl.elements.productNameField?.focus();
        return false;
    }

    if (!category) {
        showTemporaryAlert("Categoria é obrigatória.", "warning");
        EliteControl.elements.productCategoryField?.focus();
        return false;
    }

    if (isNaN(price) || price < 0) {
        showTemporaryAlert("Preço deve ser um número válido e não negativo.", "warning");
        EliteControl.elements.productPriceField?.focus();
        return false;
    }

    if (isNaN(stock) || stock < 0) {
        showTemporaryAlert("Estoque deve ser um número válido e não negativo.", "warning");
        EliteControl.elements.productStockField?.focus();
        return false;
    }

    if (isNaN(lowStockAlert) || lowStockAlert < 1) {
        showTemporaryAlert("Alerta de estoque baixo deve ser um número válido maior que 0.", "warning");
        EliteControl.elements.productLowStockAlertField?.focus();
        return false;
    }

    return true;
}

// === HANDLERS DE PRODUTOS ===
async function handleEditProduct(productId) {
    console.log("✏️ Editando produto:", productId);

    try {
        showTemporaryAlert('Carregando produto...', 'info', 2000);
        
        const product = await DataService.getProductById(productId);
        
        if (product) {
            openProductModal(product);
        } else {
            showTemporaryAlert('Produto não encontrado.', 'error');
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produto:", error);
        showTemporaryAlert('Erro ao carregar dados do produto.', 'error');
    }
}

function handleDeleteProduct(productId, productName) {
    console.log("🗑️ Confirmando exclusão do produto:", productName);

    showCustomConfirm(
        `Tem certeza que deseja excluir o produto "${productName}"?\n\nEsta ação não pode ser desfeita.`,
        async () => {
            try {
                await DataService.deleteProduct(productId);
                showTemporaryAlert(`Produto "${productName}" excluído com sucesso.`, 'success');
                await reloadCurrentSectionIfProducts();
            } catch (error) {
                console.error("❌ Erro ao excluir produto:", error);
                showTemporaryAlert(`Erro ao excluir produto "${productName}".`, 'error');
            }
        }
    );
}

// === DASHBOARD ===
async function loadDashboardData(container) {
    console.log("📊 Carregando dados do dashboard");

    const currentUser = EliteControl.state.currentUser;
    
    // Mostrar template do dashboard
    container.innerHTML = getDashboardTemplate(currentUser.role);
    
    // Configurar event listeners dos gráficos
    setupChartEventListeners();

    try {
        // Carregar dados baseado no role
        let salesStats, productStats, topProducts, recentSales;

        if (currentUser.role === 'Vendedor') {
            salesStats = await DataService.getSalesStatsBySeller(currentUser.uid);
            topProducts = await DataService.getTopProductsBySeller(currentUser.uid, 5);
            recentSales = await DataService.getSalesBySeller(currentUser.uid);
            productStats = await DataService.getProductStats();
        } else {
            salesStats = await DataService.getSalesStats();
            topProducts = await DataService.getTopProducts(5);
            recentSales = await DataService.getSales();
            productStats = await DataService.getProductStats();
        }

        // Atualizar KPIs
        updateDashboardKPIs(salesStats, productStats, currentUser);
        
        // Renderizar gráficos
        renderDashboardCharts(salesStats, topProducts, productStats, currentUser.role);
        
        // Atualizar atividades recentes
        updateRecentActivities(recentSales.slice(0, 5));

    } catch (error) {
        console.error("❌ Erro ao carregar dados do dashboard:", error);
        showTemporaryAlert("Erro ao carregar dados do dashboard.", "error");
    }
}

function getDashboardTemplate(userRole) {
    return `
        <div class="dashboard-content">
            <!-- KPIs -->
            <div id="kpiContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                ${getKPICards(userRole)}
            </div>

            <!-- Gráficos -->
            <div id="chartsContainer" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
                ${getChartCards(userRole)}
            </div>

            <!-- Atividades Recentes -->
            <div class="activities-card">
                <div class="activities-header">
                    <h3 class="activities-title">
                        <i class="fas fa-clock mr-2"></i>
                        Atividades Recentes
                    </h3>
                </div>
                <ul id="recentActivitiesContainer" class="activities-list">
                    <!-- Será preenchido dinamicamente -->
                </ul>
            </div>
        </div>
    `;
}

function getKPICards(userRole) {
    return `
        <div class="kpi-card">
            <div class="kpi-icon-wrapper">
                <i class="fas fa-dollar-sign kpi-icon"></i>
            </div>
            <div class="kpi-content">
                <div class="kpi-title">Receita ${userRole === 'Vendedor' ? 'Minhas Vendas' : 'Total'}</div>
                <div class="kpi-value" id="kpiRevenue">R$ 0,00</div>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon-wrapper">
                <i class="fas fa-shopping-cart kpi-icon"></i>
            </div>
            <div class="kpi-content">
                <div class="kpi-title">${userRole === 'Vendedor' ? 'Minhas Vendas' : 'Total de Vendas'}</div>
                <div class="kpi-value" id="kpiSales">0</div>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon-wrapper">
                <i class="fas fa-box kpi-icon"></i>
            </div>
            <div class="kpi-content">
                <div class="kpi-title">Produtos</div>
                <div class="kpi-value" id="kpiProducts">0</div>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon-wrapper">
                <i class="fas fa-plus kpi-icon"></i>
            </div>
            <div class="kpi-content">
                <div class="kpi-title">Ação Rápida</div>
                <div class="kpi-value">
                    ${getQuickActionButton(userRole)}
                </div>
            </div>
        </div>
    `;
}

function getQuickActionButton(userRole) {
    switch (userRole) {
        case 'Vendedor':
            return `<button class="btn-primary btn-sm" onclick="window.location.hash='#registrar-venda'">Nova Venda</button>`;
        case 'Controlador de Estoque':
            return `<button class="btn-primary btn-sm" onclick="openProductModal()">Novo Produto</button>`;
        case 'Dono/Gerente':
            return `<button class="btn-primary btn-sm" onclick="window.location.hash='#vendas'">Ver Relatórios</button>`;
        default:
            return `<button class="btn-secondary btn-sm" disabled>N/A</button>`;
    }
}

function getChartCards(userRole) {
    if (userRole === 'Vendedor') {
        return `
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Minhas Vendas - Performance</h3>
                </div>
                <div class="chart-content">
                    <canvas id="vendorSalesChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Meus Produtos Mais Vendidos</h3>
                </div>
                <div class="chart-content">
                    <canvas id="vendorProductsChart"></canvas>
                </div>
            </div>
        `;
    } else if (userRole === 'Controlador de Estoque') {
        return `
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Produtos por Categoria</h3>
                </div>
                <div class="chart-content">
                    <canvas id="categoriesChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Status do Estoque</h3>
                </div>
                <div class="chart-content">
                    <canvas id="stockChart"></canvas>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Vendas por Período</h3>
                </div>
                <div class="chart-content">
                    <canvas id="salesChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Produtos Mais Vendidos</h3>
                </div>
                <div class="chart-content">
                    <canvas id="topProductsChart"></canvas>
                </div>
            </div>
        `;
    }
}

function setupChartEventListeners() {
    // Event listeners para ações dos gráficos serão adicionados aqui se necessário
}

function updateDashboardKPIs(salesStats, productStats, currentUser) {
    console.log("📊 Atualizando KPIs");

    // Receita
    const revenueEl = document.getElementById('kpiRevenue');
    if (revenueEl) {
        revenueEl.textContent = formatCurrency(salesStats?.monthRevenue || 0);
    }

    // Vendas
    const salesEl = document.getElementById('kpiSales');
    if (salesEl) {
        salesEl.textContent = salesStats?.monthSales || 0;
    }

    // Produtos
    const productsEl = document.getElementById('kpiProducts');
    if (productsEl) {
        if (currentUser.role === 'Controlador de Estoque' || currentUser.role === 'Dono/Gerente') {
            productsEl.textContent = productStats?.totalProducts || 0;
        } else {
            productsEl.textContent = productStats?.totalProducts || 0;
        }
    }
}

function renderDashboardCharts(salesStats, topProducts, productStats, userRole) {
    if (typeof Chart === 'undefined') {
        console.warn("⚠️ Chart.js não disponível");
        return;
    }

    console.log("📈 Renderizando gráficos do dashboard");

    if (userRole === 'Vendedor') {
        renderVendorCharts(salesStats, topProducts);
    } else if (userRole === 'Controlador de Estoque') {
        renderStockCharts(productStats);
    } else {
        renderManagerCharts(salesStats, topProducts);
    }
}

function renderVendorCharts(salesStats, topProducts) {
    // Gráfico de vendas do vendedor
    const salesCtx = document.getElementById('vendorSalesChart');
    if (salesCtx) {
        if (EliteControl.state.charts.vendorSales) {
            EliteControl.state.charts.vendorSales.destroy();
        }

        EliteControl.state.charts.vendorSales = new Chart(salesCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Hoje', 'Esta Semana', 'Este Mês'],
                datasets: [{
                    label: 'Receita (R$)',
                    data: [
                        salesStats?.todayRevenue || 0,
                        salesStats?.weekRevenue || 0,
                        salesStats?.monthRevenue || 0
                    ],
                    backgroundColor: ['#38BDF8', '#6366F1', '#10B981'],
                    borderColor: ['#0284C7', '#4F46E5', '#059669'],
                    borderWidth: 1
                }]
            },
            options: getChartOptions('Receita por Período')
        });
    }

    // Gráfico de produtos do vendedor
    const productsCtx = document.getElementById('vendorProductsChart');
    if (productsCtx && topProducts && topProducts.length > 0) {
        if (EliteControl.state.charts.vendorProducts) {
            EliteControl.state.charts.vendorProducts.destroy();
        }

        EliteControl.state.charts.vendorProducts = new Chart(productsCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    data: topProducts.map(p => p.count),
                    backgroundColor: ['#38BDF8', '#6366F1', '#10B981', '#F59E0B', '#EF4444']
                }]
            },
            options: getChartOptions('Produtos Mais Vendidos')
        });
    }
}

function renderStockCharts(productStats) {
    // Gráfico de categorias
    const categoriesCtx = document.getElementById('categoriesChart');
    if (categoriesCtx && productStats?.categories) {
        if (EliteControl.state.charts.categories) {
            EliteControl.state.charts.categories.destroy();
        }

        const categories = Object.keys(productStats.categories);
        const categoryData = Object.values(productStats.categories);

        EliteControl.state.charts.categories = new Chart(categoriesCtx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: categoryData,
                    backgroundColor: ['#38BDF8', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                }]
            },
            options: getChartOptions('Produtos por Categoria')
        });
    }

    // Gráfico de status do estoque
    const stockCtx = document.getElementById('stockChart');
    if (stockCtx && productStats) {
        if (EliteControl.state.charts.stock) {
            EliteControl.state.charts.stock.destroy();
        }

        const availableStock = (productStats.totalProducts || 0) - (productStats.lowStock || 0) - (productStats.outOfStock || 0);

        EliteControl.state.charts.stock = new Chart(stockCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Em Estoque', 'Estoque Baixo', 'Sem Estoque'],
                datasets: [{
                    data: [availableStock, productStats.lowStock || 0, productStats.outOfStock || 0],
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
                }]
            },
            options: getChartOptions('Status do Estoque')
        });
    }
}

function renderManagerCharts(salesStats, topProducts) {
    // Gráfico de vendas gerais
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        if (EliteControl.state.charts.sales) {
            EliteControl.state.charts.sales.destroy();
        }

        EliteControl.state.charts.sales = new Chart(salesCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Hoje', 'Esta Semana', 'Este Mês'],
                datasets: [{
                    label: 'Receita (R$)',
                    data: [
                        salesStats?.todayRevenue || 0,
                        salesStats?.weekRevenue || 0,
                        salesStats?.monthRevenue || 0
                    ],
                    borderColor: '#38BDF8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: getChartOptions('Receita por Período')
        });
    }

    // Gráfico de produtos mais vendidos
    const productsCtx = document.getElementById('topProductsChart');
    if (productsCtx && topProducts && topProducts.length > 0) {
        if (EliteControl.state.charts.topProducts) {
            EliteControl.state.charts.topProducts.destroy();
        }

        EliteControl.state.charts.topProducts = new Chart(productsCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: topProducts.map(p => p.count),
                    backgroundColor: '#38BDF8',
                    borderColor: '#0284C7',
                    borderWidth: 1
                }]
            },
            options: getChartOptions('Produtos Mais Vendidos')
        });
    }
}

function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#F1F5F9',
                    padding: 20,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#F1F5F9',
                bodyColor: '#F1F5F9',
                borderColor: '#38BDF8',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)'
                },
                ticks: {
                    color: '#94A3B8'
                }
            },
            x: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)'
                },
                ticks: {
                    color: '#94A3B8'
                }
            }
        }
    };
}

function updateRecentActivities(activities) {
    const container = document.getElementById('recentActivitiesContainer');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <li class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text text-slate-400">Nenhuma atividade recente</div>
                </div>
            </li>
        `;
        return;
    }

    container.innerHTML = activities.map(activity => {
        const productNames = activity.productsDetail && Array.isArray(activity.productsDetail)
            ? activity.productsDetail.map(p => p.name).slice(0, 2).join(', ')
            : 'Produto';

        return `
            <li class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        Venda: ${productNames} - ${formatCurrency(activity.total)}
                    </div>
                    <div class="activity-time">
                        ${formatDateTime(activity.date)} 
                        ${activity.sellerName ? 'por ' + activity.sellerName : ''}
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

// === SISTEMA DE VENDAS ===
function renderRegisterSaleForm(container) {
    container.innerHTML = `
        <div class="register-sale-container">
            <div class="page-header mb-6">
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">Registrar Nova Venda</h2>
                        <p class="text-slate-400 mt-1">Selecione cliente, produtos e quantidades</p>
                    </div>
                    <div class="sale-info text-right">
                        <div class="text-sm text-slate-400">
                            Vendedor: ${EliteControl.state.currentUser.name || EliteControl.state.currentUser.email}
                        </div>
                        <div class="text-sm text-slate-400" id="currentDateTime"></div>
                    </div>
                </div>
            </div>

            <!-- Seleção de Cliente -->
            <div class="customer-selection-section mb-6">
                <div class="bg-slate-800 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-slate-100 mb-4">
                        <i class="fas fa-user mr-2"></i>
                        Seleção de Cliente
                    </h3>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mb-4">
                        <div class="customer-search-container flex-1 relative">
                            <input type="text"
                                   id="customerSearchInput"
                                   class="form-input w-full pl-10"
                                   placeholder="Digite o nome do cliente...">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                            <div id="customerSuggestions" class="customer-suggestions hidden"></div>
                        </div>
                        <button id="newCustomerButton" class="btn-primary whitespace-nowrap">
                            <i class="fas fa-user-plus mr-2"></i>
                            Novo Cliente
                        </button>
                    </div>

                    <div id="selectedCustomerInfo" class="selected-customer-info hidden">
                        <div class="customer-card">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 id="selectedCustomerName" class="text-lg font-semibold text-slate-100"></h4>
                                    <p id="selectedCustomerPhone" class="text-sm text-slate-400 mt-1"></p>
                                    <p id="selectedCustomerStats" class="text-xs text-slate-500 mt-1"></p>
                                </div>
                                <button id="removeCustomerButton" class="text-slate-400 hover:text-red-400">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Produtos Disponíveis -->
            <div class="products-section mb-6">
                <div class="bg-slate-800 rounded-lg p-4">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h3 class="text-lg font-semibold text-slate-100">
                            <i class="fas fa-shopping-cart mr-2"></i>
                            Produtos Disponíveis
                        </h3>
                        <div class="relative">
                            <input type="text" 
                                   id="productSearchInput" 
                                   class="form-input w-full sm:w-64 pl-10"
                                   placeholder="Buscar produtos...">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                    </div>

                    <div id="availableProductsList" class="products-grid">
                        <!-- Será preenchido dinamicamente -->
                    </div>
                </div>
            </div>

            <!-- Carrinho de Compras -->
            <div class="cart-section">
                <div class="bg-slate-800 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-slate-100">
                            <i class="fas fa-shopping-basket mr-2"></i>
                            Carrinho de Compras
                        </h3>
                        <button id="clearCartButton" class="btn-secondary btn-sm hidden">
                            <i class="fas fa-trash-alt mr-2"></i>
                            Limpar
                        </button>
                    </div>
                    
                    <div id="cartItemsList" class="cart-items min-h-[150px] mb-4">
                        <div class="empty-cart text-center py-8">
                            <i class="fas fa-shopping-cart fa-2x mb-2 text-slate-400"></i>
                            <p class="text-slate-400">Carrinho vazio</p>
                            <p class="text-sm text-slate-500">Adicione produtos acima</p>
                        </div>
                    </div>

                    <div id="cartSummary" class="cart-summary border-t border-slate-700 pt-4 hidden">
                        <div class="flex justify-between items-center py-2">
                            <span class="text-slate-400">Subtotal:</span>
                            <span id="cartSubtotal" class="text-lg font-semibold text-slate-100">R$ 0,00</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-xl font-bold text-slate-100">Total:</span>
                            <span id="cartTotal" class="text-xl font-bold text-sky-400">R$ 0,00</span>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-center mt-6">
                        <button id="cancelSaleButton" class="btn-secondary w-full sm:w-auto">
                            <i class="fas fa-times mr-2"></i>
                            Cancelar
                        </button>
                        <button id="finalizeSaleButton" class="btn-primary w-full sm:w-auto" disabled>
                            <i class="fas fa-check mr-2"></i>
                            Finalizar Venda
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicializar carrinho vazio
    EliteControl.state.saleCart = [];
    EliteControl.state.selectedCustomer = null;
}

function setupSaleFormEventListeners() {
    console.log("🔧 Configurando eventos do formulário de venda");

    // Busca de produtos
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredProducts = EliteControl.state.availableProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            );
            renderAvailableProducts(filteredProducts);
        });
    }

    // Busca de clientes
    const customerSearchInput = document.getElementById('customerSearchInput');
    if (customerSearchInput) {
        let searchTimeout;
        customerSearchInput.addEventListener('input', async (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            
            if (!searchTerm) {
                hideSuggestions();
                return;
            }

            searchTimeout = setTimeout(async () => {
                if (typeof CRMService !== 'undefined') {
                    try {
                        const suggestions = await CRMService.searchCustomers(searchTerm);
                        renderCustomerSuggestions(suggestions);
                    } catch (error) {
                        console.error("Erro na busca de clientes:", error);
                    }
                }
            }, 300);
        });
    }

    // Novo cliente
    const newCustomerButton = document.getElementById('newCustomerButton');
    if (newCustomerButton) {
        newCustomerButton.addEventListener('click', showNewCustomerModal);
    }

    // Remover cliente
    const removeCustomerButton = document.getElementById('removeCustomerButton');
    if (removeCustomerButton) {
        removeCustomerButton.addEventListener('click', () => {
            EliteControl.state.selectedCustomer = null;
            document.getElementById('selectedCustomerInfo').classList.add('hidden');
            document.getElementById('customerSearchInput').value = '';
            updateFinalizeSaleButton();
        });
    }

    // Limpar carrinho
    const clearCartButton = document.getElementById('clearCartButton');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', () => {
            showCustomConfirm('Deseja limpar o carrinho?', clearCart);
        });
    }

    // Cancelar venda
    const cancelSaleButton = document.getElementById('cancelSaleButton');
    if (cancelSaleButton) {
        cancelSaleButton.addEventListener('click', () => {
            showCustomConfirm('Deseja cancelar esta venda?', () => {
                clearCart();
                EliteControl.state.selectedCustomer = null;
                document.getElementById('selectedCustomerInfo').classList.add('hidden');
                document.getElementById('customerSearchInput').value = '';
                showTemporaryAlert('Venda cancelada', 'info');
            });
        });
    }

    // Finalizar venda
    const finalizeSaleButton = document.getElementById('finalizeSaleButton');
    if (finalizeSaleButton) {
        finalizeSaleButton.addEventListener('click', finalizeSale);
    }

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        const suggestionsContainer = document.getElementById('customerSuggestions');
        const searchInput = document.getElementById('customerSearchInput');
        
        if (suggestionsContainer && 
            !searchInput?.contains(e.target) && 
            !suggestionsContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function renderAvailableProducts(products) {
    const container = document.getElementById('availableProductsList');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-slate-400">
                <i class="fas fa-box-open fa-2x mb-2"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }

    container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    container.innerHTML = products.map(product => {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock <= (product.lowStockAlert || 10) && product.stock > 0;
        
        return `
            <div class="product-sale-card ${isOutOfStock ? 'out-of-stock' : ''}">
                <div class="product-header">
                    <h4 class="product-name">${product.name}</h4>
                    <span class="product-price">${formatCurrency(product.price)}</span>
                </div>
                
                <div class="product-info">
                    <div class="text-sm text-slate-400 mb-2">${product.category}</div>
                    <div class="stock-info">
                        <span class="stock-count ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400'}">
                            ${product.stock} em estoque
                        </span>
                    </div>
                </div>

                ${!isOutOfStock ? `
                    <div class="product-actions">
                        <div class="quantity-controls">
                            <button onclick="changeQuantity('${product.id}', -1)" class="quantity-btn">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   id="quantity-${product.id}"
                                   value="1"
                                   min="1"
                                   max="${product.stock}"
                                   class="quantity-input">
                            <button onclick="changeQuantity('${product.id}', 1)" class="quantity-btn">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button onclick="addToCart('${product.id}')" class="add-to-cart-btn">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                ` : `
                    <div class="product-actions">
                        <button class="btn-secondary btn-sm w-full" disabled>
                            <i class="fas fa-times mr-2"></i>
                            Sem Estoque
                        </button>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

function renderCustomerSuggestions(suggestions) {
    const container = document.getElementById('customerSuggestions');
    if (!container) return;

    if (!suggestions || suggestions.length === 0) {
        container.innerHTML = `
            <div class="customer-suggestion-item text-center">
                <div class="text-slate-400">Nenhum cliente encontrado</div>
                <button class="btn-secondary btn-sm mt-2" onclick="showNewCustomerModal()">
                    <i class="fas fa-user-plus mr-2"></i>
                    Cadastrar Novo
                </button>
            </div>
        `;
    } else {
        container.innerHTML = suggestions.map(customer => `
            <div class="customer-suggestion-item" onclick="selectCustomer('${customer.id}')">
                <div class="customer-suggestion-name">${customer.name}</div>
                <div class="customer-suggestion-info">
                    ${customer.phone ? `<span><i class="fas fa-phone mr-1"></i>${customer.phone}</span>` : ''}
                    ${customer.email ? `<span><i class="fas fa-envelope mr-1"></i>${customer.email}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    container.classList.remove('hidden');
}

function hideSuggestions() {
    const container = document.getElementById('customerSuggestions');
    if (container) {
        container.classList.add('hidden');
    }
}

// === FUNÇÕES GLOBAIS DE VENDA ===
window.changeQuantity = function(productId, delta) {
    const input = document.getElementById(`quantity-${productId}`);
    if (!input) return;

    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, currentValue + delta);
    
    const product = EliteControl.state.availableProducts.find(p => p.id === productId);
    if (product && newValue <= product.stock) {
        input.value = newValue;
    }
};

window.addToCart = function(productId) {
    const product = EliteControl.state.availableProducts.find(p => p.id === productId);
    if (!product) return;

    const quantityInput = document.getElementById(`quantity-${productId}`);
    const quantity = parseInt(quantityInput?.value) || 1;

    if (quantity > product.stock) {
        showTemporaryAlert(`Quantidade disponível: ${product.stock}`, 'warning');
        return;
    }

    // Verificar se produto já está no carrinho
    const existingItem = EliteControl.state.saleCart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        EliteControl.state.saleCart.push({
            productId: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            quantity: quantity,
            stock: product.stock
        });
    }

    updateCartDisplay();
    showTemporaryAlert('Produto adicionado ao carrinho', 'success', 2000);
    
    // Resetar quantidade
    if (quantityInput) quantityInput.value = 1;
};

window.removeFromCart = function(productId) {
    EliteControl.state.saleCart = EliteControl.state.saleCart.filter(item => item.productId !== productId);
    updateCartDisplay();
    showTemporaryAlert('Item removido do carrinho', 'info', 2000);
};

window.updateCartQuantity = function(productId, quantity) {
    const item = EliteControl.state.saleCart.find(item => item.productId === productId);
    if (item) {
        const newQuantity = parseInt(quantity) || 1;
        if (newQuantity <= item.stock) {
            item.quantity = newQuantity;
            updateCartDisplay();
        } else {
            showTemporaryAlert(`Quantidade máxima: ${item.stock}`, 'warning');
        }
    }
};

window.selectCustomer = async function(customerId) {
    try {
        const customer = await CRMService.getCustomerById(customerId);
        if (!customer) {
            showTemporaryAlert('Cliente não encontrado', 'error');
            return;
        }

        EliteControl.state.selectedCustomer = customer;

        // Atualizar interface
        const selectedInfo = document.getElementById('selectedCustomerInfo');
        const customerName = document.getElementById('selectedCustomerName');
        const customerPhone = document.getElementById('selectedCustomerPhone');
        const customerStats = document.getElementById('selectedCustomerStats');

        if (customerName) customerName.textContent = customer.name;
        if (customerPhone) customerPhone.textContent = customer.phone || 'Sem telefone';
        
        if (customerStats) {
            const stats = [];
            if (customer.totalPurchases) {
                stats.push(`${customer.totalPurchases} compras`);
            }
            if (customer.totalSpent) {
                stats.push(`Total: ${formatCurrency(customer.totalSpent)}`);
            }
            customerStats.textContent = stats.join(' • ') || 'Primeiro atendimento';
        }

        if (selectedInfo) selectedInfo.classList.remove('hidden');

        // Limpar busca
        const searchInput = document.getElementById('customerSearchInput');
        if (searchInput) searchInput.value = customer.name;
        hideSuggestions();
        
        updateFinalizeSaleButton();

    } catch (error) {
        console.error('Erro ao selecionar cliente:', error);
        showTemporaryAlert('Erro ao selecionar cliente', 'error');
    }
};

function updateCartDisplay() {
    const cartContainer = document.getElementById('cartItemsList');
    const summaryContainer = document.getElementById('cartSummary');
    const clearButton = document.getElementById('clearCartButton');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');

    if (!cartContainer) return;

    if (EliteControl.state.saleCart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart text-center py-8">
                <i class="fas fa-shopping-cart fa-2x mb-2 text-slate-400"></i>
                <p class="text-slate-400">Carrinho vazio</p>
                <p class="text-sm text-slate-500">Adicione produtos acima</p>
            </div>
        `;
        
        if (summaryContainer) summaryContainer.classList.add('hidden');
        if (clearButton) clearButton.classList.add('hidden');
        
    } else {
        const total = EliteControl.state.saleCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartContainer.innerHTML = EliteControl.state.saleCart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <div class="cart-item-details">
                        ${formatCurrency(item.price)} × ${item.quantity} = ${formatCurrency(item.price * item.quantity)}
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls-small">
                        <button onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})" class="quantity-btn-small">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" 
                               value="${item.quantity}" 
                               min="1" 
                               max="${item.stock}"
                               onchange="updateCartQuantity('${item.productId}', this.value)"
                               class="quantity-input-small">
                        <button onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})" class="quantity-btn-small">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button onclick="removeFromCart('${item.productId}')" class="remove-item-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        if (summaryContainer) summaryContainer.classList.remove('hidden');
        if (clearButton) clearButton.classList.remove('hidden');
        if (subtotalEl) subtotalEl.textContent = formatCurrency(total);
        if (totalEl) totalEl.textContent = formatCurrency(total);
    }

    updateFinalizeSaleButton();
}

function clearCart() {
    EliteControl.state.saleCart = [];
    updateCartDisplay();
    showTemporaryAlert('Carrinho limpo', 'info', 2000);
}

function updateCurrentTime() {
    const element = document.getElementById('currentDateTime');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    }
}

function updateFinalizeSaleButton() {
    const button = document.getElementById('finalizeSaleButton');
    if (!button) return;

    const hasCustomer = EliteControl.state.selectedCustomer !== null;
    const hasItems = EliteControl.state.saleCart.length > 0;

    button.disabled = !hasCustomer || !hasItems;
    
    if (!hasCustomer) {
        button.title = 'Selecione um cliente primeiro';
    } else if (!hasItems) {
        button.title = 'Adicione produtos ao carrinho';
    } else {
        button.title = 'Finalizar venda';
    }
}

async function finalizeSale() {
    if (EliteControl.state.saleCart.length === 0) {
        showTemporaryAlert('Adicione produtos ao carrinho', 'warning');
        return;
    }

    if (!EliteControl.state.selectedCustomer) {
        showTemporaryAlert('Selecione um cliente', 'warning');
        return;
    }

    const finalizeButton = document.getElementById('finalizeSaleButton');
    if (!finalizeButton) return;

    const originalText = finalizeButton.innerHTML;
    finalizeButton.disabled = true;
    finalizeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';

    try {
        // Validar estoque
        for (const item of EliteControl.state.saleCart) {
            const currentProduct = await DataService.getProductById(item.productId);
            if (!currentProduct) {
                throw new Error(`Produto ${item.name} não encontrado`);
            }
            if (currentProduct.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para ${item.name}. Disponível: ${currentProduct.stock}`);
            }
        }

        // Preparar dados da venda
        const saleData = {
            date: new Date(),
            dateString: new Date().toISOString().split('T')[0]
        };

        const productsDetail = EliteControl.state.saleCart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price
        }));

        const sellerName = EliteControl.state.currentUser.name || EliteControl.state.currentUser.email;

        // Registrar venda
        const newSale = await DataService.addSale(saleData, productsDetail, sellerName, EliteControl.state.selectedCustomer);

        // Limpar interface
        EliteControl.state.saleCart = [];
        EliteControl.state.selectedCustomer = null;
        updateCartDisplay();

        const searchInput = document.getElementById('customerSearchInput');
        const selectedInfo = document.getElementById('selectedCustomerInfo');
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.classList.add('hidden');

        // Recarregar produtos
        const products = await DataService.getProducts();
        EliteControl.state.availableProducts = products;
        renderAvailableProducts(products);

        // Mostrar sucesso
        showSaleSuccessModal(newSale);

    } catch (error) {
        console.error("❌ Erro ao finalizar venda:", error);
        showTemporaryAlert(`Erro: ${error.message}`, 'error');
    } finally {
        finalizeButton.disabled = false;
        finalizeButton.innerHTML = originalText;
    }
}

function showSaleSuccessModal(sale) {
    const total = EliteControl.state.saleCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    showCustomModal('Venda Realizada com Sucesso!', `
        <div class="text-center mb-6">
            <i class="fas fa-check-circle text-green-400 text-5xl mb-4"></i>
            <h3 class="text-xl font-semibold text-slate-100 mb-2">Venda Finalizada!</h3>
            <p class="text-slate-400">Venda registrada para ${sale.customerName}</p>
        </div>
        
        <div class="bg-slate-800 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-center mb-2">
                <span class="text-slate-400">Total da venda:</span>
                <span class="text-xl font-bold text-green-400">${formatCurrency(total)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Itens vendidos:</span>
                <span class="text-slate-100">${EliteControl.state.saleCart.length} itens</span>
            </div>
        </div>
        
        <div class="flex justify-end gap-4">
            <button onclick="closeCustomModal()" class="btn-secondary">
                Fechar
            </button>
            <button onclick="closeCustomModal(); window.location.hash='#vendas'" class="btn-primary">
                <i class="fas fa-list mr-2"></i>
                Ver Vendas
            </button>
        </div>
    `);
}

function showNewCustomerModal() {
    showCustomModal('Novo Cliente', `
        <form id="newCustomerForm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label class="form-label">Nome *</label>
                    <input type="text" id="customerName" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Telefone *</label>
                    <input type="tel" id="customerPhone" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="customerEmail" class="form-input">
                </div>
                
                <div class="form-group">
                    <label class="form-label">CPF</label>
                    <input type="text" id="customerCPF" class="form-input">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Endereço</label>
                <textarea id="customerAddress" class="form-input" rows="2"></textarea>
            </div>
        </form>
        
        <div class="flex justify-end gap-4 mt-6">
            <button onclick="closeCustomModal()" class="btn-secondary">
                Cancelar
            </button>
            <button onclick="saveNewCustomer()" class="btn-primary">
                <i class="fas fa-save mr-2"></i>
                Salvar Cliente
            </button>
        </div>
    `);
}

window.saveNewCustomer = async function() {
    const form = document.getElementById('newCustomerForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const customerData = {
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.replace(/\D/g, ''),
        email: document.getElementById('customerEmail').value.trim(),
        cpf: document.getElementById('customerCPF').value.replace(/\D/g, ''),
        address: document.getElementById('customerAddress').value.trim()
    };

    try {
        if (typeof CRMService !== 'undefined') {
            const newCustomer = await CRMService.createOrUpdateCustomer(customerData);
            await selectCustomer(newCustomer.id);
            closeCustomModal();
            showTemporaryAlert('Cliente cadastrado com sucesso!', 'success');
        } else {
            showTemporaryAlert('Serviço de clientes não disponível', 'error');
        }
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        showTemporaryAlert('Erro ao cadastrar cliente', 'error');
    }
};

// === RENDERIZAÇÃO DE VENDAS ===
function renderSalesList(sales, container, isPersonal = false) {
    console.log(`💰 Renderizando ${isPersonal ? 'minhas vendas' : 'todas as vendas'}`);

    container.innerHTML = `
        <div class="sales-container">
            <div class="page-header mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">${isPersonal ? 'Minhas Vendas' : 'Histórico de Vendas'}</h2>
                        <p class="text-slate-400 mt-1">Visualize e gerencie as vendas realizadas</p>
                    </div>
                    <button onclick="window.location.hash='#registrar-venda'" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>
                        Nova Venda
                    </button>
                </div>
            </div>

            <div class="filters-section mb-6">
                <div class="bg-slate-800 rounded-lg p-4">
                    <div class="flex flex-col lg:flex-row gap-4">
                        <div class="flex-1">
                            <div class="relative">
                                <input type="text" 
                                       id="salesSearchField"
                                       class="form-input pl-10 w-full"
                                       placeholder="Buscar por cliente...">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <input type="date" id="dateFromFilter" class="form-input">
                            <input type="date" id="dateToFilter" class="form-input">
                            <select id="sellerFilter" class="form-select ${isPersonal ? 'hidden' : ''}">
                                <option value="">Todos os vendedores</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <div class="text-sm text-slate-400">
                            <span id="salesCount">${sales.length}</span> vendas encontradas
                            <span id="salesTotal" class="ml-4 font-semibold">Total: ${formatCurrency(sales.reduce((sum, sale) => sum + (sale.total || 0), 0))}</span>
                        </div>
                        <button id="clearSalesFiltersButton" class="btn-secondary btn-sm">
                            <i class="fas fa-times mr-1"></i>
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <div id="salesTableContainer">
                ${renderSalesTable(sales, isPersonal)}
            </div>
        </div>
    `;

    // Configurar filtros
    setupSalesFilters(sales, isPersonal);
}

function renderSalesTable(sales, isPersonal) {
    if (!sales || sales.length === 0) {
        return `
            <div class="bg-slate-800 rounded-lg p-8 text-center">
                <i class="fas fa-receipt fa-3x mb-4 text-slate-400"></i>
                <p class="text-slate-400 text-lg">Nenhuma venda encontrada</p>
                ${isPersonal ? '<p class="text-sm text-slate-500 mt-2">Registre sua primeira venda!</p>' : ''}
            </div>
        `;
    }

    return `
        <div class="bg-slate-800 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-700">
                    <thead class="bg-slate-700">
                        <tr>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Data
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                                Produtos
                            </th>
                            <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Total
                            </th>
                            ${!isPersonal ? `
                                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                                    Vendedor
                                </th>
                            ` : ''}
                            <th class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700">
                        ${sales.map(sale => renderSaleRow(sale, isPersonal)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSaleRow(sale, isPersonal) {
    const productNames = sale.productsDetail && Array.isArray(sale.productsDetail)
        ? sale.productsDetail.map(p => `${p.name} (${p.quantity}x)`).join(', ')
        : 'N/A';

    return `
        <tr class="hover:bg-slate-750 transition-colors duration-150">
            <td class="px-4 sm:px-6 py-4 text-sm text-slate-300">
                ${formatDate(sale.date)}
            </td>
            <td class="px-4 sm:px-6 py-4">
                <div class="text-sm font-medium text-slate-200">
                    ${sale.customerName || 'Cliente não identificado'}
                </div>
                <div class="text-xs text-slate-400 lg:hidden">
                    ${truncateText(productNames, 30)}
                </div>
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden lg:table-cell">
                <div title="${productNames}">
                    ${truncateText(productNames, 50)}
                </div>
            </td>
            <td class="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-300">
                ${formatCurrency(sale.total)}
            </td>
            ${!isPersonal ? `
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden sm:table-cell">
                    ${sale.sellerName || 'N/A'}
                </td>
            ` : ''}
            <td class="px-4 sm:px-6 py-4 text-right">
                <button onclick="viewSaleDetails('${sale.id}')" 
                        class="text-sky-400 hover:text-sky-300 transition-colors"
                        title="Ver detalhes">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

function setupSalesFilters(allSales, isPersonal) {
    const searchField = document.getElementById('salesSearchField');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const sellerFilter = document.getElementById('sellerFilter');
    const clearButton = document.getElementById('clearSalesFiltersButton');

    // Preencher filtro de vendedores
    if (sellerFilter && !isPersonal) {
        const sellers = [...new Set(allSales.map(s => s.sellerName).filter(Boolean))];
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller;
            option.textContent = seller;
            sellerFilter.appendChild(option);
        });
    }

    const applyFilters = () => {
        const searchTerm = searchField?.value?.toLowerCase() || '';
        const dateFrom = dateFromFilter?.value;
        const dateTo = dateToFilter?.value;
        const seller = sellerFilter?.value;

        let filtered = allSales;

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(sale =>
                (sale.customerName || '').toLowerCase().includes(searchTerm)
            );
        }

        // Filtro de data
        if (dateFrom || dateTo) {
            filtered = filtered.filter(sale => {
                const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                const saleDateStr = saleDate.toISOString().split('T')[0];
                
                if (dateFrom && saleDateStr < dateFrom) return false;
                if (dateTo && saleDateStr > dateTo) return false;
                return true;
            });
        }

        // Filtro de vendedor
        if (seller && !isPersonal) {
            filtered = filtered.filter(sale => sale.sellerName === seller);
        }

        // Atualizar tabela
        const tableContainer = document.getElementById('salesTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = renderSalesTable(filtered, isPersonal);
        }

        // Atualizar contadores
        const salesCount = document.getElementById('salesCount');
        const salesTotal = document.getElementById('salesTotal');
        if (salesCount) salesCount.textContent = filtered.length;
        if (salesTotal) {
            const total = filtered.reduce((sum, sale) => sum + (sale.total || 0), 0);
            salesTotal.textContent = `Total: ${formatCurrency(total)}`;
        }
    };

    // Event listeners
    searchField?.addEventListener('input', applyFilters);
    dateFromFilter?.addEventListener('change', applyFilters);
    dateToFilter?.addEventListener('change', applyFilters);
    sellerFilter?.addEventListener('change', applyFilters);

    clearButton?.addEventListener('click', () => {
        if (searchField) searchField.value = '';
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';
        if (sellerFilter) sellerFilter.value = '';
        applyFilters();
    });
}

window.viewSaleDetails = function(saleId) {
    showTemporaryAlert('Detalhes da venda em desenvolvimento', 'info');
};

// === SEÇÕES ADICIONAIS ===

// Clientes
async function renderCustomersSection(container) {
    console.log("👥 Renderizando seção de clientes");

    try {
        let customers = [];
        let insights = {};

        if (typeof CRMService !== 'undefined') {
            customers = await CRMService.getCustomers();
            insights = await CRMService.getCustomerInsights();
        }

        container.innerHTML = `
            <div class="customers-container">
                <div class="page-header mb-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-slate-100">Gerenciamento de Clientes</h2>
                            <p class="text-slate-400 mt-1">Sistema CRM integrado</p>
                        </div>
                        <button onclick="showCustomerModal()" class="btn-primary">
                            <i class="fas fa-user-plus mr-2"></i>
                            Novo Cliente
                        </button>
                    </div>
                </div>

                <div class="customers-kpis grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-users kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Total de Clientes</div>
                            <div class="kpi-value">${insights.totalCustomers || 0}</div>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-star kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Clientes VIP</div>
                            <div class="kpi-value">${insights.segmentation?.vip || 0}</div>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-exclamation-triangle kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Inativos</div>
                            <div class="kpi-value">${insights.segmentation?.inativos || 0}</div>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-dollar-sign kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Receita Total</div>
                            <div class="kpi-value">${formatCurrency(insights.totalRevenue || 0)}</div>
                        </div>
                    </div>
                </div>

                <div class="customers-table-container bg-slate-800 rounded-lg overflow-hidden">
                    <div class="p-4 border-b border-slate-700">
                        <div class="flex flex-col lg:flex-row gap-4">
                            <div class="flex-1">
                                <div class="relative">
                                    <input type="text"
                                           id="customersSearchInput"
                                           class="form-input pl-10 w-full"
                                           placeholder="Buscar clientes...">
                                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                                </div>
                            </div>
                            <div class="flex gap-4">
                                <select id="customerStatusFilter" class="form-select">
                                    <option value="">Todos os status</option>
                                    <option value="active">Ativos</option>
                                    <option value="inactive">Inativos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-700" id="customersTable">
                            ${renderCustomersTable(customers)}
                        </table>
                    </div>
                </div>
            </div>
        `;

        setupCustomersFilters(customers);

    } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        container.innerHTML = `
            <div class="text-center py-16 text-red-400">
                <i class="fas fa-times-circle fa-4x mb-4"></i>
                <p class="text-lg">Erro ao carregar dados dos clientes</p>
            </div>
        `;
    }
}

function renderCustomersTable(customers) {
    if (!customers || customers.length === 0) {
        return `
            <tbody>
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <p>Nenhum cliente cadastrado</p>
                    </td>
                </tr>
            </tbody>
        `;
    }

    return `
        <thead class="bg-slate-700">
            <tr>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Cliente
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                    Contato
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                    Total Gasto
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                    Última Compra
                </th>
                <th class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Ações
                </th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-700">
            ${customers.map(customer => `
                <tr class="hover:bg-slate-750 transition-colors duration-150">
                    <td class="px-4 sm:px-6 py-4">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <i class="fas fa-user text-slate-400"></i>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-slate-200">${customer.name}</div>
                                <div class="text-xs text-slate-400 sm:hidden">${customer.phone}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden sm:table-cell">
                        <div>${customer.phone}</div>
                        ${customer.email ? `<div class="text-xs text-slate-400">${customer.email}</div>` : ''}
                    </td>
                    <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden lg:table-cell">
                        ${formatCurrency(customer.totalSpent || 0)}
                        ${customer.totalPurchases ? `<div class="text-xs text-slate-400">${customer.totalPurchases} compras</div>` : ''}
                    </td>
                    <td class="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden lg:table-cell">
                        ${customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate.toDate()) : 'Nunca'}
                    </td>
                    <td class="px-4 sm:px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="viewCustomerDetails('${customer.id}')" 
                                    class="text-sky-400 hover:text-sky-300 transition-colors"
                                    title="Ver detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="editCustomer('${customer.id}')" 
                                    class="text-sky-400 hover:text-sky-300 transition-colors"
                                    title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

function setupCustomersFilters(allCustomers) {
    const searchInput = document.getElementById('customersSearchInput');
    const statusFilter = document.getElementById('customerStatusFilter');

    const applyFilters = () => {
        const searchTerm = searchInput?.value?.toLowerCase() || '';
        const status = statusFilter?.value;

        let filtered = allCustomers;

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm) ||
                customer.phone.includes(searchTerm) ||
                (customer.email && customer.email.toLowerCase().includes(searchTerm))
            );
        }

        // Filtro de status
        if (status) {
            filtered = filtered.filter(customer => {
                if (status === 'inactive') {
                    return !customer.lastPurchaseDate || 
                           Math.floor((new Date() - customer.lastPurchaseDate.toDate()) / (1000 * 60 * 60 * 24)) > 90;
                }
                return customer.lastPurchaseDate && 
                       Math.floor((new Date() - customer.lastPurchaseDate.toDate()) / (1000 * 60 * 60 * 24)) <= 90;
            });
        }

        // Atualizar tabela
        const table = document.getElementById('customersTable');
        if (table) {
            table.innerHTML = renderCustomersTable(filtered);
        }
    };

    searchInput?.addEventListener('input', applyFilters);
    statusFilter?.addEventListener('change', applyFilters);
}

window.showCustomerModal = function(customerId = null) {
    showCustomModal(customerId ? 'Editar Cliente' : 'Novo Cliente', `
        <form id="customerModalForm">
            <input type="hidden" id="customerId" value="${customerId || ''}">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label class="form-label">Nome *</label>
                    <input type="text" id="customerModalName" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Telefone *</label>
                    <input type="tel" id="customerModalPhone" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="customerModalEmail" class="form-input">
                </div>
                
                <div class="form-group">
                    <label class="form-label">CPF</label>
                    <input type="text" id="customerModalCPF" class="form-input">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Endereço</label>
                <textarea id="customerModalAddress" class="form-input" rows="2"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Observações</label>
                <textarea id="customerModalNotes" class="form-input" rows="3"></textarea>
            </div>
        </form>
        
        <div class="flex justify-end gap-4 mt-6">
            <button onclick="closeCustomModal()" class="btn-secondary">
                Cancelar
            </button>
            <button onclick="saveCustomerModal()" class="btn-primary">
                <i class="fas fa-save mr-2"></i>
                Salvar Cliente
            </button>
        </div>
    `);

    if (customerId && typeof CRMService !== 'undefined') {
        CRMService.getCustomerById(customerId).then(customer => {
            if (customer) {
                document.getElementById('customerModalName').value = customer.name || '';
                document.getElementById('customerModalPhone').value = customer.phone || '';
                document.getElementById('customerModalEmail').value = customer.email || '';
                document.getElementById('customerModalCPF').value = customer.cpf || '';
                document.getElementById('customerModalAddress').value = customer.address || '';
                document.getElementById('customerModalNotes').value = customer.notes || '';
            }
        });
    }
};

window.saveCustomerModal = async function() {
    const form = document.getElementById('customerModalForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const customerData = {
        id: document.getElementById('customerId').value,
        name: document.getElementById('customerModalName').value.trim(),
        phone: document.getElementById('customerModalPhone').value.replace(/\D/g, ''),
        email: document.getElementById('customerModalEmail').value.trim(),
        cpf: document.getElementById('customerModalCPF').value.replace(/\D/g, ''),
        address: document.getElementById('customerModalAddress').value.trim(),
        notes: document.getElementById('customerModalNotes').value.trim()
    };

    try {
        if (typeof CRMService !== 'undefined') {
            await CRMService.createOrUpdateCustomer(customerData);
            closeCustomModal();
            await loadCustomersSection(document.getElementById('dynamicContentArea'));
            showTemporaryAlert(
                customerData.id ? 'Cliente atualizado!' : 'Cliente cadastrado!',
                'success'
            );
        } else {
            showTemporaryAlert('Serviço de clientes não disponível', 'error');
        }
    } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        showTemporaryAlert('Erro ao salvar cliente', 'error');
    }
};

window.viewCustomerDetails = function(customerId) {
    showTemporaryAlert('Detalhes do cliente em desenvolvimento', 'info');
};

window.editCustomer = function(customerId) {
    showCustomerModal(customerId);
};

// Usuários
function renderUsersSection(container) {
    container.innerHTML = `
        <div class="users-container">
            <div class="page-header mb-6">
                <h2 class="text-2xl font-bold text-slate-100">Gerenciamento de Usuários</h2>
                <p class="text-slate-400 mt-1">Gerencie usuários e permissões do sistema</p>
            </div>

            <div class="text-center py-16 text-slate-400">
                <i class="fas fa-users-cog fa-4x mb-4"></i>
                <p class="text-lg">Seção em desenvolvimento</p>
                <p class="text-sm mt-2">Em breve você poderá gerenciar usuários e permissões</p>
                
                <div class="mt-8 bg-slate-800 rounded-lg p-6 max-w-md mx-auto">
                    <h3 class="text-lg font-semibold text-slate-100 mb-4">Usuários de Teste Disponíveis</h3>
                    <div class="space-y-3 text-left">
                        <div class="text-sm">
                            <div class="font-medium text-slate-200">admin@elitecontrol.com</div>
                            <div class="text-slate-400">Dono/Gerente - Senha: admin123</div>
                        </div>
                        <div class="text-sm">
                            <div class="font-medium text-slate-200">estoque@elitecontrol.com</div>
                            <div class="text-slate-400">Controlador de Estoque - Senha: estoque123</div>
                        </div>
                        <div class="text-sm">
                            <div class="font-medium text-slate-200">vendas@elitecontrol.com</div>
                            <div class="text-slate-400">Vendedor - Senha: vendas123</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Fornecedores
function renderSuppliersSection(container) {
    container.innerHTML = `
        <div class="suppliers-container">
            <div class="page-header mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">Fornecedores</h2>
                        <p class="text-slate-400 mt-1">Gerencie fornecedores e parcerias</p>
                    </div>
                    <button onclick="showSupplierModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>
                        Novo Fornecedor
                    </button>
                </div>
            </div>

            <div class="text-center py-16 text-slate-400">
                <i class="fas fa-truck fa-4x mb-4"></i>
                <p class="text-lg">Seção em desenvolvimento</p>
                <p class="text-sm mt-2">Funcionalidades de fornecedores em breve</p>
                
                <div class="mt-8 bg-slate-800 rounded-lg p-6 max-w-lg mx-auto">
                    <h3 class="text-lg font-semibold text-slate-100 mb-4">Funcionalidades Planejadas</h3>
                    <div class="space-y-2 text-left text-sm">
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Cadastro de fornecedores</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Gestão de contatos</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Histórico de compras</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Avaliação de fornecedores</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Contratos e condições</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.showSupplierModal = function() {
    showTemporaryAlert('Modal de fornecedor em desenvolvimento', 'info');
};

// Movimentações
function renderMovementsSection(container) {
    container.innerHTML = `
        <div class="movements-container">
            <div class="page-header mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">Movimentações de Estoque</h2>
                        <p class="text-slate-400 mt-1">Controle entradas e saídas de produtos</p>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="showMovementModal('entrada')" class="btn-secondary">
                            <i class="fas fa-arrow-down mr-2"></i>
                            Entrada
                        </button>
                        <button onclick="showMovementModal('saida')" class="btn-primary">
                            <i class="fas fa-arrow-up mr-2"></i>
                            Saída
                        </button>
                    </div>
                </div>
            </div>

            <div class="text-center py-16 text-slate-400">
                <i class="fas fa-exchange-alt fa-4x mb-4"></i>
                <p class="text-lg">Seção em desenvolvimento</p>
                <p class="text-sm mt-2">Controle de movimentações de estoque em breve</p>
                
                <div class="mt-8 bg-slate-800 rounded-lg p-6 max-w-lg mx-auto">
                    <h3 class="text-lg font-semibold text-slate-100 mb-4">Funcionalidades Planejadas</h3>
                    <div class="space-y-2 text-left text-sm">
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Registro de entradas de estoque</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Controle de saídas manuais</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Histórico de movimentações</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Relatórios de movimentação</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Auditoria de estoque</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-400 mr-2"></i>
                            <span>Alertas automáticos</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.showMovementModal = function(type) {
    showTemporaryAlert(`Modal de ${type} de estoque em desenvolvimento`, 'info');
};

// Relatórios de Estoque
function renderStockReportsSection(container) {
    container.innerHTML = `
        <div class="stock-reports-container">
            <div class="page-header mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-100">Relatórios de Estoque</h2>
                        <p class="text-slate-400 mt-1">Análises e relatórios detalhados</p>
                    </div>
                    <button onclick="generateStockReport()" class="btn-primary">
                        <i class="fas fa-file-download mr-2"></i>
                        Gerar Relatório
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-chart-bar text-blue-400"></i>
                    </div>
                    <div class="report-content">
                        <h3 class="report-title">Relatório de Estoque Atual</h3>
                        <p class="report-description">Situação atual do estoque por produto</p>
                        <button onclick="showTemporaryAlert('Relatório em desenvolvimento', 'info')" class="btn-secondary btn-sm mt-4">
                            Ver Relatório
                        </button>
                    </div>
                </div>

                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                    </div>
                    <div class="report-content">
                        <h3 class="report-title">Produtos em Falta</h3>
                        <p class="report-description">Produtos com estoque baixo ou zerado</p>
                        <button onclick="showTemporaryAlert('Relatório em desenvolvimento', 'info')" class="btn-secondary btn-sm mt-4">
                            Ver Relatório
                        </button>
                    </div>
                </div>

                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-trending-up text-green-400"></i>
                    </div>
                    <div class="report-content">
                        <h3 class="report-title">Análise de Giro</h3>
                        <p class="report-description">Produtos com maior/menor rotatividade</p>
                        <button onclick="showTemporaryAlert('Relatório em desenvolvimento', 'info')" class="btn-secondary btn-sm mt-4">
                            Ver Relatório
                        </button>
                    </div>
                </div>
            </div>

            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-chart-pie fa-3x mb-4"></i>
                <p class="text-lg">Relatórios detalhados em desenvolvimento</p>
                <p class="text-sm mt-2">Em breve com análises avançadas e exportação</p>
            </div>
        </div>
    `;

    // Adicionar estilos específicos
    const style = document.createElement('style');
    style.textContent = `
        .report-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            border-radius: 0.75rem;
            padding: 1.5rem;
            border: 1px solid rgba(51, 65, 85, 0.5);
            transition: all 0.3s ease;
        }
        
        .report-card:hover {
            transform: translateY(-2px);
            border-color: rgba(56, 189, 248, 0.5);
        }
        
        .report-icon {
            text-align: center;
            margin-bottom: 1rem;
        }
        
        .report-icon i {
            font-size: 2rem;
        }
        
        .report-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #F1F5F9;
            margin-bottom: 0.5rem;
        }
        
        .report-description {
            color: #94A3B8;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
    `;
    document.head.appendChild(style);
}

window.generateStockReport = function() {
    showTemporaryAlert('Geração de relatórios em desenvolvimento', 'info');
};

// Configurações
function renderConfigSection(container) {
    const currentUser = EliteControl.state.currentUser;
    const settings = EliteControl.state.settings;

    container.innerHTML = `
        <div class="config-container">
            <div class="page-header mb-6">
                <h2 class="text-2xl font-bold text-slate-100">Configurações</h2>
                <p class="text-slate-400 mt-1">Personalize o sistema conforme suas preferências</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Perfil do Usuário -->
                <div class="config-section">
                    <div class="config-header">
                        <h3 class="config-title">
                            <i class="fas fa-user mr-2"></i>
                            Perfil do Usuário
                        </h3>
                    </div>
                    <div class="config-content">
                        <div class="user-profile">
                            <div class="user-avatar-large">
                                ${getInitials(currentUser.name || currentUser.email)}
                            </div>
                            <div class="user-info-large">
                                <h4 class="user-name-large">${currentUser.name || currentUser.email}</h4>
                                <p class="user-role-large">${currentUser.role}</p>
                                <p class="user-email-large">${currentUser.email}</p>
                            </div>
                        </div>
                        
                        <div class="config-actions">
                            <button onclick="showTemporaryAlert('Edição de perfil em desenvolvimento', 'info')" class="btn-secondary w-full">
                                <i class="fas fa-edit mr-2"></i>
                                Editar Perfil
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Configurações do Sistema -->
                <div class="config-section">
                    <div class="config-header">
                        <h3 class="config-title">
                            <i class="fas fa-cog mr-2"></i>
                            Configurações do Sistema
                        </h3>
                    </div>
                    <div class="config-content">
                        <div class="config-options">
                            <div class="config-option">
                                <div class="config-option-info">
                                    <label class="config-label">Tema Escuro</label>
                                    <span class="config-description">Interface com tema escuro</span>
                                </div>
                                <div class="config-toggle">
                                    <input type="checkbox" id="themeToggle" ${settings.theme === 'dark' ? 'checked' : ''}>
                                    <label for="themeToggle" class="toggle-label"></label>
                                </div>
                            </div>

                            <div class="config-option">
                                <div class="config-option-info">
                                    <label class="config-label">Notificações</label>
                                    <span class="config-description">Receber notificações do sistema</span>
                                </div>
                                <div class="config-toggle">
                                    <input type="checkbox" id="notificationsToggle" ${settings.notifications ? 'checked' : ''}>
                                    <label for="notificationsToggle" class="toggle-label"></label>
                                </div>
                            </div>

                            <div class="config-option">
                                <div class="config-option-info">
                                    <label class="config-label">Salvamento Automático</label>
                                    <span class="config-description">Salvar alterações automaticamente</span>
                                </div>
                                <div class="config-toggle">
                                    <input type="checkbox" id="autoSaveToggle" ${settings.autoSave ? 'checked' : ''}>
                                    <label for="autoSaveToggle" class="toggle-label"></label>
                                </div>
                            </div>

                            <div class="config-option">
                                <div class="config-option-info">
                                    <label class="config-label">Idioma</label>
                                    <span class="config-description">Idioma do sistema</span>
                                </div>
                                <select class="form-select" id="languageSelect">
                                    <option value="pt-BR" ${settings.language === 'pt-BR' ? 'selected' : ''}>Português (BR)</option>
                                    <option value="en-US" ${settings.language === 'en-US' ? 'selected' : ''}>English (US)</option>
                                    <option value="es-ES" ${settings.language === 'es-ES' ? 'selected' : ''}>Español (ES)</option>
                                </select>
                            </div>
                        </div>

                        <div class="config-actions">
                            <button onclick="saveSettings()" class="btn-primary w-full">
                                <i class="fas fa-save mr-2"></i>
                                Salvar Configurações
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Informações do Sistema -->
                <div class="config-section">
                    <div class="config-header">
                        <h3 class="config-title">
                            <i class="fas fa-info-circle mr-2"></i>
                            Informações do Sistema
                        </h3>
                    </div>
                    <div class="config-content">
                        <div class="system-info">
                            <div class="info-item">
                                <span class="info-label">Versão:</span>
                                <span class="info-value">EliteControl v2.0</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Último Login:</span>
                                <span class="info-value">${new Date().toLocaleString('pt-BR')}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Navegador:</span>
                                <span class="info-value">${navigator.userAgent.split(' ').pop()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Status:</span>
                                <span class="info-value status-online">
                                    <i class="fas fa-circle mr-2"></i>
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ações do Sistema -->
                <div class="config-section">
                    <div class="config-header">
                        <h3 class="config-title">
                            <i class="fas fa-tools mr-2"></i>
                            Ações do Sistema
                        </h3>
                    </div>
                    <div class="config-content">
                        <div class="system-actions">
                            <button onclick="exportData()" class="btn-secondary w-full mb-3">
                                <i class="fas fa-download mr-2"></i>
                                Exportar Dados
                            </button>
                            
                            <button onclick="clearCache()" class="btn-secondary w-full mb-3">
                                <i class="fas fa-trash mr-2"></i>
                                Limpar Cache
                            </button>
                            
                            <button onclick="resetSettings()" class="btn-secondary w-full mb-3">
                                <i class="fas fa-undo mr-2"></i>
                                Restaurar Padrões
                            </button>
                            
                            <button onclick="showTemporaryAlert('Suporte em desenvolvimento', 'info')" class="btn-secondary w-full">
                                <i class="fas fa-life-ring mr-2"></i>
                                Suporte Técnico
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Adicionar estilos específicos
    addConfigStyles();
    
    // Configurar event listeners
    setupConfigEventListeners();
}

function addConfigStyles() {
    if (document.getElementById('configStyles')) return;

    const style = document.createElement('style');
    style.id = 'configStyles';
    style.textContent = `
        .config-section {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            border-radius: 0.75rem;
            border: 1px solid rgba(51, 65, 85, 0.5);
            overflow: hidden;
        }
        
        .config-header {
            background: rgba(51, 65, 85, 0.5);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid rgba(71, 85, 105, 0.5);
        }
        
        .config-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #F1F5F9;
            display: flex;
            align-items: center;
        }
        
        .config-content {
            padding: 1.5rem;
        }
        
        .user-profile {
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .user-avatar-large {
            width: 4rem;
            height: 4rem;
            border-radius: 50%;
            background: linear-gradient(135deg, #38BDF8 0%, #6366F1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 1.25rem;
            margin-right: 1rem;
        }
        
        .user-name-large {
            font-size: 1.125rem;
            font-weight: 600;
            color: #F1F5F9;
            margin-bottom: 0.25rem;
        }
        
        .user-role-large {
            color: #38BDF8;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }
        
        .user-email-large {
            color: #94A3B8;
            font-size: 0.875rem;
        }
        
        .config-options {
            space-y: 1rem;
        }
        
        .config-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }
        
        .config-option:last-child {
            border-bottom: none;
        }
        
        .config-label {
            font-weight: 500;
            color: #F1F5F9;
            display: block;
            margin-bottom: 0.25rem;
        }
        
        .config-description {
            color: #94A3B8;
            font-size: 0.875rem;
        }
        
        .config-toggle {
            position: relative;
        }
        
        .config-toggle input[type="checkbox"] {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-label {
            display: block;
            width: 3rem;
            height: 1.5rem;
            background: #374151;
            border-radius: 9999px;
            position: relative;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .toggle-label::after {
            content: '';
            position: absolute;
            top: 0.125rem;
            left: 0.125rem;
            width: 1.25rem;
            height: 1.25rem;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }
        
        .config-toggle input:checked + .toggle-label {
            background: #38BDF8;
        }
        
        .config-toggle input:checked + .toggle-label::after {
            transform: translateX(1.5rem);
        }
        
        .system-info {
            space-y: 1rem;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #94A3B8;
            font-size: 0.875rem;
        }
        
        .info-value {
            color: #F1F5F9;
            font-weight: 500;
            font-size: 0.875rem;
        }
        
        .status-online {
            color: #10B981 !important;
        }
        
        .system-actions {
            space-y: 0.75rem;
        }
        
        .config-actions {
            margin-top: 1.5rem;
        }
    `;
    document.head.appendChild(style);
}

function setupConfigEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            EliteControl.state.settings.theme = e.target.checked ? 'dark' : 'light';
        });
    }

    // Notifications toggle
    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', (e) => {
            EliteControl.state.settings.notifications = e.target.checked;
        });
    }

    // Auto save toggle
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    if (autoSaveToggle) {
        autoSaveToggle.addEventListener('change', (e) => {
            EliteControl.state.settings.autoSave = e.target.checked;
        });
    }

    // Language select
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            EliteControl.state.settings.language = e.target.value;
        });
    }
}

window.saveSettings = function() {
    try {
        localStorage.setItem('elitecontrol_settings', JSON.stringify(EliteControl.state.settings));
        showTemporaryAlert('Configurações salvas com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showTemporaryAlert('Erro ao salvar configurações', 'error');
    }
};

window.exportData = function() {
    showTemporaryAlert('Exportação de dados em desenvolvimento', 'info');
};

window.clearCache = function() {
    showCustomConfirm('Deseja limpar o cache do sistema?', () => {
        try {
            localStorage.removeItem('elitecontrol_notifications');
            sessionStorage.clear();
            showTemporaryAlert('Cache limpo com sucesso!', 'success');
        } catch (error) {
            showTemporaryAlert('Erro ao limpar cache', 'error');
        }
    });
};

window.resetSettings = function() {
    showCustomConfirm('Deseja restaurar as configurações padrão?', () => {
        EliteControl.state.settings = {
            theme: 'dark',
            language: 'pt-BR',
            autoSave: true,
            notifications: true
        };
        saveSettings();
        loadConfigSection(document.getElementById('dynamicContentArea'));
    });
};

// === SIDEBAR E INTERFACE ===
function getDefaultSection(role) {
    switch (role) {
        case 'Vendedor': return 'vendas-painel';
        case 'Controlador de Estoque': return 'estoque';
        case 'Dono/Gerente': return 'geral';
        default: return 'geral';
    }
}

function initializeSidebar(role) {
    const navLinksContainer = document.getElementById('navLinks');
    if (!navLinksContainer || !role) return;

    console.log("🗂️ Inicializando sidebar para:", role);

    const currentHash = window.location.hash.substring(1);
    const defaultSection = getDefaultSection(role);
    const isActive = (section) => currentHash ? currentHash === section : section === defaultSection;

    let links = [];

    switch (role) {
        case 'Dono/Gerente':
            links = [
                { icon: 'fa-chart-pie', text: 'Painel Geral', section: 'geral' },
                { icon: 'fa-boxes-stacked', text: 'Produtos', section: 'produtos' },
                { icon: 'fa-cash-register', text: 'Registrar Venda', section: 'registrar-venda' },
                { icon: 'fa-file-invoice-dollar', text: 'Vendas', section: 'vendas' },
                { icon: 'fa-users', text: 'Clientes', section: 'clientes' },
                { icon: 'fa-users-cog', text: 'Usuários', section: 'usuarios' },
                { icon: 'fa-cogs', text: 'Configurações', section: 'config' }
            ];
            break;

        case 'Controlador de Estoque':
            links = [
                { icon: 'fa-warehouse', text: 'Painel Estoque', section: 'estoque' },
                { icon: 'fa-boxes-stacked', text: 'Produtos', section: 'produtos' },
                { icon: 'fa-truck-loading', text: 'Fornecedores', section: 'fornecedores' },
                { icon: 'fa-exchange-alt', text: 'Movimentações', section: 'movimentacoes' },
                { icon: 'fa-clipboard-list', text: 'Relatórios', section: 'relatorios-estoque' },
                { icon: 'fa-cogs', text: 'Configurações', section: 'config' }
            ];
            break;

        case 'Vendedor':
            links = [
                { icon: 'fa-dollar-sign', text: 'Painel Vendas', section: 'vendas-painel' },
                { icon: 'fa-search', text: 'Consultar Produtos', section: 'produtos-consulta' },
                { icon: 'fa-cash-register', text: 'Registrar Venda', section: 'registrar-venda' },
                { icon: 'fa-history', text: 'Minhas Vendas', section: 'minhas-vendas' },
                { icon: 'fa-users', text: 'Clientes', section: 'clientes' },
                { icon: 'fa-cogs', text: 'Configurações', section: 'config' }
            ];
            break;

        default:
            links = [
                { icon: 'fa-tachometer-alt', text: 'Painel', section: 'geral' },
                { icon: 'fa-cog', text: 'Configurações', section: 'config' }
            ];
    }

    navLinksContainer.innerHTML = links.map(link => `
        <a href="#${link.section}"
           class="nav-link ${isActive(link.section) ? 'active' : ''}"
           data-section="${link.section}">
            <div class="nav-link-icon">
                <i class="fas ${link.icon}"></i>
            </div>
            <span>${link.text}</span>
        </a>
    `).join('');
}

function updateSidebarActiveState(currentSection) {
    document.querySelectorAll('#navLinks a.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`#navLinks a.nav-link[data-section="${currentSection}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function updateUserInfo(user) {
    if (!user) return;

    console.log("👤 Atualizando informações do usuário");

    const initials = getInitials(user.name || user.email);

    const updates = {
        userInitials: initials,
        userDropdownInitials: initials,
        usernameDisplay: user.name || user.email?.split('@')[0] || 'Usuário',
        userRoleDisplay: user.role || 'Usuário',
        userDropdownName: user.name || user.email?.split('@')[0] || 'Usuário',
        userDropdownEmail: user.email || 'N/A'
    };

    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    const roleDisplayNames = {
        'Dono/Gerente': 'Painel Gerencial',
        'Controlador de Estoque': 'Painel de Estoque',
        'Vendedor': 'Painel de Vendas'
    };

    const pageTitle = roleDisplayNames[user.role] || 'Painel';
    const pageTitleEl = document.getElementById('pageTitle');
    const sidebarProfileName = document.getElementById('sidebarProfileName');

    if (pageTitleEl) pageTitleEl.textContent = pageTitle;
    if (sidebarProfileName) sidebarProfileName.textContent = pageTitle;
}

function clearDashboardUI() {
    console.log("🧹 Limpando interface do dashboard");

    // Limpar dados do usuário
    const elements = {
        userInitials: 'U',
        userDropdownInitials: 'U',
        usernameDisplay: 'Usuário',
        userRoleDisplay: 'Cargo',
        userDropdownName: 'Usuário',
        userDropdownEmail: 'usuario@exemplo.com',
        pageTitle: 'EliteControl',
        sidebarProfileName: 'Painel'
    };

    Object.entries(elements).forEach(([id, defaultValue]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = defaultValue;
    });

    // Limpar navegação
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.innerHTML = '';

    // Destruir gráficos
    Object.values(EliteControl.state.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    EliteControl.state.charts = {};

    // Limpar atividades
    const activitiesContainer = document.getElementById('recentActivitiesContainer');
    if (activitiesContainer) {
        activitiesContainer.innerHTML = `
            <li class="activity-item">
                <div class="activity-content">
                    <div class="activity-text text-slate-400">Nenhuma atividade</div>
                </div>
            </li>
        `;
    }
}

// === NOTIFICAÇÕES ===
function initializeNotifications() {
    if (!document.getElementById('notificationCountBadge')) return;

    let notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');

    if (notifications.length === 0) {
        notifications = [
            {
                id: 'welcome',
                title: 'Bem-vindo!',
                message: 'EliteControl v2.0 está pronto para uso.',
                time: 'Agora',
                read: false,
                type: 'success'
            },
            {
                id: 'update',
                title: 'Sistema Atualizado',
                message: 'Nova versão com melhorias e correções.',
                time: '1h atrás',
                read: false,
                type: 'info'
            }
        ];
        localStorage.setItem('elitecontrol_notifications', JSON.stringify(notifications));
    }

    EliteControl.state.notifications = notifications;
    updateNotificationsUI();
}

function updateNotificationsUI() {
    const notificationList = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationCountBadge');

    if (!notificationList || !notificationBadge) return;

    const notifications = EliteControl.state.notifications;
    const unreadCount = notifications.filter(n => !n.read).length;

    notificationBadge.textContent = unreadCount;
    notificationBadge.classList.toggle('hidden', unreadCount === 0);

    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="p-4 text-center text-slate-400">
                <i class="fas fa-bell-slash mb-2"></i>
                <p>Nenhuma notificação</p>
            </div>
        `;
        return;
    }

    notificationList.innerHTML = notifications.map(notification => {
        const typeIcons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };

        return `
            <div class="notification-item ${notification.read ? '' : 'unread'}"
                 data-id="${notification.id}">
                <div class="notification-item-header">
                    <div class="notification-item-title">${notification.title}</div>
                    <div class="notification-item-badge ${notification.type}">
                        <i class="fas ${typeIcons[notification.type] || 'fa-info-circle'}"></i>
                    </div>
                </div>
                <div class="notification-item-message">${notification.message}</div>
                <div class="notification-item-footer">
                    <div class="notification-item-time">${notification.time}</div>
                    ${!notification.read ? '<div class="notification-item-action">Marcar como lida</div>' : ''}
                </div>
            </div>
        `;
    }).join('');

    // Adicionar event listeners
    notificationList.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            markNotificationAsRead(id);
        });
    });
}

function markNotificationAsRead(id) {
    EliteControl.state.notifications = EliteControl.state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem('elitecontrol_notifications', JSON.stringify(EliteControl.state.notifications));
    updateNotificationsUI();
}

function markAllNotificationsAsRead() {
    EliteControl.state.notifications = EliteControl.state.notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('elitecontrol_notifications', JSON.stringify(EliteControl.state.notifications));
    updateNotificationsUI();

    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

// === FUNÇÕES UTILITÁRIAS ===

// Estados de loading e erro
function showLoadingState(container, message = 'Carregando...') {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-slate-400">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mb-4"></div>
            <p class="text-lg">${message}</p>
        </div>
    `;
}

function showErrorState(container, title, message = '') {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-red-400">
            <i class="fas fa-exclamation-triangle fa-4x mb-4"></i>
            <h3 class="text-xl font-semibold mb-2">${title}</h3>
            ${message ? `<p class="text-sm text-slate-400">${message}</p>` : ''}
            <button onclick="location.reload()" class="btn-primary mt-4">
                <i class="fas fa-refresh mr-2"></i>
                Tentar Novamente
            </button>
        </div>
    `;
}

function showCriticalError(message) {
    document.body.innerHTML = `
        <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div class="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
                <i class="fas fa-exclamation-triangle fa-4x text-red-400 mb-4"></i>
                <h2 class="text-xl font-bold text-slate-100 mb-2">Erro Crítico</h2>
                <p class="text-slate-400 mb-6">${message}</p>
                <button onclick="location.reload()" class="btn-primary w-full">
                    Recarregar Página
                </button>
            </div>
        </div>
    `;
}

// Formatação
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) value = 0;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateInput) {
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (dateInput && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else {
        return "Data inválida";
    }

    if (isNaN(date.getTime())) return "Data inválida";

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatDateTime(dateInput) {
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (dateInput && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else {
        return "Data/hora inválida";
    }

    if (isNaN(date.getTime())) return "Data/hora inválida";

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(date);
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
               .map(n => n[0])
               .join('')
               .toUpperCase()
               .substring(0, 2);
}

// Modais e alertas
function showTemporaryAlert(message, type = 'info', duration = 4000) {
    const container = document.getElementById('temporaryAlertsContainer') || createAlertsContainer();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `temporary-alert temporary-alert-${type}`;

    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };

    alertDiv.innerHTML = `
        <div class="temporary-alert-content">
            <i class="fas ${icons[type] || icons.info} temporary-alert-icon"></i>
            <span class="temporary-alert-message">${message}</span>
        </div>
        <button class="temporary-alert-close" onclick="this.parentElement.remove()">
            &times;
        </button>
    `;

    container.appendChild(alertDiv);
    setTimeout(() => alertDiv.classList.add('show'), 10);

    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, duration);
}

function createAlertsContainer() {
    const container = document.createElement('div');
    container.id = 'temporaryAlertsContainer';
    container.className = 'temporary-alerts-container';
    document.body.appendChild(container);
    return container;
}

function showCustomConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop visible';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-question-circle text-yellow-400 mr-2"></i>
                    Confirmação
                </h3>
                <button onclick="this.closest('.modal-backdrop').remove()" class="modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p class="text-slate-300">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal-backdrop').remove()" class="btn-secondary">
                    Cancelar
                </button>
                <button onclick="handleConfirm()" class="btn-primary">
                    Confirmar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window.handleConfirm = () => {
        modal.remove();
        onConfirm();
        delete window.handleConfirm;
    };

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

function showCustomModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop visible';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button onclick="closeCustomModal()" class="modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeCustomModal();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

function closeCustomModal() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    }
}

function showLoginError(message) {
    const errorElement = document.getElementById('loginErrorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.toggle('hidden', !message);
    }
}

// Recarregamento de seções
async function reloadCurrentSectionIfProducts() {
    const currentUser = EliteControl.state.currentUser;
    const currentSection = window.location.hash.substring(1);
    
    if (currentSection === 'produtos' || currentSection === 'produtos-consulta') {
        await loadSectionContent(currentSection);
    }
}

// Dados de teste
async function ensureTestDataExists() {
    try {
        const products = await DataService.getProducts();
        if (!products || products.length === 0) {
            console.log("📦 Criando produtos de exemplo...");
            for (const product of EliteControl.sampleProducts) {
                await DataService.addProduct(product);
            }
            console.log("✅ Produtos de exemplo criados");
        }
    } catch (error) {
        console.warn("⚠️ Erro ao verificar/criar dados de teste:", error);
    }
}

async function findUserByEmail(email) {
    if (!db) return null;
    try {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { uid: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar usuário por email:", error);
        return null;
    }
}

async function createTestUser(uid, email) {
    if (!db) return null;
    try {
        const testUserData = EliteControl.testUsers[email];
        if (testUserData) {
            await db.collection('users').doc(uid).set({
                ...testUserData,
                uid: uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("✅ Usuário de teste criado:", testUserData.name);
            return { uid: uid, ...testUserData };
        }
        return null;
    } catch (error) {
        console.error("Erro ao criar usuário de teste:", error);
        return null;
    }
}

// === ESTILOS DINÂMICOS ===
function addProductsConsultStyles() {
    if (document.getElementById('productsConsultStyles')) return;

    const style = document.createElement('style');
    style.id = 'productsConsultStyles';
    style.textContent = `
        .product-consult-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            border-radius: 0.75rem;
            padding: 1.5rem;
            border: 1px solid rgba(51, 65, 85, 0.5);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .product-consult-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            border-color: rgba(56, 189, 248, 0.5);
        }

        .product-consult-card.out {
            opacity: 0.7;
            border-color: rgba(239, 68, 68, 0.3);
        }

        .product-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .product-card-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: #F1F5F9;
            margin-right: 0.5rem;
        }

        .stock-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .stock-badge.available {
            background: rgba(16, 185, 129, 0.2);
            color: #10B981;
            border: 1px solid rgba(16, 185, 129, 0.5);
        }

        .stock-badge.low {
            background: rgba(245, 158, 11, 0.2);
            color: #F59E0B;
            border: 1px solid rgba(245, 158, 11, 0.5);
        }

        .stock-badge.out {
            background: rgba(239, 68, 68, 0.2);
            color: #EF4444;
            border: 1px solid rgba(239, 68, 68, 0.5);
        }

        .product-card-info {
            margin-bottom: 1.5rem;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: #94A3B8;
            font-size: 0.875rem;
        }

        .info-value {
            color: #F1F5F9;
            font-weight: 500;
            font-size: 0.875rem;
        }

        .info-value.price {
            color: #38BDF8;
            font-size: 1rem;
            font-weight: 600;
        }

        .product-card-actions {
            margin-top: 1rem;
        }

        .btn-sm {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }
    `;
    document.head.appendChild(style);
}

function addSaleFormStyles() {
    if (document.getElementById('saleFormStyles')) return;

    const style = document.createElement('style');
    style.id = 'saleFormStyles';
    style.textContent = `
        .customer-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(30, 41, 59, 0.98);
            border: 1px solid rgba(51, 65, 85, 0.5);
            border-radius: 0.5rem;
            margin-top: 0.25rem;
            max-height: 300px;
            overflow-y: auto;
            z-index: 50;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .customer-suggestion-item {
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }

        .customer-suggestion-item:last-child {
            border-bottom: none;
        }

        .customer-suggestion-item:hover {
            background: rgba(56, 189, 248, 0.1);
            border-left: 3px solid #38BDF8;
        }

        .customer-suggestion-name {
            font-weight: 500;
            color: #F1F5F9;
            margin-bottom: 0.25rem;
        }

        .customer-suggestion-info {
            font-size: 0.75rem;
            color: #94A3B8;
            display: flex;
            gap: 1rem;
        }

        .customer-card {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
        }

        .product-sale-card {
            background: rgba(30, 41, 59, 0.95);
            border: 1px solid rgba(71, 85, 105, 0.5);
            border-radius: 0.75rem;
            padding: 1.25rem;
            transition: all 0.3s ease;
        }

        .product-sale-card:hover {
            border-color: rgba(56, 189, 248, 0.5);
            transform: translateY(-1px);
        }

        .product-sale-card.out-of-stock {
            opacity: 0.6;
            border-color: rgba(239, 68, 68, 0.3);
        }

        .product-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
        }

        .product-name {
            font-size: 1rem;
            font-weight: 600;
            color: #F1F5F9;
        }

        .product-price {
            font-size: 1rem;
            font-weight: 600;
            color: #38BDF8;
        }

        .product-info {
            margin-bottom: 1rem;
        }

        .stock-info {
            margin-top: 0.5rem;
        }

        .stock-count {
            font-size: 0.875rem;
            font-weight: 500;
        }

        .product-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .quantity-controls {
            display: flex;
            align-items: center;
            background: rgba(51, 65, 85, 0.5);
            border-radius: 0.375rem;
            border: 1px solid rgba(71, 85, 105, 0.5);
            overflow: hidden;
        }

        .quantity-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .quantity-btn:hover {
            background: rgba(71, 85, 105, 0.5);
            color: #F1F5F9;
        }

        .quantity-input {
            width: 3rem;
            text-align: center;
            border: none;
            background: none;
            color: #F1F5F9;
            font-weight: 500;
            padding: 0.5rem 0;
            font-size: 0.875rem;
        }

        .quantity-input:focus {
            outline: none;
        }

        .add-to-cart-btn {
            width: 2.5rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #38BDF8;
            border: none;
            border-radius: 0.375rem;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .add-to-cart-btn:hover {
            background: #0284C7;
            transform: translateY(-1px);
        }

        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(51, 65, 85, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border: 1px solid rgba(71, 85, 105, 0.3);
        }

        .cart-item-info {
            flex: 1;
        }

        .cart-item-name {
            font-weight: 500;
            color: #F1F5F9;
            margin-bottom: 0.25rem;
        }

        .cart-item-details {
            font-size: 0.875rem;
            color: #94A3B8;
        }

        .cart-item-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .quantity-controls-small {
            display: flex;
            align-items: center;
            background: rgba(71, 85, 105, 0.5);
            border-radius: 0.25rem;
            overflow: hidden;
        }

        .quantity-btn-small {
            width: 1.75rem;
            height: 1.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            font-size: 0.75rem;
        }

        .quantity-btn-small:hover {
            background: rgba(94, 113, 140, 0.5);
            color: #F1F5F9;
        }

        .quantity-input-small {
            width: 2.5rem;
            text-align: center;
            border: none;
            background: none;
            color: #F1F5F9;
            font-size: 0.875rem;
            padding: 0.25rem;
        }

        .remove-item-btn {
            width: 1.75rem;
            height: 1.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.25rem;
            color: #EF4444;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .remove-item-btn:hover {
            background: rgba(239, 68, 68, 0.3);
            color: #FCA5A5;
        }

        .empty-cart {
            text-align: center;
            padding: 2rem;
            color: #94A3B8;
        }

        .cart-summary {
            border-top: 1px solid rgba(51, 65, 85, 0.5);
            padding-top: 1rem;
            margin-top: 1rem;
        }

        @media (max-width: 768px) {
            .product-header {
                flex-direction: column;
                gap: 0.5rem;
            }

            .product-actions {
                flex-direction: column;
                gap: 0.75rem;
            }

            .quantity-controls {
                width: 100%;
                justify-content: center;
            }

            .cart-item {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .cart-item-actions {
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}

// === INICIALIZAÇÃO FINAL ===

// Adicionar estilos necessários ao carregar
document.addEventListener('DOMContentLoaded', function() {
    addSaleFormStyles();
    addProductsConsultStyles();
});

// === EXPOSIÇÃO DE FUNÇÕES GLOBAIS ===

// Funções de produtos para uso em eventos dinâmicos
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;

// Funções de vendas para uso em eventos dinâmicos
window.changeQuantity = changeQuantity;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.selectCustomer = selectCustomer;
window.saveNewCustomer = saveNewCustomer;

// Funções de clientes
window.showCustomerModal = showCustomerModal;
window.saveCustomerModal = saveCustomerModal;
window.viewCustomerDetails = viewCustomerDetails;
window.editCustomer = editCustomer;

// Funções de modal
window.closeCustomModal = closeCustomModal;
window.showCustomModal = showCustomModal;

// Funções de configuração
window.saveSettings = saveSettings;
window.exportData = exportData;
window.clearCache = clearCache;
window.resetSettings = resetSettings;

// Funções de seções específicas
window.showSupplierModal = showSupplierModal;
window.showMovementModal = showMovementModal;
window.generateStockReport = generateStockReport;

// Funções de vendas
window.viewSaleDetails = viewSaleDetails;

// === LOG FINAL ===
console.log("🎉 EliteControl v2.0 Sistema Completo Carregado!");
console.log("📊 Funcionalidades Implementadas:");
console.log("   ✅ Sistema de Autenticação");
console.log("   ✅ Dashboard Responsivo");
console.log("   ✅ Gestão de Produtos");
console.log("   ✅ Sistema de Vendas com CRM");
console.log("   ✅ Gestão de Clientes");
console.log("   ✅ Relatórios e Análises");
console.log("   ✅ Configurações do Sistema");
console.log("   ✅ Interface Responsiva");
console.log("   ✅ Notificações em Tempo Real");
console.log("   ✅ Múltiplos Perfis de Usuário");
console.log("🚀 Sistema pronto para produção!");

// === EXPORT PARA MÓDULOS (se necessário) ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EliteControl;
}
