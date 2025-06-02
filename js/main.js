// js/main-v2.js - Sistema EliteControl v2.0 com IA e CRM Avançado

// Variáveis globais
let productModal, productForm, productModalTitle, productIdField, productNameField, 
    productCategoryField, productPriceField, productStockField, productLowStockAlertField,
    closeProductModalButton, cancelProductFormButton, saveProductButton;

// Controle de event listeners para evitar duplicatas
let modalEventListenersAttached = false;
let isModalProcessing = false;

// Dados de usuários de teste
const testUsers = {
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
};

// Produtos de exemplo
const sampleProducts = [
    { name: 'Notebook Dell Inspiron', category: 'Eletrônicos', price: 2500.00, stock: 15, lowStockAlert: 10 },
    { name: 'Mouse Logitech MX Master', category: 'Periféricos', price: 320.00, stock: 8, lowStockAlert: 5 },
    { name: 'Teclado Mecânico RGB', category: 'Periféricos', price: 450.00, stock: 25, lowStockAlert: 15 },
    { name: 'Monitor 24" Full HD', category: 'Eletrônicos', price: 800.00, stock: 12, lowStockAlert: 8 },
    { name: 'SSD 500GB Samsung', category: 'Armazenamento', price: 350.00, stock: 30, lowStockAlert: 20 }
];

// === INICIALIZAÇÃO ===

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 EliteControl v2.0 inicializando...');
    
    initializeModalElements();
    setupEventListeners();
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
});

function initializeModalElements() {
    productModal = document.getElementById('productModal');
    productForm = document.getElementById('productForm');
    productModalTitle = document.getElementById('productModalTitle');
    productIdField = document.getElementById('productId');
    productNameField = document.getElementById('productName');
    productCategoryField = document.getElementById('productCategory');
    productPriceField = document.getElementById('productPrice');
    productStockField = document.getElementById('productStock');
    productLowStockAlertField = document.getElementById('productLowStockAlert');
    closeProductModalButton = document.getElementById('closeProductModalButton');
    cancelProductFormButton = document.getElementById('cancelProductFormButton');
    saveProductButton = document.getElementById('saveProductButton');
    
    if (productModal && !modalEventListenersAttached) {
        setupModalEventListeners();
        modalEventListenersAttached = true;
    }
}

// === AUTENTICAÇÃO E NAVEGAÇÃO ===

async function handleAuthStateChange(user) {
    console.log('🔐 Estado de autenticação alterado:', user ? `Logado como ${user.email}` : 'Deslogado');
    console.log('📍 Página atual:', window.location.pathname);
    console.log('📍 Hash atual:', window.location.hash);
    
    if (user) {
        try {
            console.log("🔄 Iniciando processo pós-login...");
            await ensureTestDataExists();
            // ... resto do código continua igual
            let userData = await DataService.getUserData(user.uid);
            
            if (!userData) {
                userData = await findUserByEmail(user.email);
            }
            
            if (!userData && testUsers[user.email]) {
                userData = await createTestUser(user.uid, user.email);
            }
            
            if (userData && userData.role) {
                localStorage.setItem('elitecontrol_user_role', userData.role);
                const currentUser = { uid: user.uid, email: user.email, ...userData };
                
                initializeUI(currentUser);
                await handleNavigation(currentUser);
                
            } else {
                throw new Error('Dados do usuário não encontrados');
            }
            
        } catch (error) {
            console.error("❌ Erro no processo de autenticação:", error);
            showTemporaryAlert("Erro ao carregar dados do usuário.", "error");
            
            if (!window.location.pathname.includes('index.html')) {
                console.log("🔄 Fazendo logout devido a erro...");
                await firebase.auth().signOut();
            }
        }
    } else {
        console.log("👋 Usuário não autenticado, executando handleLoggedOut");
        handleLoggedOut();
    }
}

// === INTERFACE PRINCIPAL ===

function initializeUI(currentUser) {
    console.log("🎨 Inicializando interface para:", currentUser.role);
    
    updateUserInfo(currentUser);
    initializeNotifications();
    initializeSidebar(currentUser.role);
    
    if (document.getElementById('temporaryAlertsContainer') && 
        window.location.href.includes('dashboard.html') &&
        !sessionStorage.getItem('welcomeAlertShown')) {
        
        const userName = currentUser.name || currentUser.email.split('@')[0];
        showTemporaryAlert(`Bem-vindo, ${userName}! EliteControl v2.0 com IA`, 'success', 5000);
        sessionStorage.setItem('welcomeAlertShown', 'true');
    }
}

// === CARREGAMENTO DE SEÇÕES ===

async function loadSectionContent(sectionId, currentUser) {
    console.log(`📄 Carregando seção: ${sectionId} para usuário:`, currentUser.role);
    
    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) return;
    
    // Mostrar loading
    dynamicContentArea.innerHTML = `
        <div class="p-8 text-center text-slate-400">
            <i class="fas fa-spinner fa-spin fa-2x mb-4"></i>
            <p>Carregando ${sectionId}...</p>
        </div>
    `;
    
    try {
        switch (sectionId) {
            case 'produtos':
                const products = await DataService.getProducts();
                renderProductsList(products, dynamicContentArea, currentUser.role);
                break;
                
            case 'produtos-consulta':
                const allProducts = await DataService.getProducts();
                renderProductsConsult(allProducts, dynamicContentArea, currentUser.role);
                break;
                
            case 'geral':
            case 'vendas-painel':
            case 'estoque':
                await loadDashboardData(currentUser);
                break;
                
            case 'registrar-venda':
                renderRegisterSaleForm(dynamicContentArea, currentUser);
                break;
                
            case 'vendas':
                const sales = await DataService.getSales();
                renderSalesList(sales, dynamicContentArea, currentUser.role);
                break;
                
            case 'minhas-vendas':
                const mySales = await DataService.getSalesBySeller(currentUser.uid);
                renderSalesList(mySales, dynamicContentArea, currentUser.role, true);
                break;
                
            case 'clientes':
                await renderCustomersSection(dynamicContentArea, currentUser);
                break;
                
            case 'usuarios':
                renderUsersSection(dynamicContentArea);
                break;
                
            default:
                dynamicContentArea.innerHTML = `
                    <div class="p-8 text-center text-slate-400">
                        <i class="fas fa-exclamation-triangle fa-2x mb-4"></i>
                        <p>Seção "${sectionId}" em desenvolvimento.</p>
                    </div>
                `;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar seção ${sectionId}:`, error);
        dynamicContentArea.innerHTML = `
            <div class="p-8 text-center text-red-400">
                <i class="fas fa-times-circle fa-2x mb-4"></i>
                <p>Erro ao carregar conteúdo. Tente novamente.</p>
            </div>
        `;
        showTemporaryAlert(`Erro ao carregar ${sectionId}.`, 'error');
    }
}

// === PRODUTOS COM PESQUISA APRIMORADA ===

function renderProductsConsult(products, container, userRole) {
    console.log("🔍 Renderizando consulta de produtos com pesquisa avançada");
    
    container.innerHTML = `
        <div class="products-consult-container">
            <h2 class="text-xl font-semibold text-slate-100 mb-4">Consultar Produtos</h2>
            
            <!-- Barra de pesquisa avançada -->
            <div class="search-section mb-6">
                <div class="search-bar bg-slate-800 p-4 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="col-span-2">
                            <div class="relative">
                                <input type="text" 
                                       id="productSearchInput" 
                                       class="form-input pl-10 w-full" 
                                       placeholder="Buscar por nome ou categoria...">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                            </div>
                        </div>
                        
                        <select id="categoryFilter" class="form-select">
                            <option value="">Todas as categorias</option>
                        </select>
                        
                        <select id="stockFilter" class="form-select">
                            <option value="">Todos os status</option>
                            <option value="available">Em estoque</option>
                            <option value="low">Estoque baixo</option>
                            <option value="out">Sem estoque</option>
                        </select>
                    </div>
                    
                    <div class="mt-4 flex items-center justify-between">
                        <div class="text-sm text-slate-400">
                            <span id="searchResultsCount">${products.length}</span> produtos encontrados
                        </div>
                        
                        <div class="flex gap-2">
                            <button id="clearFiltersButton" class="btn-secondary btn-sm">
                                <i class="fas fa-times mr-1"></i> Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Lista de produtos -->
            <div id="productsConsultList" class="products-grid"></div>
        </div>
    `;
    
    // Aplicar estilos
    addProductsConsultStyles();
    
    // Preencher categorias
    const categories = [...new Set(products.map(p => p.category))].sort();
    const categoryFilter = document.getElementById('categoryFilter');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
    
    // Renderizar produtos
    renderFilteredProducts(products);
    
    // Configurar event listeners
    setupProductsConsultEventListeners(products);
}

function renderFilteredProducts(products) {
    const container = document.getElementById('productsConsultList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 col-span-full">
                <i class="fas fa-search fa-3x mb-4"></i>
                <p>Nenhum produto encontrado com os filtros aplicados.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const lowStockThreshold = Number(product.lowStockAlert) || 10;
        const stockClass = product.stock === 0 ? 'out' : (product.stock <= lowStockThreshold ? 'low' : 'available');
        const stockLabel = product.stock === 0 ? 'Sem estoque' : 
                          (product.stock <= lowStockThreshold ? 'Estoque baixo' : 'Em estoque');
        
        return `
            <div class="product-consult-card ${stockClass}">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="stock-badge ${stockClass}">${stockLabel}</span>
                </div>
                
                <div class="product-info">
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
                
                ${product.stock > 0 ? `
                    <button class="btn-primary btn-sm w-full mt-4" 
                            onclick="window.location.hash='#registrar-venda'">
                        <i class="fas fa-shopping-cart mr-2"></i>
                        Vender
                    </button>
                ` : `
                    <button class="btn-secondary btn-sm w-full mt-4" disabled>
                        <i class="fas fa-times mr-2"></i>
                        Indisponível
                    </button>
                `}
            </div>
        `;
    }).join('');
}

function setupProductsConsultEventListeners(allProducts) {
    const searchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');
    const clearButton = document.getElementById('clearFiltersButton');
    const resultsCount = document.getElementById('searchResultsCount');
    
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const stockStatus = stockFilter.value;
        
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
        
        resultsCount.textContent = filtered.length;
        renderFilteredProducts(filtered);
    };
    
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    stockFilter.addEventListener('change', applyFilters);
    
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        categoryFilter.value = '';
        stockFilter.value = '';
        applyFilters();
    });
}

function addProductsConsultStyles() {
    if (!document.getElementById('productsConsultStyles')) {
        const style = document.createElement('style');
        style.id = 'productsConsultStyles';
        style.textContent = `
            .products-consult-container {
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .search-section {
                animation: fadeIn 0.5s ease;
            }
            
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            .product-consult-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                transition: all 0.3s ease;
                animation: fadeIn 0.5s ease;
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
            
            .product-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
            }
            
            .product-name {
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
            
            .product-info {
                margin-bottom: 1rem;
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
            }
            
            .btn-sm {
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
            }
            
            @media (max-width: 768px) {
                .products-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// === VENDAS COM CLIENTE ===

let saleCart = [];
let availableProducts = [];
let selectedCustomer = null;

function renderRegisterSaleForm(container, currentUser) {
    console.log("💰 Renderizando formulário de registro de venda com CRM");
    
    container.innerHTML = `
        <div class="register-sale-container">
            <div class="sale-header">
                <h2 class="text-xl font-semibold text-slate-100 mb-2">Registrar Nova Venda</h2>
                <p class="text-slate-400 mb-6">Selecione o cliente, produtos e quantidades</p>
            </div>
            
            <!-- Informações da Venda -->
            <div class="sale-info-card mb-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="info-item">
                        <label class="info-label">Vendedor</label>
                        <div class="info-value">${currentUser.name || currentUser.email}</div>
                    </div>
                    <div class="info-item">
                        <label class="info-label">Data</label>
                        <div class="info-value">${new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="info-item">
                        <label class="info-label">Hora</label>
                        <div class="info-value" id="currentTime">${new Date().toLocaleTimeString('pt-BR')}</div>
                    </div>
                </div>
            </div>
            
            <!-- Seleção de Cliente -->
            <div class="customer-selection-card mb-6">
                <h3 class="text-lg font-semibold text-slate-100 mb-4">
                    <i class="fas fa-user mr-2"></i>
                    Cliente
                </h3>
                
                <div class="customer-search-container">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="relative">
                            <input type="text" 
                                   id="customerSearchInput" 
                                   class="form-input pl-10" 
                                   placeholder="Buscar cliente por nome ou telefone...">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                        
                        <button id="newCustomerButton" class="btn-secondary">
                            <i class="fas fa-user-plus mr-2"></i>
                            Novo Cliente
                        </button>
                    </div>
                    
                    <!-- Lista de sugestões -->
                    <div id="customerSuggestions" class="customer-suggestions hidden"></div>
                    
                    <!-- Cliente selecionado -->
                    <div id="selectedCustomerInfo" class="selected-customer-info hidden">
                        <div class="customer-card">
                            <div class="customer-details">
                                <h4 id="selectedCustomerName" class="font-semibold text-slate-100"></h4>
                                <p id="selectedCustomerPhone" class="text-sm text-slate-400"></p>
                                <p id="selectedCustomerStats" class="text-xs text-slate-500 mt-1"></p>
                            </div>
                            <button id="removeCustomerButton" class="btn-secondary btn-sm">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Seleção de Produtos -->
            <div class="products-selection-card mb-6">
                <h3 class="text-lg font-semibold text-slate-100 mb-4">
                    <i class="fas fa-shopping-cart mr-2"></i>
                    Selecionar Produtos
                </h3>
                
                <div class="search-container mb-4">
                    <div class="relative">
                        <input type="text" 
                               id="productSearchInput" 
                               class="form-input pl-10" 
                               placeholder="Buscar produtos...">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                    </div>
                </div>
                
                <div id="availableProductsList" class="products-grid">
                    <div class="loading-products">
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        Carregando produtos...
                    </div>
                </div>
            </div>
            
            <!-- Carrinho de Compras -->
            <div class="cart-card mb-6">
                <div class="cart-header">
                    <h3 class="text-lg font-semibold text-slate-100">
                        <i class="fas fa-receipt mr-2"></i>
                        Itens da Venda
                    </h3>
                    <button id="clearCartButton" class="btn-secondary btn-sm" style="display: none;">
                        <i class="fas fa-trash mr-1"></i>
                        Limpar
                    </button>
                </div>
                
                <div id="cartItemsList" class="cart-items">
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart fa-2x mb-2 text-slate-400"></i>
                        <p class="text-slate-400">Nenhum produto adicionado</p>
                        <p class="text-sm text-slate-500">Selecione produtos acima para adicionar à venda</p>
                    </div>
                </div>
                
                <div id="cartSummary" class="cart-summary" style="display: none;">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span id="cartSubtotal">R$ 0,00</span>
                    </div>
                    <div class="summary-row total-row">
                        <span>Total:</span>
                        <span id="cartTotal">R$ 0,00</span>
                    </div>
                </div>
            </div>
            
            <!-- Ações -->
            <div class="sale-actions">
                <button id="cancelSaleButton" class="btn-secondary">
                    <i class="fas fa-times mr-2"></i>
                    Cancelar
                </button>
                <button id="finalizeSaleButton" class="btn-primary" disabled>
                    <i class="fas fa-check mr-2"></i>
                    Finalizar Venda
                </button>
            </div>
        </div>
    `;
    
    // Aplicar estilos
    addSaleFormStyles();
    addCustomerStyles();
    
    // Inicializar funcionalidades
    initializeSaleFormWithCRM(currentUser);
}

function addCustomerStyles() {
    if (!document.getElementById('customerStyles')) {
        const style = document.createElement('style');
        style.id = 'customerStyles';
        style.textContent = `
            .customer-selection-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .customer-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: rgba(30, 41, 59, 0.95);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.5rem;
                margin-top: 0.5rem;
                max-height: 300px;
                overflow-y: auto;
                z-index: 50;
                backdrop-filter: blur(10px);
            }
            
            .customer-suggestion-item {
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 1px solid rgba(51, 65, 85, 0.3);
            }
            
            .customer-suggestion-item:hover {
                background: rgba(56, 189, 248, 0.1);
                border-left: 3px solid #38BDF8;
            }
            
            .customer-suggestion-item:last-child {
                border-bottom: none;
            }
            
            .customer-suggestion-name {
                font-weight: 500;
                color: #F1F5F9;
                margin-bottom: 0.25rem;
            }
            
            .customer-suggestion-info {
                font-size: 0.75rem;
                color: #94A3B8;
            }
            
            .selected-customer-info {
                margin-top: 1rem;
            }
            
            .customer-card {
                background: rgba(56, 189, 248, 0.1);
                border: 1px solid rgba(56, 189, 248, 0.3);
                border-radius: 0.5rem;
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .customer-modal {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.75);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 1rem;
                backdrop-filter: blur(5px);
            }
            
            .customer-modal-content {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
                border-radius: 1rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                width: 100%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
            }
        `;
        document.head.appendChild(style);
    }
}

async function initializeSaleFormWithCRM(currentUser) {
    console.log("🛒 Inicializando formulário de venda com CRM");
    
    try {
        // Carregar produtos disponíveis
        availableProducts = await DataService.getProducts();
        renderAvailableProducts(availableProducts);
        
        // Configurar event listeners
        setupSaleFormWithCRMEventListeners(currentUser);
        
        // Atualizar hora a cada minuto
        setInterval(updateCurrentTime, 60000);
        
        console.log("✅ Formulário de venda com CRM inicializado");
        
    } catch (error) {
        console.error("❌ Erro ao inicializar formulário de venda:", error);
        showTemporaryAlert("Erro ao carregar dados. Tente novamente.", "error");
    }
}

function setupSaleFormWithCRMEventListeners(currentUser) {
    // Busca de produtos
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredProducts = availableProducts.filter(product => 
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
            
            if (searchTerm.length < 2) {
                document.getElementById('customerSuggestions').classList.add('hidden');
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                const suggestions = await CRMService.searchCustomers(searchTerm);
                renderCustomerSuggestions(suggestions);
            }, 300);
        });
    }
    
    // Novo cliente
    const newCustomerButton = document.getElementById('newCustomerButton');
    if (newCustomerButton) {
        newCustomerButton.addEventListener('click', () => showNewCustomerModal());
    }
    
    // Remover cliente selecionado
    const removeCustomerButton = document.getElementById('removeCustomerButton');
    if (removeCustomerButton) {
        removeCustomerButton.addEventListener('click', () => {
            selectedCustomer = null;
            document.getElementById('customerSearchInput').value = '';
            document.getElementById('selectedCustomerInfo').classList.add('hidden');
            updateFinalizeSaleButton();
        });
    }
    
    // Limpar carrinho
    const clearCartButton = document.getElementById('clearCartButton');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }
    
    // Cancelar venda
    const cancelButton = document.getElementById('cancelSaleButton');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (saleCart.length > 0 || selectedCustomer) {
                showCustomConfirm(
                    'Tem certeza que deseja cancelar esta venda? Todos os dados serão perdidos.',
                    () => {
                        clearCart();
                        selectedCustomer = null;
                        document.getElementById('customerSearchInput').value = '';
                        document.getElementById('selectedCustomerInfo').classList.add('hidden');
                        showTemporaryAlert('Venda cancelada', 'info');
                    }
                );
            } else {
                showTemporaryAlert('Nenhuma venda para cancelar', 'info');
            }
        });
    }
    
    // Finalizar venda
    const finalizeButton = document.getElementById('finalizeSaleButton');
    if (finalizeButton) {
        finalizeButton.addEventListener('click', () => finalizeSaleWithCustomer(currentUser));
    }
}

