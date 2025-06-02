// js/main-v2.js - Sistema EliteControl v2.0 com IA e CRM Avançado

// Configuração de opções padrão para gráficos - Movido para o início para evitar referência antes da inicialização
const chartDefaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                color: '#94A3B8',
                font: {
                    family: "'Inter', sans-serif",
                    size: 12
                },
                boxWidth: 12,
                usePointStyle: true
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#F1F5F9',
            bodyColor: '#CBD5E1',
            borderColor: 'rgba(51, 65, 85, 0.5)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
                family: "'Inter', sans-serif",
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                family: "'Inter', sans-serif",
                size: 13
            },
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true
        }
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(51, 65, 85, 0.2)',
                borderColor: 'rgba(51, 65, 85, 0.5)',
                tickColor: 'rgba(51, 65, 85, 0.5)'
            },
            ticks: {
                color: '#94A3B8',
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                }
            }
        },
        y: {
            grid: {
                color: 'rgba(51, 65, 85, 0.2)',
                borderColor: 'rgba(51, 65, 85, 0.5)',
                tickColor: 'rgba(51, 65, 85, 0.5)'
            },
            ticks: {
                color: '#94A3B8',
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                }
            }
        }
    }
};

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
    
    // Configurar event listeners
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (stockFilter) stockFilter.addEventListener('change', applyFilters);
    
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (stockFilter) stockFilter.value = '';
            applyFilters();
        });
    }
}