function renderCustomerSuggestions(suggestions) {
    const container = document.getElementById('customerSuggestions');
    if (!container) return;
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="customer-suggestion-item">
                <div class="text-slate-400 text-sm">Nenhum cliente encontrado</div>
            </div>
        `;
    } else {
        container.innerHTML = suggestions.map(customer => `
            <div class="customer-suggestion-item" onclick="selectCustomer('${customer.id}')">
                <div class="customer-suggestion-name">${customer.name}</div>
                <div class="customer-suggestion-info">
                    ${customer.phone} ${customer.email ? '• ' + customer.email : ''}
                </div>
            </div>
        `).join('');
    }
    
    container.classList.remove('hidden');
}

async function selectCustomer(customerId) {
    try {
        const customer = await CRMService.getCustomerById(customerId);
        if (customer) {
            selectedCustomer = customer;
            
            // Atualizar UI
            document.getElementById('customerSearchInput').value = customer.name;
            document.getElementById('customerSuggestions').classList.add('hidden');
            document.getElementById('selectedCustomerName').textContent = customer.name;
            document.getElementById('selectedCustomerPhone').textContent = customer.phone;
            
            // Mostrar estatísticas se disponíveis
            const stats = customer.totalPurchases > 0 ? 
                `${customer.totalPurchases} compras • Total: ${formatCurrency(customer.totalSpent)}` :
                'Novo cliente';
            document.getElementById('selectedCustomerStats').textContent = stats;
            
            document.getElementById('selectedCustomerInfo').classList.remove('hidden');
            
            updateFinalizeSaleButton();
        }
    } catch (error) {
        console.error("❌ Erro ao selecionar cliente:", error);
        showTemporaryAlert("Erro ao carregar dados do cliente", "error");
    }
}

function showNewCustomerModal() {
    const modal = document.createElement('div');
    modal.className = 'customer-modal';
    modal.innerHTML = `
        <div class="customer-modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Novo Cliente</h3>
                <button class="modal-close" onclick="this.closest('.customer-modal').remove()">
                    &times;
                </button>
            </div>
            
            <form id="newCustomerForm" class="modal-body">
                <div class="form-group">
                    <label for="customerName" class="form-label">Nome *</label>
                    <input type="text" 
                           id="customerName" 
                           class="form-input" 
                           placeholder="Nome completo"
                           required>
                </div>
                
                <div class="form-group">
                    <label for="customerPhone" class="form-label">Telefone *</label>
                    <input type="tel" 
                           id="customerPhone" 
                           class="form-input" 
                           placeholder="(00) 00000-0000"
                           required>
                </div>
                
                <div class="form-group">
                    <label for="customerEmail" class="form-label">Email</label>
                    <input type="email" 
                           id="customerEmail" 
                           class="form-input" 
                           placeholder="email@exemplo.com">
                </div>
                
                <div class="form-group">
                    <label for="customerCPF" class="form-label">CPF</label>
                    <input type="text" 
                           id="customerCPF" 
                           class="form-input" 
                           placeholder="000.000.000-00">
                </div>
                
                <div class="form-group">
                    <label for="customerAddress" class="form-label">Endereço</label>
                    <textarea id="customerAddress" 
                              class="form-input" 
                              rows="2"
                              placeholder="Endereço completo"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="customerBirthdate" class="form-label">Data de Nascimento</label>
                    <input type="date" 
                           id="customerBirthdate" 
                           class="form-input">
                </div>
            </form>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.customer-modal').remove()">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="saveNewCustomer()">
                    <i class="fas fa-save mr-2"></i>
                    Salvar Cliente
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focar no primeiro campo
    setTimeout(() => document.getElementById('customerName').focus(), 100);
    
    // Máscara de telefone
    const phoneInput = document.getElementById('customerPhone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.substring(0, 11);
        
        if (value.length > 6) {
            value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
        } else if (value.length > 2) {
            value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
        }
        
        e.target.value = value;
    });
    
    // Máscara de CPF
    const cpfInput = document.getElementById('customerCPF');
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.substring(0, 11);
        
        if (value.length > 9) {
            value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6, 9)}-${value.substring(9)}`;
        } else if (value.length > 6) {
            value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6)}`;
        } else if (value.length > 3) {
            value = `${value.substring(0, 3)}.${value.substring(3)}`;
        }
        
        e.target.value = value;
    });
}

async function saveNewCustomer() {
    const form = document.getElementById('newCustomerForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const customerData = {
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.replace(/\D/g, ''),
        email: document.getElementById('customerEmail').value.trim(),
        cpf: document.getElementById('customerCPF').value.replace(/\D/g, ''),
        address: document.getElementById('customerAddress').value.trim(),
        birthdate: document.getElementById('customerBirthdate').value
    };
    
    try {
        const newCustomer = await CRMService.createOrUpdateCustomer(customerData);
        
        // Selecionar o novo cliente
        await selectCustomer(newCustomer.id);
        
        // Fechar modal
        document.querySelector('.customer-modal').remove();
        
        showTemporaryAlert('Cliente cadastrado com sucesso!', 'success');
        
    } catch (error) {
        console.error("❌ Erro ao criar cliente:", error);
        showTemporaryAlert('Erro ao cadastrar cliente. Verifique os dados.', 'error');
    }
}

window.selectCustomer = selectCustomer;
window.saveNewCustomer = saveNewCustomer;

async function finalizeSaleWithCustomer(currentUser) {
    if (saleCart.length === 0) {
        showTemporaryAlert('Adicione produtos à venda primeiro', 'warning');
        return;
    }
    
    const finalizeButton = document.getElementById('finalizeSaleButton');
    const originalText = finalizeButton.textContent;
    
    // Desabilitar botão e mostrar loading
    finalizeButton.disabled = true;
    finalizeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
    
    try {
        // Validar estoque
        for (const item of saleCart) {
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
            date: new Date().toISOString(),
            dateString: new Date().toISOString().split('T')[0]
        };
        
        const productsDetail = saleCart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price
        }));
        
        const sellerName = currentUser.name || currentUser.email;
        
        // Registrar venda com cliente
        const newSale = await DataService.addSale(saleData, productsDetail, sellerName, selectedCustomer);
        
        // Limpar carrinho e cliente
        saleCart = [];
        selectedCustomer = null;
        updateSaleInterface();
        document.getElementById('customerSearchInput').value = '';
        document.getElementById('selectedCustomerInfo').classList.add('hidden');
        
        // Recarregar produtos
        availableProducts = await DataService.getProducts();
        renderAvailableProducts(availableProducts);
        
        // Mostrar sucesso
        showSaleSuccessModal(newSale);
        
        console.log("✅ Venda finalizada com sucesso:", newSale);
        
    } catch (error) {
        console.error("❌ Erro ao finalizar venda:", error);
        showTemporaryAlert(`Erro ao finalizar venda: ${error.message}`, 'error');
    } finally {
        // Restaurar botão
        finalizeButton.disabled = false;
        finalizeButton.innerHTML = originalText;
    }
}

function updateFinalizeSaleButton() {
    const button = document.getElementById('finalizeSaleButton');
    if (!button) return;
    
    // Habilitar apenas se houver produtos no carrinho
    // Cliente é opcional agora
    button.disabled = saleCart.length === 0;
}

// === MINHAS VENDAS (VENDEDOR) ===

function renderSalesList(sales, container, userRole, isPersonal = false) {
    console.log(`💰 Renderizando ${isPersonal ? 'minhas vendas' : 'lista de vendas'}:`, sales.length);
    
    container.innerHTML = '';
    
    // Título
    const title = document.createElement('h2');
    title.className = 'text-xl font-semibold text-slate-100 mb-4';
    title.textContent = isPersonal ? 'Minhas Vendas' : 'Histórico de Vendas';
    container.appendChild(title);
    
    // Verificar se há vendas
    if (!sales || sales.length === 0) {
        const noSalesMsg = document.createElement('div');
        noSalesMsg.className = 'text-center py-8 text-slate-400';
        noSalesMsg.innerHTML = `
            <i class="fas fa-receipt fa-3x mb-4"></i>
            <p>${isPersonal ? 'Você ainda não realizou nenhuma venda.' : 'Nenhuma venda encontrada.'}</p>
            ${isPersonal ? '<p class="text-sm mt-2">Comece registrando sua primeira venda!</p>' : ''}
        `;
        container.appendChild(noSalesMsg);
        return;
    }
    
    // Tabela de vendas
    const table = createSalesTable(sales, isPersonal);
    container.appendChild(table);
}