function addProductsConsultStyles() {
    if (!document.getElementById('productsConsultStyles')) {
        const style = document.createElement('style');
        style.id = 'productsConsultStyles';
        style.textContent = `
            .products-consult-container {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .search-bar {
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .product-consult-card {
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.5rem;
                padding: 1rem;
                transition: all 0.2s ease;
            }
            
            .product-consult-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .product-consult-card.available {
                border-left: 3px solid #10B981;
            }
            
            .product-consult-card.low {
                border-left: 3px solid #F59E0B;
            }
            
            .product-consult-card.out {
                border-left: 3px solid #EF4444;
                opacity: 0.7;
            }
            
            .product-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.3);
            }
            
            .product-name {
                font-weight: 600;
                color: #F1F5F9;
            }
            
            .stock-badge {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .stock-badge.available {
                background: rgba(16, 185, 129, 0.2);
                color: #34D399;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .stock-badge.low {
                background: rgba(245, 158, 11, 0.2);
                color: #FBBF24;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }
            
            .stock-badge.out {
                background: rgba(239, 68, 68, 0.2);
                color: #F87171;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .product-info {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.2);
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

// Função para adicionar estilos ao formulário de venda - Implementada para corrigir o erro
function addSaleFormStyles() {
    if (!document.getElementById('saleFormStyles')) {
        const style = document.createElement('style');
        style.id = 'saleFormStyles';
        style.textContent = `
            .register-sale-container {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .sale-info-card, .customer-selection-card, .products-selection-card, .cart-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .info-label {
                color: #94A3B8;
                font-size: 0.75rem;
            }
            
            .info-value {
                color: #F1F5F9;
                font-weight: 500;
            }
            
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .product-card {
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.5rem;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .product-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                border-color: rgba(56, 189, 248, 0.5);
            }
            
            .product-card.out-of-stock {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .product-card.selected {
                border-color: #38BDF8;
                background: rgba(56, 189, 248, 0.1);
            }
            
            .product-name {
                font-weight: 500;
                color: #F1F5F9;
                margin-bottom: 0.25rem;
            }
            
            .product-category {
                font-size: 0.75rem;
                color: #94A3B8;
                margin-bottom: 0.5rem;
            }
            
            .product-price {
                color: #38BDF8;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }
            
            .product-stock {
                font-size: 0.75rem;
                color: #94A3B8;
            }
            
            .loading-products {
                grid-column: 1 / -1;
                text-align: center;
                padding: 2rem;
                color: #94A3B8;
            }
            
            .cart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .cart-items {
                border-radius: 0.5rem;
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid rgba(51, 65, 85, 0.5);
                margin-bottom: 1rem;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .empty-cart {
                padding: 2rem;
                text-align: center;
            }
            
            .cart-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.3);
            }
            
            .cart-item:last-child {
                border-bottom: none;
            }
            
            .cart-item-info {
                flex: 1;
            }
            
            .cart-item-name {
                font-weight: 500;
                color: #F1F5F9;
                margin-bottom: 0.25rem;
            }
            
            .cart-item-price {
                font-size: 0.75rem;
                color: #94A3B8;
            }
            
            .cart-item-quantity {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .quantity-btn {
                background: rgba(51, 65, 85, 0.5);
                border: none;
                color: #F1F5F9;
                width: 24px;
                height: 24px;
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quantity-btn:hover {
                background: rgba(71, 85, 105, 0.5);
            }
            
            .quantity-input {
                width: 40px;
                text-align: center;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.25rem;
                color: #F1F5F9;
                padding: 0.25rem;
            }
            
            .cart-item-total {
                font-weight: 500;
                color: #38BDF8;
                min-width: 80px;
                text-align: right;
            }
            
            .cart-item-remove {
                background: none;
                border: none;
                color: #94A3B8;
                cursor: pointer;
                padding: 0.25rem;
                margin-left: 0.5rem;
                border-radius: 0.25rem;
                transition: all 0.2s ease;
            }
            
            .cart-item-remove:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #F87171;
            }
            
            .cart-summary {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 0.5rem;
                padding: 1rem;
            }
            
            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                color: #F1F5F9;
            }
            
            .total-row {
                font-weight: 600;
                font-size: 1.125rem;
                border-top: 1px solid rgba(51, 65, 85, 0.5);
                margin-top: 0.5rem;
                padding-top: 0.75rem;
            }
            
            .total-row span:last-child {
                color: #38BDF8;
            }
            
            .sale-actions {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .customer-search-container {
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }
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

// Função para renderizar a lista de produtos - Implementada para corrigir o erro
function renderProductsList(products, container, userRole) {
    console.log("📋 Renderizando lista de produtos");
    
    container.innerHTML = `
        <div class="products-container">
            <div class="products-header">
                <h2 class="text-xl font-semibold text-slate-100 mb-4">Gerenciar Produtos</h2>
                
                <button id="addProductButton" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>
                    Adicionar Produto
                </button>
            </div>
            
            <div class="products-table-container">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th>Preço</th>
                            <th>Estoque</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="productsTableBody">
                        ${products.length === 0 ? `
                            <tr>
                                <td colspan="6" class="text-center py-4 text-slate-400">
                                    Nenhum produto cadastrado
                                </td>
                            </tr>
                        ` : ''}
                        
                        ${products.map(product => {
                            const lowStockThreshold = Number(product.lowStockAlert) || 10;
                            const stockStatus = product.stock === 0 ? 'out' : 
                                              (product.stock <= lowStockThreshold ? 'low' : 'ok');
                            const stockLabel = product.stock === 0 ? 'Sem estoque' : 
                                             (product.stock <= lowStockThreshold ? 'Estoque baixo' : 'Em estoque');
                            
                            return `
                                <tr data-product-id="${product.id}">
                                    <td class="product-name">${product.name}</td>
                                    <td>${product.category}</td>
                                    <td class="product-price">${formatCurrency(product.price)}</td>
                                    <td>${product.stock} un</td>
                                    <td>
                                        <span class="stock-badge ${stockStatus}">
                                            ${stockLabel}
                                        </span>
                                    </td>
                                    <td class="actions-cell">
                                        <button class="action-button edit-product" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-button delete-product" title="Excluir">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Adicionar estilos para a tabela de produtos
    addProductsTableStyles();
    
    // Configurar event listeners
    setupProductsEventListeners(products, userRole);
}

// Função para adicionar estilos à tabela de produtos
function addProductsTableStyles() {
    if (!document.getElementById('productsTableStyles')) {
        const style = document.createElement('style');
        style.id = 'productsTableStyles';
        style.textContent = `
            .products-container {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(51, 65, 85, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .products-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .products-table-container {
                overflow-x: auto;
                border-radius: 0.5rem;
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            
            .products-table th {
                background: rgba(30, 41, 59, 0.8);
                color: #94A3B8;
                font-weight: 500;
                font-size: 0.875rem;
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.5);
            }
            
            .products-table td {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(51, 65, 85, 0.3);
                color: #F1F5F9;
                font-size: 0.875rem;
            }
            
            .products-table tr:last-child td {
                border-bottom: none;
            }
            
            .products-table tr:hover td {
                background: rgba(51, 65, 85, 0.3);
            }
            
            .product-name {
                font-weight: 500;
                color: #F8FAFC;
            }
            
            .product-price {
                color: #38BDF8;
                font-weight: 500;
            }
            
            .stock-badge {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .stock-badge.ok {
                background: rgba(16, 185, 129, 0.2);
                color: #34D399;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .stock-badge.low {
                background: rgba(245, 158, 11, 0.2);
                color: #FBBF24;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }
            
            .stock-badge.out {
                background: rgba(239, 68, 68, 0.2);
                color: #F87171;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .actions-cell {
                display: flex;
                gap: 0.5rem;
            }
            
            .action-button {
                background: none;
                border: none;
                color: #94A3B8;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 0.25rem;
                transition: all 0.2s ease;
            }
            
            .action-button:hover {
                background: rgba(51, 65, 85, 0.5);
                color: #F1F5F9;
            }
            
            .action-button.edit-product:hover {
                color: #38BDF8;
            }
            
            .action-button.delete-product:hover {
                color: #F87171;
            }
            
            @media (max-width: 768px) {
                .products-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .products-table th:nth-child(2),
                .products-table td:nth-child(2) {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Função para configurar event listeners de produtos
function setupProductsEventListeners(products, userRole) {
    // Botão de adicionar produto
    const addProductButton = document.getElementById('addProductButton');
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            openProductModal();
        });
    }
    
    // Botões de editar produto
    const editButtons = document.querySelectorAll('.edit-product');
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = e.target.closest('tr');
            const productId = row.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                openProductModal(product);
            }
        });
    });
    
    // Botões de excluir produto
    const deleteButtons = document.querySelectorAll('.delete-product');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = e.target.closest('tr');
            const productId = row.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                confirmDeleteProduct(product);
            }
        });
    });
}

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Outras funções do sistema...