function createSalesTable(sales, isPersonal = false) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden';
    
    // Cabeçalho
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-700';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Data</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Produtos</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total</th>
            ${!isPersonal ? '<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vendedor</th>' : ''}
        </tr>
    `;
    table.appendChild(thead);
    
    // Corpo da tabela
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-slate-700';
    
    sales.forEach(sale => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-750 transition-colors duration-150';
        
        const productNames = sale.productsDetail && Array.isArray(sale.productsDetail) && sale.productsDetail.length > 0
            ? sale.productsDetail.map(p => `${p.name} (x${p.quantity})`).join(', ')
            : 'N/A';
        
        const customerInfo = sale.customerName || 'Cliente não identificado';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(sale.date)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-200">${customerInfo}</td>
            <td class="px-6 py-4 text-sm text-slate-200" title="${productNames}">${truncateText(productNames, 50)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-semibold">${formatCurrency(sale.total)}</td>
            ${!isPersonal ? `<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${sale.sellerName || 'N/A'}</td>` : ''}
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    return table;
}

// === SEÇÃO DE CLIENTES ===

async function renderCustomersSection(container, currentUser) {
    console.log("👥 Renderizando seção de clientes");
    
    // Apenas admin pode acessar
    if (currentUser.role !== 'Dono/Gerente') {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-lock fa-3x mb-4"></i>
                <p>Acesso restrito ao administrador.</p>
            </div>
        `;
        return;
    }
    
    try {
        // Carregar dados
        const [customers, insights] = await Promise.all([
            CRMService.getCustomers(),
            CRMService.getCustomerInsights()
        ]);
        
        container.innerHTML = `
            <div class="customers-container">
                <div class="customers-header mb-6">
                    <h2 class="text-xl font-semibold text-slate-100">Gerenciamento de Clientes</h2>
                    <p class="text-slate-400 mt-1">Sistema CRM com IA para relacionamento e vendas</p>
                </div>
                
                <!-- KPIs de Clientes -->
                <div class="customers-kpis grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-users kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Total de Clientes</div>
                            <div class="kpi-value">${insights.totalCustomers}</div>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-star kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Clientes VIP</div>
                            <div class="kpi-value">${insights.segmentation.vip}</div>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-exclamation-triangle kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Inativos (+30 dias)</div>
                            <div class="kpi-value text-warning">${insights.segmentation.inativos}</div>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon-wrapper">
                            <i class="fas fa-dollar-sign kpi-icon"></i>
                        </div>
                        <div class="kpi-content">
                            <div class="kpi-title">Receita Total</div>
                            <div class="kpi-value">${formatCurrency(insights.totalRevenue)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Filtros e Ações -->
                <div class="customers-filters bg-slate-800 p-4 rounded-lg mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="relative">
                            <input type="text" 
                                   id="customerFilterSearch" 
                                   class="form-input pl-10" 
                                   placeholder="Buscar cliente...">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                        
                        <select id="customerFilterStatus" class="form-select">
                            <option value="">Todos os status</option>
                            <option value="active">Ativos</option>
                            <option value="inactive">Inativos (+30 dias)</option>
                            <option value="vip">VIP</option>
                        </select>
                        
                        <button id="generatePromotionsButton" class="btn-primary">
                            <i class="fas fa-magic mr-2"></i>
                            Gerar Promoções com IA
                        </button>
                    </div>
                </div>
                
                <!-- Lista de Clientes -->
                <div id="customersList" class="customers-grid">
                    ${renderCustomerCards(customers)}
                </div>
            </div>
        `;
        
        // Aplicar estilos
        addCustomersStyles();
        
        // Event listeners
        setupCustomersEventListeners(customers);
        
    } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-times-circle fa-3x mb-4"></i>
                <p>Erro ao carregar dados dos clientes.</p>
            </div>
        `;
    }
}

function renderCustomerCards(customers) {
    if (customers.length === 0) {
        return `
            <div class="text-center py-8 text-slate-400 col-span-full">
                <i class="fas fa-users fa-3x mb-4"></i>
                <p>Nenhum cliente cadastrado.</p>
            </div>
        `;
    }
    
    return customers.map(customer => {
        const daysSinceLastPurchase = customer.lastPurchaseDate ? 
            Math.floor((new Date() - customer.lastPurchaseDate.toDate()) / (1000 * 60 * 60 * 24)) : null;
        
        const isInactive = daysSinceLastPurchase && daysSinceLastPurchase > 30;
        const isVIP = customer.totalPurchases >= 10;
        
        return `
            <div class="customer-card ${isInactive ? 'inactive' : ''}" data-customer-id="${customer.id}">
                <div class="customer-card-header">
                    <div class="customer-avatar">
                        ${customer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="customer-info">
                        <h3 class="customer-name">${customer.name}</h3>
                        <p class="customer-phone">${customer.phone}</p>
                    </div>
                    ${isVIP ? '<span class="vip-badge">VIP</span>' : ''}
                    ${isInactive ? '<span class="inactive-badge">Inativo</span>' : ''}
                </div>
                
                <div class="customer-stats">
                    <div class="stat-item">
                        <span class="stat-label">Compras:</span>
                        <span class="stat-value">${customer.totalPurchases || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${formatCurrency(customer.totalSpent || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Ticket Médio:</span>
                        <span class="stat-value">${formatCurrency(customer.averageTicket || 0)}</span>
                    </div>
                </div>
                
                ${daysSinceLastPurchase ? `
                    <div class="last-purchase">
                        <i class="fas fa-clock mr-1"></i>
                        Última compra: ${daysSinceLastPurchase} dias atrás
                    </div>
                ` : ''}
                
                <div class="customer-actions">
                    <button class="btn-secondary btn-sm" onclick="viewCustomerHistory('${customer.id}')">
                        <i class="fas fa-history mr-1"></i>
                        Histórico
                    </button>
                    ${isInactive ? `
                        <button class="btn-primary btn-sm" onclick="generateCustomerPromotion('${customer.id}')">
                            <i class="fas fa-gift mr-1"></i>
                            Promoção IA
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function addCustomersStyles() {
    if (!document.getElementById('customersStyles')) {
        const style = document.createElement('style');
        style.id = 'customersStyles';
        style.textContent = `
            .customers-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 1.5rem;
            }
            
            .customer-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                transition: all 0.3s ease;
            }
            
            .customer-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
                border-color: rgba(56, 189, 248, 0.5);
            }
            
            .customer-card.inactive {
                border-color: rgba(245, 158, 11, 0.5);
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(45, 35, 20, 0.9) 100%);
            }
            
            .customer-card-header {
                display: flex;
                align-items: center;
                margin-bottom: 1rem;
                position: relative;
            }
            
            .customer-avatar {
                width: 3rem;
                height: 3rem;
                background: linear-gradient(135deg, #38BDF8 0%, #6366F1 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                margin-right: 1rem;
            }
            
            .customer-info {
                flex: 1;
            }
            
            .customer-name {
                font-weight: 600;
                color: #F1F5F9;
                margin-bottom: 0.25rem;
            }
            
            .customer-phone {
                font-size: 0.875rem;
                color: #94A3B8;
            }
            
            .vip-badge, .inactive-badge {
                position: absolute;
                top: 0;
                right: 0;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .vip-badge {
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                color: #1F2937;
            }
            
            .inactive-badge {
                background: rgba(245, 158, 11, 0.2);
                color: #F59E0B;
                border: 1px solid rgba(245, 158, 11, 0.5);
            }
            
            .customer-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .stat-item {
                text-align: center;
                padding: 0.5rem;
                background: rgba(51, 65, 85, 0.3);
                border-radius: 0.5rem;
            }
            
            .stat-label {
                display: block;
                font-size: 0.75rem;
                color: #94A3B8;
                margin-bottom: 0.25rem;
            }
            
            .stat-value {
                display: block;
                font-weight: 600;
                color: #F1F5F9;
            }
            
            .last-purchase {
                font-size: 0.875rem;
                color: #94A3B8;
                margin-bottom: 1rem;
                padding: 0.5rem;
                background: rgba(51, 65, 85, 0.3);
                border-radius: 0.5rem;
                text-align: center;
            }
            
            .customer-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .customer-actions button {
                flex: 1;
            }
            
            @media (max-width: 768px) {
                .customers-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

async function viewCustomerHistory(customerId) {
    try {
        const [customer, history, preferences] = await Promise.all([
            CRMService.getCustomerById(customerId),
            CRMService.getCustomerPurchaseHistory(customerId),
            CRMService.analyzeCustomerPreferences(customerId)
        ]);
        
        showCustomerHistoryModal(customer, history, preferences);
        
    } catch (error) {
        console.error("❌ Erro ao carregar histórico do cliente:", error);
        showTemporaryAlert("Erro ao carregar histórico", "error");
    }
}

function showCustomerHistoryModal(customer, history, preferences) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop show';
    modal.id = 'customerHistoryModal';
    
    modal.innerHTML = `
        <div class="modal-content show" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3 class="modal-title">Histórico do Cliente</h3>
                <button class="modal-close" onclick="document.getElementById('customerHistoryModal').remove()">
                    &times;
                </button>
            </div>
            
            <div class="modal-body">
                <!-- Informações do Cliente -->
                <div class="customer-detail-header">
                    <div class="customer-avatar-large">
                        ${customer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="customer-detail-info">
                        <h2 class="text-xl font-semibold text-slate-100">${customer.name}</h2>
                        <p class="text-slate-400">${customer.phone} ${customer.email ? '• ' + customer.email : ''}</p>
                        <p class="text-sm text-slate-500 mt-1">
                            Cliente desde: ${formatDate(customer.createdAt)}
                        </p>
                    </div>
                </div>
                
                <!-- Estatísticas -->
                <div class="customer-detail-stats">
                    <div class="detail-stat-card">
                        <i class="fas fa-shopping-bag text-2xl text-sky-400 mb-2"></i>
                        <div class="text-2xl font-bold text-slate-100">${customer.totalPurchases || 0}</div>
                        <div class="text-sm text-slate-400">Compras</div>
                    </div>
                    <div class="detail-stat-card">
                        <i class="fas fa-dollar-sign text-2xl text-green-400 mb-2"></i>
                        <div class="text-2xl font-bold text-slate-100">${formatCurrency(customer.totalSpent || 0)}</div>
                        <div class="text-sm text-slate-400">Total Gasto</div>
                    </div>
                    <div class="detail-stat-card">
                        <i class="fas fa-receipt text-2xl text-purple-400 mb-2"></i>
                        <div class="text-2xl font-bold text-slate-100">${formatCurrency(customer.averageTicket || 0)}</div>
                        <div class="text-sm text-slate-400">Ticket Médio</div>
                    </div>
                    <div class="detail-stat-card">
                        <i class="fas fa-calendar text-2xl text-yellow-400 mb-2"></i>
                        <div class="text-2xl font-bold text-slate-100">
                            ${preferences.purchasePatterns.averageDaysBetweenPurchases || 'N/A'}
                        </div>
                        <div class="text-sm text-slate-400">Dias entre Compras</div>
                    </div>
                </div>
                
                <!-- Preferências -->
                <div class="customer-preferences">
                    <h3 class="text-lg font-semibold text-slate-100 mb-3">
                        <i class="fas fa-heart mr-2"></i>
                        Preferências e Insights
                    </h3>
                    
                    <div class="preferences-grid">
                        <div class="preference-section">
                            <h4 class="text-sm font-medium text-slate-300 mb-2">Categorias Favoritas</h4>
                            ${preferences.favoriteCategories.map(cat => `
                                <div class="preference-item">
                                    <span class="preference-name">${cat.name}</span>
                                    <span class="preference-value">${cat.purchases} compras</span>
                                </div>
                            `).join('') || '<p class="text-slate-500">Nenhuma categoria identificada</p>'}
                        </div>
                        
                        <div class="preference-section">
                            <h4 class="text-sm font-medium text-slate-300 mb-2">Produtos Mais Comprados</h4>
                            ${preferences.favoriteProducts.slice(0, 3).map(prod => `
                                <div class="preference-item">
                                    <span class="preference-name">${prod.name}</span>
                                    <span class="preference-value">${prod.quantity} unidades</span>
                                </div>
                            `).join('') || '<p class="text-slate-500">Nenhum produto identificado</p>'}
                        </div>
                    </div>
                </div>
                
                <!-- Histórico de Compras -->
                <div class="purchase-history">
                    <h3 class="text-lg font-semibold text-slate-100 mb-3">
                        <i class="fas fa-history mr-2"></i>
                        Histórico de Compras
                    </h3>
                    
                    ${history.length > 0 ? `
                        <div class="history-list">
                            ${history.slice(0, 10).map(sale => `
                                <div class="history-item">
                                    <div class="history-date">
                                        <i class="fas fa-calendar-alt mr-2"></i>
                                        ${formatDate(sale.date)}
                                    </div>
                                    <div class="history-products">
                                        ${sale.productsDetail.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                                    </div>
                                    <div class="history-total">
                                        ${formatCurrency(sale.total)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-slate-500 text-center">Nenhuma compra registrada</p>'}
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="document.getElementById('customerHistoryModal').remove()">
                    Fechar
                </button>
                ${customer.totalPurchases > 0 ? `
                    <button class="btn-primary" onclick="generateCustomerPromotion('${customer.id}')">
                        <i class="fas fa-magic mr-2"></i>
                        Gerar Promoção com IA
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Estilos do modal
    addCustomerHistoryStyles();
}

function addCustomerHistoryStyles() {
    if (!document.getElementById('customerHistoryStyles')) {
        const style = document.createElement('style');
        style.id = 'customerHistoryStyles';
        style.textContent = `
            .customer-detail-header {
                display: flex;
                align-items: center;
                padding: 1.5rem;
                background: rgba(51, 65, 85, 0.3);
                border-radius: 0.75rem;
                margin-bottom: 1.5rem;
            }
            
            .customer-avatar-large {
                width: 5rem;
                height: 5rem;
                background: linear-gradient(135deg, #38BDF8 0%, #6366F1 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
                font-weight: 600;
                margin-right: 1.5rem;
            }
            
            .customer-detail-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            
            .detail-stat-card {
                background: rgba(51, 65, 85, 0.3);
                padding: 1.5rem;
                border-radius: 0.75rem;
                text-align: center;
                border: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .customer-preferences {
                margin-bottom: 1.5rem;
            }
            
            .preferences-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
            }
            
            .preference-section {
                background: rgba(51, 65, 85, 0.3);
                padding: 1rem;
                border-radius: 0.5rem;
            }
            
            .preference-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .preference-item:last-child {
                border-bottom: none;
            }
            
            .preference-name {
                color: #F1F5F9;
                font-size: 0.875rem;
            }
            
            .preference-value {
                color: #94A3B8;
                font-size: 0.875rem;
            }
            
            .history-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .history-item {
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 1rem;
                padding: 0.75rem;
                background: rgba(51, 65, 85, 0.3);
                border-radius: 0.5rem;
                margin-bottom: 0.5rem;
                align-items: center;
            }
            
            .history-date {
                color: #94A3B8;
                font-size: 0.875rem;
                white-space: nowrap;
            }
            
            .history-products {
                color: #F1F5F9;
                font-size: 0.875rem;
            }
            
            .history-total {
                color: #38BDF8;
                font-weight: 600;
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }
}

async function generateCustomerPromotion(customerId) {
    try {
        showTemporaryAlert("Gerando promoção personalizada com IA...", "info", 3000);
        
        const [customer, preferences] = await Promise.all([
            CRMService.getCustomerById(customerId),
            CRMService.analyzeCustomerPreferences(customerId)
        ]);
        
        const promotion = await CRMService.generatePromotionalMessage(customer, preferences);
        
        showPromotionModal(promotion);
        
    } catch (error) {
        console.error("❌ Erro ao gerar promoção:", error);
        showTemporaryAlert("Erro ao gerar promoção", "error");
    }
}

function showPromotionModal(promotion) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop show';
    modal.id = 'promotionModal';
    
    modal.innerHTML = `
        <div class="modal-content show" style="max-width: 600px;">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-magic mr-2 text-purple-400"></i>
                    Promoção Gerada com IA
                </h3>
                <button class="modal-close" onclick="document.getElementById('promotionModal').remove()">
                    &times;
                </button>
            </div>
            
            <div class="modal-body">
                <div class="promotion-info">
                    <div class="promotion-meta">
                        <span class="meta-item">
                            <i class="fas fa-user mr-1"></i>
                            ${promotion.customerName}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-tag mr-1"></i>
                            ${promotion.type}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar mr-1"></i>
                            Válida até ${formatDate(promotion.validUntil)}
                        </span>
                    </div>
                    
                    <div class="promotion-message">
                        <h4 class="text-sm font-medium text-slate-300 mb-2">Mensagem Personalizada:</h4>
                        <div class="message-content">
                            ${promotion.message.split('\n').map(line => `<p>${line}</p>`).join('')}
                        </div>
                    </div>
                    
                    ${promotion.recommendations.length > 0 ? `
                        <div class="promotion-products">
                            <h4 class="text-sm font-medium text-slate-300 mb-2">Produtos Recomendados:</h4>
                            <div class="recommended-products">
                                ${promotion.recommendations.map(product => `
                                    <div class="recommended-product">
                                        <span class="product-name">${product.name}</span>
                                        <span class="product-price">${formatCurrency(product.price)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="document.getElementById('promotionModal').remove()">
                    Fechar
                </button>
                <button class="btn-primary" onclick="copyPromotionMessage()">
                    <i class="fas fa-copy mr-2"></i>
                    Copiar Mensagem
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar estilos
    addPromotionStyles();
}

function addPromotionStyles() {
    if (!document.getElementById('promotionStyles')) {
        const style = document.createElement('style');
        style.id = 'promotionStyles';
        style.textContent = `
            .promotion-meta {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: rgba(99, 102, 241, 0.1);
                border-radius: 0.5rem;
                border: 1px solid rgba(99, 102, 241, 0.3);
            }
            
            .meta-item {
                font-size: 0.875rem;
                color: #A78BFA;
            }
            
            .promotion-message {
                margin-bottom: 1.5rem;
            }
            
            .message-content {
                background: rgba(51, 65, 85, 0.3);
                padding: 1rem;
                border-radius: 0.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                white-space: pre-wrap;
                color: #F1F5F9;
                font-size: 0.875rem;
                line-height: 1.6;
            }
            
            .message-content p {
                margin-bottom: 0.5rem;
            }
            
            .message-content p:last-child {
                margin-bottom: 0;
            }
            
            .recommended-products {
                display: grid;
                gap: 0.5rem;
            }
            
            .recommended-product {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem;
                background: rgba(51, 65, 85, 0.3);
                border-radius: 0.5rem;
            }
            
            .product-name {
                color: #F1F5F9;
                font-size: 0.875rem;
            }
            
            .product-price {
                color: #38BDF8;
                font-weight: 600;
                font-size: 0.875rem;
            }
        `;
        document.head.appendChild(style);
    }
}

function copyPromotionMessage() {
    const messageContent = document.querySelector('.message-content');
    if (messageContent) {
        const text = messageContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            showTemporaryAlert("Mensagem copiada para a área de transferência!", "success");
        }).catch(() => {
            showTemporaryAlert("Erro ao copiar mensagem", "error");
        });
    }
}

window.viewCustomerHistory = viewCustomerHistory;
window.generateCustomerPromotion = generateCustomerPromotion;
window.copyPromotionMessage = copyPromotionMessage;

// === FUNÇÕES AUXILIARES MELHORADAS ===

function showSaleSuccessModal(sale) {
    const total = sale.productsDetail.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    const modalHtml = `
        <div class="modal-backdrop show" id="saleSuccessModal">
            <div class="modal-content show" style="max-width: 500px;">
                <div class="modal-header">
                    <i class="fas fa-check-circle text-green-500 text-2xl mr-3"></i>
                    <h3 class="modal-title">Venda Realizada com Sucesso!</h3>
                </div>
                
                <div class="modal-body">
                    <div class="success-details">
                        <div class="detail-row">
                            <span class="detail-label">Total da Venda:</span>
                            <span class="detail-value text-green-500 font-bold text-xl">${formatCurrency(total)}</span>
                        </div>
                        
                        ${sale.customerName ? `
                            <div class="detail-row">
                                <span class="detail-label">Cliente:</span>
                                <span class="detail-value">${sale.customerName}</span>
                            </div>
                        ` : ''}
                        
                        <div class="detail-row">
                            <span class="detail-label">Data:</span>
                            <span class="detail-value">${formatDate(new Date())}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Produtos:</span>
                            <span class="detail-value">${sale.productsDetail.length} item(s)</span>
                        </div>
                        
                        <div class="products-sold">
                            <h4 class="text-sm font-semibold text-slate-300 mb-2">Itens Vendidos:</h4>
                            <div class="sold-items">
                                ${sale.productsDetail.map(item => `
                                    <div class="sold-item">
                                        <span>${item.name}</span>
                                        <span>${item.quantity}x ${formatCurrency(item.unitPrice)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeSaleSuccessModal(); window.print();">
                        <i class="fas fa-print mr-2"></i>
                        Imprimir
                    </button>
                    <button class="btn-primary" onclick="closeSaleSuccessModal()">
                        <i class="fas fa-thumbs-up mr-2"></i>
                        Perfeito!
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar estilos específicos do modal de sucesso
    if (!document.getElementById('saleSuccessStyles')) {
        const style = document.createElement('style');
        style.id = 'saleSuccessStyles';
        style.textContent = `
            .success-details {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 0.5rem;
                padding: 1rem;
                margin-bottom: 1rem;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            
            .detail-label {
                color: #94A3B8;
                font-size: 0.875rem;
            }
            
            .detail-value {
                color: #F1F5F9;
                font-weight: 500;
            }
            
            .products-sold {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .sold-item {
                display: flex;
                justify-content: space-between;
                padding: 0.25rem 0;
                font-size: 0.875rem;
                color: #94A3B8;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// === FUNÇÕES GLOBAIS RESTANTES ===

// Manter todas as funções globais necessárias
window.toggleProductSelection = toggleProductSelection;
window.changeQuantity = changeQuantity;
window.updateQuantity = updateQuantity;
window.removeCartItem = removeCartItem;
window.closeSaleSuccessModal = closeSaleSuccessModal;
window.handleEditProduct = handleEditProduct;
window.handleDeleteProductConfirmation = handleDeleteProductConfirmation;
window.openProductModal = openProductModal;

// === FUNÇÕES DE MODAL DE PRODUTOS ===

function setupModalEventListeners() {
    console.log("🔧 Configurando event listeners do modal de produto");
    
    if (closeProductModalButton) {
        closeProductModalButton.addEventListener('click', handleModalClose);
    }
    
    if (cancelProductFormButton) {
        cancelProductFormButton.addEventListener('click', handleModalClose);
    }
    
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }
    
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal && !isModalProcessing) {
                handleModalClose();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && productModal && !productModal.classList.contains('hidden') && !isModalProcessing) {
            handleModalClose();
        }
    });
}

function handleModalClose() {
    if (isModalProcessing) {
        console.log("⚠️ Modal está processando, cancelamento bloqueado");
        return;
    }
    
    console.log("❌ Fechando modal de produto");
    
    try {
        if (productForm) productForm.reset();
        
        if (productIdField) productIdField.value = '';
        if (productNameField) productNameField.value = '';
        if (productCategoryField) productCategoryField.value = '';
        if (productPriceField) productPriceField.value = '';
        if (productStockField) productStockField.value = '';
        if (productLowStockAlertField) productLowStockAlertField.value = '';
        
        if (saveProductButton) {
            saveProductButton.disabled = false;
            saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }
        
        if (productModal) {
            productModal.classList.add('hidden');
        }
        
        console.log("✅ Modal fechado com sucesso");
        
    } catch (error) {
        console.error("❌ Erro ao fechar modal:", error);
        if (productModal) {
            productModal.classList.add('hidden');
        }
    }
}

function openProductModal(product = null) {
    if (!productModal) {
        console.error("❌ Modal de produto não encontrado");
        return;
    }
    
    if (isModalProcessing) {
        console.log("⚠️ Modal já está sendo processado");
        return;
    }
    
    console.log("📝 Abrindo modal de produto:", product ? 'Editar' : 'Novo');
    
    if (productForm) productForm.reset();
    
    if (product) {
        if (productModalTitle) productModalTitle.textContent = 'Editar Produto';
        if (productIdField) productIdField.value = product.id;
        if (productNameField) productNameField.value = product.name;
        if (productCategoryField) productCategoryField.value = product.category;
        if (productPriceField) productPriceField.value = product.price;
        if (productStockField) productStockField.value = product.stock;
        if (productLowStockAlertField) productLowStockAlertField.value = product.lowStockAlert || 10;
    } else {
        if (productModalTitle) productModalTitle.textContent = 'Adicionar Novo Produto';
        if (productIdField) productIdField.value = '';
        if (productLowStockAlertField) productLowStockAlertField.value = 10;
    }
    
    productModal.classList.remove('hidden');
    
    if (productNameField) {
        setTimeout(() => productNameField.focus(), 100);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    
    if (isModalProcessing) {
        console.log("⚠️ Formulário já está sendo processado");
        return;
    }
    
    console.log("💾 Salvando produto...");
    
    if (!validateProductForm()) {
        return;
    }
    
    isModalProcessing = true;
    
    const id = productIdField?.value;
    
    const productData = {
        name: productNameField.value.trim(),
        category: productCategoryField.value.trim(),
        price: parseFloat(productPriceField.value),
        stock: parseInt(productStockField.value),
        lowStockAlert: parseInt(productLowStockAlertField?.value || 10)
    };
    
    if (saveProductButton) {
        saveProductButton.disabled = true;
        saveProductButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
    }
    
    try {
        if (id) {
            await DataService.updateProduct(id, productData);
            showTemporaryAlert('Produto atualizado com sucesso!', 'success');
        } else {
            await DataService.addProduct(productData);
            showTemporaryAlert('Produto adicionado com sucesso!', 'success');
        }
        
        handleModalClose();
        await reloadProductsIfNeeded();
        
    } catch (error) {
        console.error("❌ Erro ao salvar produto:", error);
        showTemporaryAlert('Erro ao salvar produto. Tente novamente.', 'error');
    } finally {
        isModalProcessing = false;
        
        if (saveProductButton) {
            saveProductButton.disabled = false;
            saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }
    }
}

function validateProductForm() {
    if (!productNameField || !productCategoryField || !productPriceField || !productStockField || !productLowStockAlertField) {
        showTemporaryAlert("Erro: Campos do formulário não encontrados.", "error");
        return false;
    }
    
    const name = productNameField.value.trim();
    const category = productCategoryField.value.trim();
    const price = parseFloat(productPriceField.value);
    const stock = parseInt(productStockField.value);
    const lowStockAlert = parseInt(productLowStockAlertField.value);
    
    if (!name) {
        showTemporaryAlert("Nome do produto é obrigatório.", "warning");
        productNameField.focus();
        return false;
    }
    
    if (!category) {
        showTemporaryAlert("Categoria é obrigatória.", "warning");
        productCategoryField.focus();
        return false;
    }
    
    if (isNaN(price) || price < 0) {
        showTemporaryAlert("Preço deve ser um número válido e não negativo.", "warning");
        productPriceField.focus();
        return false;
    }
    
    if (isNaN(stock) || stock < 0) {
        showTemporaryAlert("Estoque deve ser um número válido e não negativo.", "warning");
        productStockField.focus();
        return false;
    }
    
    if (isNaN(lowStockAlert) || lowStockAlert < 1) {
        showTemporaryAlert("Alerta de estoque baixo deve ser um número válido maior que 0.", "warning");
        productLowStockAlertField.focus();
        return false;
    }
    
    if (lowStockAlert > stock && stock > 0) {
        showTemporaryAlert("O alerta de estoque baixo não deve ser maior que o estoque atual.", "warning");
        productLowStockAlertField.focus();
        return false;
    }
    
    return true;
}

async function reloadProductsIfNeeded() {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        const userRole = localStorage.getItem('elitecontrol_user_role');
        const currentSection = window.location.hash.substring(1);
        const productSection = (userRole === 'Vendedor' ? 'produtos-consulta' : 'produtos');
        
        if (currentSection === productSection) {
            await loadSectionContent(productSection, {
                uid: currentUser.uid,
                email: currentUser.email,
                role: userRole
            });
        }
    }
}

// === FUNÇÕES DE PRODUTOS (ADMIN/ESTOQUE) ===

function renderProductsList(products, container, userRole) {
    console.log("📦 Renderizando lista de produtos:", products.length);
    
    container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.className = 'text-xl font-semibold text-slate-100 mb-4';
    title.textContent = 'Lista de Produtos';
    container.appendChild(title);
    
    if (userRole === 'Controlador de Estoque' || userRole === 'Dono/Gerente') {
        const addButton = document.createElement('button');
        addButton.id = 'openAddProductModalButton';
        addButton.className = 'btn-primary mb-4 inline-flex items-center';
        addButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Novo Produto';
        container.appendChild(addButton);
    }
    
    if (!products || products.length === 0) {
        const noProductsMsg = document.createElement('div');
        noProductsMsg.className = 'text-center py-8 text-slate-400';
        noProductsMsg.innerHTML = `
            <i class="fas fa-box-open fa-3x mb-4"></i>
            <p>Nenhum produto encontrado.</p>
        `;
        container.appendChild(noProductsMsg);
        return;
    }
    
    const table = createProductsTable(products, userRole);
    container.appendChild(table);
}

function createProductsTable(products, userRole) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden';
    
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-700';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nome</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Categoria</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Preço</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estoque</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Alerta</th>
            ${(userRole === 'Controlador de Estoque' || userRole === 'Dono/Gerente') ? 
                '<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>' : ''}
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-slate-700';
    
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-750 transition-colors duration-150';
        
        let actionsHtml = '';
        if (userRole === 'Controlador de Estoque' || userRole === 'Dono/Gerente') {
            actionsHtml = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <button class="text-sky-400 hover:text-sky-300 mr-2 edit-product-btn" 
                            data-product-id="${product.id}" 
                            title="Editar produto">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-400 delete-product-btn" 
                            data-product-id="${product.id}" 
                            data-product-name="${product.name}"
                            title="Excluir produto">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        }
        
        const lowStockThreshold = Number(product.lowStockAlert) || 10;
        const currentStock = Number(product.stock);
        const stockClass = currentStock <= lowStockThreshold ? 'text-red-400 font-semibold' : 'text-slate-300';
        const alertClass = currentStock <= lowStockThreshold ? 'text-red-400 font-semibold' : 'text-yellow-400';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-200">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${product.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${stockClass}">
                ${currentStock}
                ${currentStock <= lowStockThreshold ? '<i class="fas fa-exclamation-triangle ml-1" title="Estoque baixo"></i>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${alertClass}">
                ${lowStockThreshold}
                ${currentStock <= lowStockThreshold ? '<i class="fas fa-bell ml-1" title="Alerta ativo"></i>' : ''}
            </td>
            ${actionsHtml}
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    return table;
}

// === FUNÇÕES DE VENDAS ===

function renderAvailableProducts(products) {
    const container = document.getElementById('availableProductsList');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-box-open fa-3x mb-4"></i>
                <p>Nenhum produto disponível</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const isInCart = saleCart.find(item => item.productId === product.id);
        const lowStockThreshold = Number(product.lowStockAlert) || 10;
        const stockClass = product.stock === 0 ? 'out' : (product.stock <= lowStockThreshold ? 'low' : '');
        const isOutOfStock = product.stock === 0;
        
        return `
            <div class="product-card ${isInCart ? 'selected' : ''} ${isOutOfStock ? 'disabled' : ''}" 
                 data-product-id="${product.id}"
                 ${isOutOfStock ? '' : 'onclick="toggleProductSelection(\'' + product.id + '\')"'}>
                <div class="product-name">${product.name}</div>
                <div class="product-category">${product.category}</div>
                <div class="product-details">
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <div class="product-stock ${stockClass}">
                        ${isOutOfStock ? 'Sem estoque' : `${product.stock} unidades`}
                        ${product.stock <= lowStockThreshold && product.stock > 0 ? ' (Baixo)' : ''}
                    </div>
                </div>
                
                ${isInCart ? `
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="event.stopPropagation(); changeQuantity('${product.id}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" 
                               class="quantity-input" 
                               value="${isInCart.quantity}" 
                               min="1" 
                               max="${product.stock}"
                               onchange="updateQuantity('${product.id}', this.value)"
                               onclick="event.stopPropagation()">
                        <button class="quantity-btn" 
                                onclick="event.stopPropagation(); changeQuantity('${product.id}', 1)"
                                ${isInCart.quantity >= product.stock ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function toggleProductSelection(productId) {
    const product = availableProducts.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    
    const existingItem = saleCart.find(item => item.productId === productId);
    
    if (existingItem) {
        saleCart = saleCart.filter(item => item.productId !== productId);
    } else {
        saleCart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    updateSaleInterface();
}

function changeQuantity(productId, change) {
    const cartItem = saleCart.find(item => item.productId === productId);
    if (!cartItem) return;
    
    const newQuantity = cartItem.quantity + change;
    
    if (newQuantity <= 0) {
        saleCart = saleCart.filter(item => item.productId !== productId);
    } else if (newQuantity <= cartItem.maxStock) {
        cartItem.quantity = newQuantity;
    }
    
    updateSaleInterface();
}

function updateQuantity(productId, newQuantity) {
    const cartItem = saleCart.find(item => item.productId === productId);
    if (!cartItem) return;
    
    const quantity = parseInt(newQuantity);
    
    if (isNaN(quantity) || quantity <= 0) {
        saleCart = saleCart.filter(item => item.productId !== productId);
    } else if (quantity <= cartItem.maxStock) {
        cartItem.quantity = quantity;
    } else {
        cartItem.quantity = cartItem.maxStock;
    }
    
    updateSaleInterface();
}

function updateSaleInterface() {
    renderAvailableProducts(availableProducts);
    renderCartItems();
    updateCartSummary();
    updateFinalizeSaleButton();
}

function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    const clearButton = document.getElementById('clearCartButton');
    
    if (!container) return;
    
    if (saleCart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart fa-2x mb-2 text-slate-400"></i>
                <p class="text-slate-400">Nenhum produto adicionado</p>
                <p class="text-sm text-slate-500">Selecione produtos acima para adicionar à venda</p>
            </div>
        `;
        if (clearButton) clearButton.style.display = 'none';
        return;
    }
    
    if (clearButton) clearButton.style.display = 'block';
    
    container.innerHTML = saleCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-details">
                    ${formatCurrency(item.price)} × ${item.quantity}
                </div>
            </div>
            
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="changeQuantity('${item.productId}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="mx-2">${item.quantity}</span>
                <button class="quantity-btn" 
                        onclick="changeQuantity('${item.productId}', 1)"
                        ${item.quantity >= item.maxStock ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <div class="cart-item-total">
                ${formatCurrency(item.price * item.quantity)}
            </div>
            
            <button class="remove-item-btn" onclick="removeCartItem('${item.productId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function removeCartItem(productId) {
    saleCart = saleCart.filter(item => item.productId !== productId);
    updateSaleInterface();
}

function clearCart() {
    saleCart = [];
    updateSaleInterface();
    showTemporaryAlert("Carrinho limpo", "info", 2000);
}

function updateCartSummary() {
    const summaryContainer = document.getElementById('cartSummary');
    const subtotalElement = document.getElementById('cartSubtotal');
    const totalElement = document.getElementById('cartTotal');
    
    if (!summaryContainer || !subtotalElement || !totalElement) return;
    
    if (saleCart.length === 0) {
        summaryContainer.style.display = 'none';
        return;
    }
    
    const subtotal = saleCart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const total = subtotal;
    
    subtotalElement.textContent = formatCurrency(subtotal);
    totalElement.textContent = formatCurrency(total);
    summaryContainer.style.display = 'block';
}

function updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = new Date().toLocaleTimeString('pt-BR');
    }
}

function closeSaleSuccessModal() {
    const modal = document.getElementById('saleSuccessModal');
    if (modal) {
        modal.remove();
    }
}

// === ESTILOS DE FORMULÁRIO DE VENDA ===

function addSaleFormStyles() {
    if (!document.getElementById('saleFormStyles')) {
        const style = document.createElement('style');
        style.id = 'saleFormStyles';
        style.textContent = `
            .register-sale-container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .sale-info-card, .products-selection-card, .cart-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .info-item {
                text-align: center;
            }
            
            .info-label {
                display: block;
                font-size: 0.75rem;
                color: #94A3B8;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.25rem;
            }
            
            .info-value {
                font-size: 0.875rem;
                color: #F1F5F9;
                font-weight: 600;
            }
            
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1rem;
                max-height: 400px;
                overflow-y: auto;
                padding: 0.5rem;
            }
            
            .product-card {
                background: rgba(51, 65, 85, 0.3);
                border: 1px solid rgba(71, 85, 105, 0.5);
                border-radius: 0.5rem;
                padding: 1rem;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .product-card:hover {
                background: rgba(51, 65, 85, 0.5);
                border-color: rgba(56, 189, 248, 0.5);
            }
            
            .product-card.selected {
                background: rgba(56, 189, 248, 0.1);
                border-color: rgba(56, 189, 248, 0.8);
            }
            
            .product-name {
                font-weight: 600;
                color: #F1F5F9;
                margin-bottom: 0.25rem;
            }
            
            .product-category {
                font-size: 0.75rem;
                color: #94A3B8;
                margin-bottom: 0.5rem;
            }
            
            .product-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .product-price {
                font-weight: 600;
                color: #38BDF8;
            }
            
            .product-stock {
                font-size: 0.75rem;
                color: #94A3B8;
            }
            
            .product-stock.low {
                color: #F59E0B;
            }
            
            .product-stock.out {
                color: #EF4444;
            }
            
            .quantity-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.75rem;
            }
            
            .quantity-btn {
                background: rgba(56, 189, 248, 0.2);
                border: 1px solid rgba(56, 189, 248, 0.5);
                color: #38BDF8;
                width: 2rem;
                height: 2rem;
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quantity-btn:hover {
                background: rgba(56, 189, 248, 0.3);
            }
            
            .quantity-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .quantity-input {
                background: rgba(15, 23, 42, 0.8);
                border: 1px solid rgba(51, 65, 85, 0.5);
                color: #F1F5F9;
                text-align: center;
                width: 3rem;
                padding: 0.25rem;
                border-radius: 0.25rem;
            }
            
            .cart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .cart-items {
                min-height: 120px;
            }
            
            .empty-cart {
                text-align: center;
                padding: 2rem;
            }
            
            .cart-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.3);
                background: rgba(51, 65, 85, 0.2);
                border-radius: 0.5rem;
                margin-bottom: 0.5rem;
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
                font-size: 0.75rem;
                color: #94A3B8;
            }
            
            .cart-item-quantity {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0 1rem;
            }
            
            .cart-item-total {
                font-weight: 600;
                color: #38BDF8;
                min-width: 80px;
                text-align: right;
            }
            
            .remove-item-btn {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.5);
                color: #EF4444;
                width: 2rem;
                height: 2rem;
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .remove-item-btn:hover {
                background: rgba(239, 68, 68, 0.3);
            }
            
            .cart-summary {
                border-top: 1px solid rgba(51, 65, 85, 0.5);
                padding-top: 1rem;
                margin-top: 1rem;
            }
            
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                color: #F1F5F9;
            }
            
            .total-row {
                font-size: 1.125rem;
                font-weight: 700;
                border-top: 1px solid rgba(51, 65, 85, 0.5);
                padding-top: 0.5rem;
                margin-top: 0.5rem;
                color: #38BDF8;
            }
            
            .sale-actions {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
            }
            
            .btn-sm {
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
            }
            
            .loading-products {
                text-align: center;
                padding: 2rem;
                color: #94A3B8;
            }
            
            @media (max-width: 768px) {
                .products-grid {
                    grid-template-columns: 1fr;
                }
                
                .cart-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                
                .cart-item-quantity {
                    margin: 0;
                }
                
                .sale-actions {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// === CONFIGURAÇÃO DE EVENT LISTENERS ===

function setupEventListeners() {
    console.log("🔧 Configurando event listeners");
    
    setupFormListeners();
    setupNavigationListeners();
    setupModalListeners();
    setupDropdownListeners();
    setupProductActionListeners();
}

function setupFormListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

function setupNavigationListeners() {
    window.addEventListener('hashchange', handleHashChange);
    
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
    const notificationBellButton = document.getElementById('notificationBellButton');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBellButton && notificationDropdown) {
        notificationBellButton.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });
    }
    
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
    }
    
    document.addEventListener('click', (e) => {
        if (notificationDropdown && 
            !notificationBellButton?.contains(e.target) && 
            !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }
        
        if (userDropdown && 
            !userMenuButton?.contains(e.target) && 
            !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
    });
    
    const markAllAsReadButton = document.getElementById('markAllAsReadButton');
    if (markAllAsReadButton) {
        markAllAsReadButton.addEventListener('click', markAllNotificationsAsRead);
    }
}

function setupProductActionListeners() {
    document.addEventListener('click', function(e) {
        const editButton = e.target.closest('.edit-product-btn');
        if (editButton) {
            e.preventDefault();
            const productId = editButton.dataset.productId;
            if (productId) {
                handleEditProduct(productId);
            }
        }
        
        const deleteButton = e.target.closest('.delete-product-btn');
        if (deleteButton) {
            e.preventDefault();
            const productId = deleteButton.dataset.productId;
            const productName = deleteButton.dataset.productName;
            if (productId && productName) {
                handleDeleteProductConfirmation(productId, productName);
            }
        }
        
        const openModalButton = e.target.closest('#openAddProductModalButton');
        if (openModalButton) {
            e.preventDefault();
            openProductModal();
        }
    });
}

function setupCustomersEventListeners(customers) {
    const searchInput = document.getElementById('customerFilterSearch');
    const statusFilter = document.getElementById('customerFilterStatus');
    const generateButton = document.getElementById('generatePromotionsButton');
    
    const applyFilters = () => {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const status = statusFilter?.value || '';
        
        let filtered = customers;
        
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.phone.includes(searchTerm) ||
                (c.email && c.email.toLowerCase().includes(searchTerm))
            );
        }
        
        if (status) {
            filtered = filtered.filter(c => {
                const daysSinceLastPurchase = c.lastPurchaseDate ? 
                    Math.floor((new Date() - c.lastPurchaseDate.toDate()) / (1000 * 60 * 60 * 24)) : null;
                
                switch (status) {
                    case 'active':
                        return daysSinceLastPurchase && daysSinceLastPurchase <= 30;
                    case 'inactive':
                        return daysSinceLastPurchase && daysSinceLastPurchase > 30;
                    case 'vip':
                        return c.totalPurchases >= 10;
                    default:
                        return true;
                }
            });
        }
        
        document.getElementById('customersList').innerHTML = renderCustomerCards(filtered);
    };
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    
    if (generateButton) {
        generateButton.addEventListener('click', async () => {
            try {
                const inactiveCustomers = await CRMService.getInactiveCustomers(30);
                
                if (inactiveCustomers.length === 0) {
                    showTemporaryAlert("Nenhum cliente inativo encontrado", "info");
                    return;
                }
                
                showTemporaryAlert(`Gerando promoções para ${inactiveCustomers.length} clientes inativos...`, "info", 3000);
                
                for (const customer of inactiveCustomers.slice(0, 5)) {
                    await generateCustomerPromotion(customer.id);
                }
                
                showTemporaryAlert("Promoções geradas com sucesso!", "success");
                
            } catch (error) {
                console.error("❌ Erro ao gerar promoções em massa:", error);
                showTemporaryAlert("Erro ao gerar promoções", "error");
            }
        });
    }
}

// === HANDLERS DE EVENTOS ===

function handleHashChange() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;
    
    const userRole = localStorage.getItem('elitecontrol_user_role');
    if (!userRole) return;
    
    const section = window.location.hash.substring(1);
    const defaultSection = getDefaultSection(userRole);
    const targetSection = section || defaultSection;
    
    updateSidebarActiveState(targetSection);
    loadSectionContent(targetSection, {
        uid: currentUser.uid,
        email: currentUser.email,
        role: userRole
    });
}

async function handleEditProduct(productId) {
    console.log("✏️ Editando produto:", productId);
    
    try {
        const product = await DataService.getProductById(productId);
        if (product) {
            openProductModal(product);
        } else {
            showTemporaryAlert('Produto não encontrado.', 'error');
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produto para edição:", error);
        showTemporaryAlert('Erro ao carregar dados do produto.', 'error');
    }
}

function handleDeleteProductConfirmation(productId, productName) {
    console.log("🗑️ Confirmando exclusão do produto:", productName);
    
    showCustomConfirm(
        `Tem certeza que deseja excluir o produto "${productName}"?\n\nEsta ação não pode ser desfeita.`,
        async () => {
            try {
                await DataService.deleteProduct(productId);
                showTemporaryAlert(`Produto "${productName}" excluído com sucesso.`, 'success');
                await reloadProductsIfNeeded();
            } catch (error) {
                console.error("❌ Erro ao excluir produto:", error);
                showTemporaryAlert(`Erro ao excluir produto "${productName}".`, 'error');
            }
        }
    );
}

async function handleLogin(e) {
    e.preventDefault();
    console.log("🔑 Tentativa de login iniciada");
    
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const perfil = document.getElementById('perfil')?.value;
    
    console.log("📧 Email:", email);
    console.log("👤 Perfil selecionado:", perfil);
    
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
        console.log("🔐 Tentando autenticar com Firebase...");
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log("✅ Autenticação bem-sucedida:", userCredential.user.email);
        
        const user = firebase.auth().currentUser;
        if (user) {
            console.log("👤 Usuário atual:", user.uid, user.email);
            
            // Verificar se o Firestore está acessível
            try {
                const testConnection = await window.checkFirebaseConnection();
                console.log("🔌 Conexão Firestore:", testConnection ? "OK" : "FALHA");
            } catch (connError) {
                console.error("❌ Erro ao testar conexão:", connError);
            }
            
            let userData = await DataService.getUserData(user.uid);
            console.log("📋 Dados do usuário no Firestore:", userData);
            
            if (!userData) {
                console.log("⚠️ Usuário não encontrado por UID, tentando por email...");
                userData = await findUserByEmail(email);
                console.log("📋 Dados encontrados por email:", userData);
            }
            
            if (!userData && testUsers[email]) {
                console.log("🆕 Criando usuário de teste...");
                userData = await createTestUser(user.uid, email);
                console.log("✅ Usuário de teste criado:", userData);
            }
            
            if (userData && userData.role !== perfil) {
                console.error("❌ Perfil incorreto. Esperado:", perfil, "Encontrado:", userData.role);
                await firebase.auth().signOut();
                showLoginError(`Perfil incorreto. Este usuário é ${userData.role}.`);
                return;
            }
            
            console.log("✅ Login validado, aguardando redirecionamento...");
            // O redirecionamento será feito pelo onAuthStateChanged
        }
        
        showLoginError('');
        console.log("✅ Processo de login concluído");
        
    } catch (error) {
        console.error("❌ Erro de login detalhado:", error);
        console.error("   Código:", error.code);
        console.error("   Mensagem:", error.message);
        
        let friendlyMessage = "Email ou senha inválidos.";
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                friendlyMessage = "Usuário não encontrado ou credenciais incorretas.";
                break;
            case 'auth/wrong-password':
                friendlyMessage = "Senha incorreta.";
                break;
            case 'auth/invalid-email':
                friendlyMessage = "Formato de email inválido.";
                break;
            case 'auth/network-request-failed':
                friendlyMessage = "Erro de rede. Verifique sua conexão.";
                break;
            case 'auth/too-many-requests':
                friendlyMessage = "Muitas tentativas. Tente novamente mais tarde.";
                break;
            default:
                friendlyMessage = `Erro: ${error.message}`;
        }
        
        showLoginError(friendlyMessage);
        
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = originalText;
        }
    }
}
async function handleLogout() {
    console.log("👋 Fazendo logout");
    
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

// === NAVEGAÇÃO E AUTENTICAÇÃO ===

async function handleNavigation(currentUser) {
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
        
        await loadSectionContent(section || defaultSection, currentUser);
        updateSidebarActiveState(section || defaultSection);
    }
}

function getDefaultSection(role) {
    switch (role) {
        case 'Vendedor': return 'vendas-painel';
        case 'Controlador de Estoque': return 'estoque';
        case 'Dono/Gerente': return 'geral';
        default: return 'geral';
    }
}

function handleLoggedOut() {
    localStorage.removeItem('elitecontrol_user_role');
    sessionStorage.removeItem('welcomeAlertShown');
    
    if (document.getElementById('userInitials')) {
        clearDashboardUI();
    }
    
    const isIndexPage = window.location.pathname.includes('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');
    
    if (!isIndexPage) {
        console.log("🔄 Redirecionando para login...");
        window.location.href = 'index.html';
    }
}

async function ensureTestDataExists() {
    try {
        const products = await DataService.getProducts();
        
        if (!products || products.length === 0) {
            console.log("📦 Criando produtos de exemplo...");
            for (const product of sampleProducts) {
                await DataService.addProduct(product);
            }
            console.log("✅ Produtos de exemplo criados");
        }
    } catch (error) {
        console.warn("⚠️ Erro ao criar dados de exemplo:", error);
    }
}

async function findUserByEmail(email) {
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
    try {
        const testUserData = testUsers[email];
        if (testUserData) {
            await db.collection('users').doc(uid).set(testUserData);
            console.log("✅ Usuário de teste criado:", testUserData);
            return testUserData;
        }
        return null;
    } catch (error) {
        console.error("Erro ao criar usuário de teste:", error);
        return null;
    }
}

// === DASHBOARD E GRÁFICOS ===

async function loadDashboardData(currentUser) {
    console.log("📊 Carregando dados do dashboard para:", currentUser.role);
    
    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("❌ Area de conteúdo dinâmico não encontrada");
        return;
    }
    
    dynamicContentArea.innerHTML = getDashboardTemplate(currentUser.role);
    setupChartEventListeners();
    
    try {
        showTemporaryAlert("Carregando dados do dashboard...", "info", 2000);
        
        let salesStats, topProductsData, recentSalesData;
        
        if (currentUser.role === 'Vendedor') {
            const [productStats, allProducts, vendorSales] = await Promise.all([
                DataService.getProductStats(),
                DataService.getProducts(),
                DataService.getSalesBySeller(currentUser.uid)
            ]);
            
            salesStats = await DataService.getSalesStatsBySeller(currentUser.uid);
            topProductsData = await DataService.getTopProductsBySeller(currentUser.uid, 5);
            recentSalesData = vendorSales;
            
            console.log("✅ Dados do vendedor carregados:", { salesStats, topProductsData, recentSalesData });
            
            updateDashboardKPIs(salesStats, productStats, allProducts, currentUser);
            renderVendorCharts(salesStats);
            updateRecentActivitiesUI(recentSalesData.slice(0, 5));
            
        } else {
            const [productStats, allProducts, generalSales] = await Promise.all([
                DataService.getProductStats(),
                DataService.getProducts(),
                DataService.getSales()
            ]);
            
            salesStats = await DataService.getSalesStats();
            topProductsData = await DataService.getTopProducts(5);
            recentSalesData = generalSales;
            
            console.log("✅ Dados gerais carregados:", { productStats, salesStats, topProductsData, recentSalesData });
            
            updateDashboardKPIs(salesStats, productStats, allProducts, currentUser);
            renderDashboardMainCharts(salesStats, topProductsData, currentUser.role);
            updateRecentActivitiesUI(recentSalesData.slice(0, 5));
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados do dashboard:", error);
        showTemporaryAlert("Falha ao carregar informações do dashboard.", "error");
    }
}

function getDashboardTemplate(userRole) {
    const kpiTemplate = `
        <div id="kpiContainer" class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-icon-wrapper">
                    <i class="fas fa-dollar-sign kpi-icon"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">Receita Total</div>
                    <div class="kpi-value">R$ 0,00</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon-wrapper">
                    <i class="fas fa-shopping-cart kpi-icon"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">Total de Vendas</div>
                    <div class="kpi-value">0</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon-wrapper">
                    <i class="fas fa-box kpi-icon"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">Total de Produtos</div>
                    <div class="kpi-value">0</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon-wrapper">
                    <i class="fas fa-plus kpi-icon"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">Ação Rápida</div>
                    <div class="kpi-value">
                        <button class="btn-primary" id="quickActionButton">Ação</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let chartsTemplate = '';
    
    if (userRole === 'Dono/Gerente') {
        chartsTemplate = `
            <div id="chartsContainer" class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Vendas por Período</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="salesChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="salesChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Produtos Mais Vendidos</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="productsChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="productsChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    } else if (userRole === 'Vendedor') {
        chartsTemplate = `
            <div id="chartsContainer" class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Minhas Vendas - Hoje</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="vendorChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="vendorSalesChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Meus Produtos Mais Vendidos</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="vendorProductsChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="vendorProductsChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    } else if (userRole === 'Controlador de Estoque') {
        chartsTemplate = `
            <div id="chartsContainer" class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Produtos por Categoria</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="categoriesChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="categoriesChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3 class="chart-title">Status do Estoque</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" id="stockChartOptionsButton">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    <div class="chart-content">
                        <canvas id="stockChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }
    
    const activitiesTemplate = `
        <div class="activities-card">
            <div class="activities-header">
                <h3 class="activities-title">Atividades Recentes</h3>
            </div>
            <ul id="recentActivitiesContainer" class="activities-list"></ul>
        </div>
    `;
    
    return kpiTemplate + chartsTemplate + activitiesTemplate;
}

function setupChartEventListeners() {
    setTimeout(() => {
        const salesChartOptionsButton = document.getElementById('salesChartOptionsButton');
        if (salesChartOptionsButton) {
            salesChartOptionsButton.addEventListener('click', () => 
                showTemporaryAlert('Opções do gráfico de vendas', 'info')
            );
        }
        
        const productsChartOptionsButton = document.getElementById('productsChartOptionsButton');
        if (productsChartOptionsButton) {
            productsChartOptionsButton.addEventListener('click', () => 
                showTemporaryAlert('Opções do gráfico de produtos', 'info')
            );
        }
    }, 100);
}

function updateDashboardKPIs(salesStats, productStats, allProducts, currentUser) {
    console.log("📊 Atualizando KPIs para:", currentUser.role);
    
    const kpiCards = document.querySelectorAll('#kpiContainer .kpi-card');
    if (kpiCards.length < 4) return;
    
    const kpi1 = {
        title: kpiCards[0].querySelector('.kpi-title'),
        value: kpiCards[0].querySelector('.kpi-value')
    };
    const kpi2 = {
        title: kpiCards[1].querySelector('.kpi-title'),
        value: kpiCards[1].querySelector('.kpi-value')
    };
    const kpi3 = {
        title: kpiCards[2].querySelector('.kpi-title'),
        value: kpiCards[2].querySelector('.kpi-value')
    };
    const kpi4 = {
        title: kpiCards[3].querySelector('.kpi-title'),
        value: kpiCards[3].querySelector('.kpi-value')
    };
    
    switch (currentUser.role) {
        case 'Vendedor':
            updateVendorKPIs(kpi1, kpi2, kpi3, kpi4, salesStats, allProducts);
            break;
        case 'Controlador de Estoque':
            updateStockKPIs(kpi1, kpi2, kpi3, kpi4, productStats);
            break;
        case 'Dono/Gerente':
            updateManagerKPIs(kpi1, kpi2, kpi3, kpi4, salesStats, productStats);
            break;
    }
}

function updateVendorKPIs(kpi1, kpi2, kpi3, kpi4, salesStats, allProducts) {
    if (kpi1.title) kpi1.title.textContent = "Vendas Hoje";
    if (kpi1.value) kpi1.value.textContent = formatCurrency(salesStats?.todayRevenue || 0);
    
    if (kpi2.title) kpi2.title.textContent = "Nº Vendas Hoje";
    if (kpi2.value) kpi2.value.textContent = salesStats?.todaySales || 0;
    
    if (kpi3.title) kpi3.title.textContent = "Produtos Disponíveis";
    if (kpi3.value) kpi3.value.textContent = allProducts?.length || 0;
    
    if (kpi4.title) kpi4.title.textContent = "Nova Venda";
    if (kpi4.value && !kpi4.value.querySelector('#newSaleButton')) {
        kpi4.value.innerHTML = `<button class="btn-primary" id="newSaleButton">Registrar</button>`;
        setupKPIActionButton('newSaleButton', 'registrar-venda');
    }
}

function updateStockKPIs(kpi1, kpi2, kpi3, kpi4, productStats) {
    if (kpi1.title) kpi1.title.textContent = "Total Produtos";
    if (kpi1.value) kpi1.value.textContent = productStats?.totalProducts || 0;
    
    if (kpi2.title) kpi2.title.textContent = "Estoque Baixo";
    if (kpi2.value) kpi2.value.textContent = productStats?.lowStock || 0;
    
    if (kpi3.title) kpi3.title.textContent = "Categorias";
    if (kpi3.value) kpi3.value.textContent = productStats?.categories ? Object.keys(productStats.categories).length : 0;
    
    if (kpi4.title) kpi4.title.textContent = "Adicionar Produto";
    if (kpi4.value && !kpi4.value.querySelector('#addProductFromKPIButton')) {
        kpi4.value.innerHTML = `<button class="btn-primary" id="addProductFromKPIButton">Adicionar</button>`;
        setupKPIActionButton('addProductFromKPIButton', null, openProductModal);
    }
}

function updateManagerKPIs(kpi1, kpi2, kpi3, kpi4, salesStats, productStats) {
    if (kpi1.title) kpi1.title.textContent = "Receita Total";
    if (kpi1.value) kpi1.value.textContent = formatCurrency(salesStats?.totalRevenue || 0);
    
    if (kpi2.title) kpi2.title.textContent = "Total Vendas";
    if (kpi2.value) kpi2.value.textContent = salesStats?.totalSales || 0;
    
    if (kpi3.title) kpi3.title.textContent = "Total Produtos";
    if (kpi3.value) kpi3.value.textContent = productStats?.totalProducts || 0;
    
    if (kpi4.title) kpi4.title.textContent = "Relatórios";
    if (kpi4.value && !kpi4.value.querySelector('#viewReportsButton')) {
        kpi4.value.innerHTML = `<button class="btn-primary" id="viewReportsButton">Ver</button>`;
        setupKPIActionButton('viewReportsButton', 'vendas');
    }
}

function setupKPIActionButton(buttonId, targetSection, customAction = null) {
    setTimeout(() => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                if (customAction) {
                    customAction();
                } else if (targetSection) {
                    window.location.hash = '#' + targetSection;
                }
            });
        }
    }, 100);
}

function renderDashboardMainCharts(salesStats, topProductsData) {
    if (!document.getElementById('salesChart') || typeof Chart === 'undefined') {
        console.warn("⚠️ Elemento do gráfico ou Chart.js não disponível");
        return;
    }
    
    console.log("📈 Renderizando gráficos principais");
    
    renderSalesChart(salesStats);
    renderProductsChart(topProductsData);
}

function renderVendorCharts(salesStats) {
    if (!document.getElementById('vendorSalesChart') || typeof Chart === 'undefined') {
        console.warn("⚠️ Elemento do gráfico do vendedor ou Chart.js não disponível");
        return;
    }
    
    console.log("📈 Renderizando gráficos do vendedor");
    
    renderVendorSalesChart(salesStats);
    renderVendorProductsChart();
}

function renderVendorSalesChart(salesStats) {
    const vendorCtx = document.getElementById('vendorSalesChart');
    if (!vendorCtx) return;
    
    if (window.vendorSalesChartInstance) {
        window.vendorSalesChartInstance.destroy();
    }
    
    const ctx = vendorCtx.getContext('2d');
    
    window.vendorSalesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Hoje', 'Esta Semana', 'Este Mês'],
            datasets: [{
                label: 'Minhas Vendas (R$)',
                data: [
                    salesStats?.todayRevenue || 0,
                    salesStats?.weekRevenue || 0,
                    salesStats?.monthRevenue || 0
                ],
                backgroundColor: [
                    'rgba(56, 189, 248, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(56, 189, 248, 1)',
                    'rgba(99, 102, 241, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(241, 245, 249, 0.8)'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: 'rgba(241, 245, 249, 0.8)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: 'rgba(241, 245, 249, 0.8)'
                    }
                }
            }
        }
    });
}

function renderVendorProductsChart() {
    const vendorProductsCtx = document.getElementById('vendorProductsChart');
    if (!vendorProductsCtx) return;
    
    const ctx = vendorProductsCtx.getContext('2d');
    
    if (window.vendorProductsChartInstance) {
        window.vendorProductsChartInstance.destroy();
    }
    
    window.vendorProductsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sem dados'],
            datasets: [{
                data: [1],
                backgroundColor: ['rgba(107, 114, 128, 0.5)'],
                borderColor: ['rgba(107, 114, 128, 1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(241, 245, 249, 0.8)'
                    }
                }
            }
        }
    });
}

function renderSalesChart(salesStats) {
    const salesCtx = document.getElementById('salesChart');
    if (!salesCtx) return;
    
    if (window.salesChartInstance) {
        window.salesChartInstance.destroy();
    }
    
    const ctx = salesCtx.getContext('2d');
    const previousRevenue = (salesStats?.totalRevenue || 0) - (salesStats?.todayRevenue || 0);
    
    window.salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Acumulado Anterior', 'Hoje'],
            datasets: [{
                label: 'Vendas (R$)',
                data: [previousRevenue, salesStats?.todayRevenue || 0],
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: 'rgba(56, 189, 248, 1)',
                pointBorderColor: 'rgba(56, 189, 248, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(241, 245, 249, 0.8)'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: 'rgba(241, 245, 249, 0.8)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: 'rgba(241, 245, 249, 0.8)'
                    }
                }
            }
        }
    });
}

function renderProductsChart(topProductsData) {
    const productsCtx = document.getElementById('productsChart');
    if (!productsCtx) return;
    
    if (window.productsChartInstance) {
        window.productsChartInstance.destroy();
    }
    
    const ctx = productsCtx.getContext('2d');
    const hasData = topProductsData && topProductsData.length > 0;
    
    const labels = hasData ? topProductsData.map(p => p.name) : ['Sem dados'];
    const data = hasData ? topProductsData.map(p => p.count) : [1];
    const colors = [
        'rgba(56, 189, 248, 0.8)',
        'rgba(99, 102, 241, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
    ];
    
    window.productsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: data,
                backgroundColor: hasData ? colors : ['rgba(107, 114, 128, 0.5)'],
                borderColor: hasData ? colors.map(c => c.replace('0.8', '1')) : ['rgba(107, 114, 128, 1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(241, 245, 249, 0.8)',
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            return label + ': ' + context.parsed;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function updateRecentActivitiesUI(sales) {
    const activitiesContainer = document.getElementById('recentActivitiesContainer');
    if (!activitiesContainer) return;
    
    activitiesContainer.innerHTML = '';
    
    if (!sales || sales.length === 0) {
        activitiesContainer.innerHTML = `
            <li class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text text-slate-400">Nenhuma atividade recente.</div>
                </div>
            </li>
        `;
        return;
    }
    
    sales.forEach(sale => {
        const activityItem = document.createElement('li');
        activityItem.className = 'activity-item';
        
        const productNames = sale.productsDetail && Array.isArray(sale.productsDetail) && sale.productsDetail.length > 0
            ? sale.productsDetail.map(p => p.name || 'Produto').slice(0, 2).join(', ') + 
              (sale.productsDetail.length > 2 ? '...' : '')
            : 'Detalhes indisponíveis';
        
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    Venda: ${productNames} - ${formatCurrency(sale.total)}
                </div>
                <div class="activity-time">
                    ${formatDate(sale.date)} ${sale.sellerName ? 'por ' + sale.sellerName : ''}
                </div>
            </div>
        `;
        
        activitiesContainer.appendChild(activityItem);
    });
}

// === INTERFACE GERAL ===

function updateUserInfo(user) {
    if (!user) return;
    
    console.log("👤 Atualizando informações do usuário");
    
    let initials = 'U';
    if (user.name) {
        initials = user.name.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2);
    } else if (user.email) {
        initials = user.email.substring(0, 2).toUpperCase();
    }
    
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
    
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.innerHTML = '';
    
    const chartInstances = [
        'salesChartInstance',
        'productsChartInstance', 
        'vendorSalesChartInstance',
        'vendorProductsChartInstance',
        'categoriesChartInstance',
        'stockChartInstance'
    ];
    
    chartInstances.forEach(instanceName => {
        if (window[instanceName]) {
            window[instanceName].destroy();
            window[instanceName] = null;
        }
    });
    
    const kpiCards = document.querySelectorAll('#kpiContainer .kpi-card');
    kpiCards.forEach((card, index) => {
        const valueEl = card.querySelector('.kpi-value');
        const titleEl = card.querySelector('.kpi-title');
        
        if (valueEl && !valueEl.querySelector('button')) {
            valueEl.textContent = '0';
        }
        
        if (titleEl) {
            const titles = ['Vendas', 'Transações', 'Produtos', 'Ações'];
            titleEl.textContent = titles[index] || 'N/A';
        }
    });
    
    const activitiesContainer = document.getElementById('recentActivitiesContainer');
    if (activitiesContainer) {
        activitiesContainer.innerHTML = `
            <li class="activity-item">
                <div class="activity-content">
                    <div class="activity-text text-slate-400">Nenhuma atividade.</div>
                </div>
            </li>
        `;
    }
    
    sessionStorage.removeItem('welcomeAlertShown');
}

// === SIDEBAR E NOTIFICAÇÕES ===

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
            console.warn(`⚠️ Papel não reconhecido: ${role}`);
    }
    
    navLinksContainer.innerHTML = links.map(link => `
        <a href="#${link.section}" 
           class="nav-link ${isActive(link.section) ? 'active' : ''}" 
           data-section="${link.section}">
            <i class="fas ${link.icon} nav-link-icon"></i>
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

function initializeNotifications() {
    if (!document.getElementById('notificationCountBadge')) return;
    
    let notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');
    
    if (notifications.length === 0) {
        notifications = [
            {
                id: 'welcome',
                title: 'Bem-vindo!',
                message: 'EliteControl v2.0 com IA está pronto para uso.',
                time: 'Agora',
                read: false,
                type: 'success'
            },
            {
                id: 'tip',
                title: 'Nova Funcionalidade',
                message: 'Sistema CRM com IA para gestão de clientes.',
                time: '1h atrás',
                read: false,
                type: 'info'
            }
        ];
        localStorage.setItem('elitecontrol_notifications', JSON.stringify(notifications));
    }
    
    updateNotificationsUI();
}

function updateNotificationsUI() {
    const notificationList = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationCountBadge');
    
    if (!notificationList || !notificationBadge) return;
    
    const notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    notificationBadge.textContent = unreadCount;
    notificationBadge.classList.toggle('hidden', unreadCount === 0);
    
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="p-4 text-center text-slate-400">
                <i class="fas fa-bell-slash mb-2"></i>
                <p>Nenhuma notificação.</p>
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
    
    notificationList.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            markNotificationAsRead(id);
        });
    });
}

function markNotificationAsRead(id) {
    let notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');
    notifications = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem('elitecontrol_notifications', JSON.stringify(notifications));
    updateNotificationsUI();
}

function markAllNotificationsAsRead() {
    let notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');
    notifications = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('elitecontrol_notifications', JSON.stringify(notifications));
    updateNotificationsUI();
    
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

// === SEÇÃO DE USUÁRIOS ===

function renderUsersSection(container) {
    console.log("👥 Renderizando seção de usuários (em desenvolvimento)");
    
    container.innerHTML = `
        <div class="users-container">
            <h2 class="text-xl font-semibold text-slate-100 mb-4">Gerenciamento de Usuários</h2>
            
            <div class="text-center py-16 text-slate-400">
                <i class="fas fa-users-cog fa-4x mb-4"></i>
                <p class="text-lg">Seção em desenvolvimento</p>
                <p class="text-sm mt-2">Em breve você poderá gerenciar usuários e permissões do sistema.</p>
            </div>
        </div>
    `;
}

// === FUNÇÕES UTILITÁRIAS ===

function showTemporaryAlert(message, type = 'info', duration = 4000) {
    const container = document.getElementById('temporaryAlertsContainer');
    if (!container) return;
    
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
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    }, duration);
}

function showCustomConfirm(message, onConfirm) {
    const existingModal = document.getElementById('customConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'customConfirmModal';
    modalBackdrop.className = 'modal-backdrop show';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content show';
    modalContent.style.maxWidth = '400px';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <i class="fas fa-exclamation-triangle modal-icon warning"></i>
            <h3 class="modal-title">Confirmação</h3>
        </div>
        <div class="modal-body">
            <p>${message}</p>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary py-2 px-4 rounded-md hover:bg-slate-600" id="cancelConfirm">
                Cancelar
            </button>
            <button class="btn-primary py-2 px-4 rounded-md bg-red-600 hover:bg-red-700" id="confirmAction">
                Confirmar
            </button>
        </div>
    `;
    
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    
    document.getElementById('cancelConfirm').onclick = () => modalBackdrop.remove();
    document.getElementById('confirmAction').onclick = () => {
        onConfirm();
        modalBackdrop.remove();
    };
    
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            modalBackdrop.remove();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

function showLoginError(message) {
    const errorElement = document.getElementById('loginErrorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.toggle('hidden', !message);
    }
}

function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
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
        date = new Date();
    }
    
    if (isNaN(date.getTime())) {
        return "Data inválida";
    }
    
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
        date = new Date();
    }
    
    if (isNaN(date.getTime())) {
        return "Data/hora inválida";
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(date);
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// === EXPOR FUNÇÕES GLOBALMENTE ===

// Funções do sistema principal
window.toggleProductSelection = toggleProductSelection;
window.changeQuantity = changeQuantity;
window.updateQuantity = updateQuantity;
window.removeCartItem = removeCartItem;
window.closeSaleSuccessModal = closeSaleSuccessModal;
window.handleEditProduct = handleEditProduct;
window.handleDeleteProductConfirmation = handleDeleteProductConfirmation;
window.openProductModal = openProductModal;

// Funções do sistema de clientes
window.selectCustomer = selectCustomer;
window.saveNewCustomer = saveNewCustomer;
window.viewCustomerHistory = viewCustomerHistory;
window.generateCustomerPromotion = generateCustomerPromotion;
window.copyPromotionMessage = copyPromotionMessage;

// Log de inicialização
console.log("✅ EliteControl v2.0 com IA e CRM carregado com sucesso!");
console.log("🚀 Novos recursos disponíveis:");
console.log("   - Sistema CRM com gestão de clientes");
console.log("   - Geração de promoções com IA");
console.log("   - Análise de preferências de clientes");
console.log("   - Pesquisa avançada de produtos");
console.log("   - Dashboard personalizado por perfil");
console.log("   - Integração de vendas com clientes");
