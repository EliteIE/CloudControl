// js/main.js - Sistema EliteControl Corrigido e Melhorado

// Variáveis globais
let productModal, productForm, productModalTitle, productIdField, productNameField, 
    productCategoryField, productPriceField, productStockField, closeProductModalButton, 
    cancelProductFormButton, saveProductButton;

// Dados de usuários de teste (será criado automaticamente no Firestore se não existir)
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
    { name: 'Notebook Dell Inspiron', category: 'Eletrônicos', price: 2500.00, stock: 15 },
    { name: 'Mouse Logitech MX Master', category: 'Periféricos', price: 320.00, stock: 8 },
    { name: 'Teclado Mecânico RGB', category: 'Periféricos', price: 450.00, stock: 25 },
    { name: 'Monitor 24" Full HD', category: 'Eletrônicos', price: 800.00, stock: 12 },
    { name: 'SSD 500GB Samsung', category: 'Armazenamento', price: 350.00, stock: 30 }
];

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 EliteControl inicializando...');
    
    // Inicializar elementos do modal
    initializeModalElements();
    
    // Configurar todos os event listeners
    setupEventListeners();
    
    // Verificar autenticação
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
});

// Inicializar elementos do modal
function initializeModalElements() {
    productModal = document.getElementById('productModal');
    productForm = document.getElementById('productForm');
    productModalTitle = document.getElementById('productModalTitle');
    productIdField = document.getElementById('productId');
    productNameField = document.getElementById('productName');
    productCategoryField = document.getElementById('productCategory');
    productPriceField = document.getElementById('productPrice');
    productStockField = document.getElementById('productStock');
    closeProductModalButton = document.getElementById('closeProductModalButton');
    cancelProductFormButton = document.getElementById('cancelProductFormButton');
    saveProductButton = document.getElementById('saveProductButton');
    
    // Verificar se elementos críticos foram encontrados
    if (!productModal && window.location.pathname.includes('dashboard.html')) {
        console.error("⚠️ Elementos do modal de produto não encontrados no DOM!");
    }
}

// Gerenciar mudanças no estado de autenticação
async function handleAuthStateChange(user) {
    console.log('🔐 Estado de autenticação alterado:', user ? 'Logado' : 'Deslogado');
    
    if (user) {
        console.log("👤 Usuário logado:", { uid: user.uid, email: user.email });
        
        try {
            // Garantir que dados de teste existam
            await ensureTestDataExists();
            
            // Buscar dados do usuário
            let userData = await DataService.getUserData(user.uid);
            
            // Se não encontrou por UID, tentar por email
            if (!userData) {
                userData = await findUserByEmail(user.email);
            }
            
            // Se ainda não encontrou, criar usuário baseado nos dados de teste
            if (!userData && testUsers[user.email]) {
                userData = await createTestUser(user.uid, user.email);
            }
            
            if (userData && userData.role) {
                console.log("✅ Dados do usuário carregados:", userData);
                localStorage.setItem('elitecontrol_user_role', userData.role);
                
                const currentUser = { uid: user.uid, email: user.email, ...userData };
                
                // Inicializar interface
                initializeUI(currentUser);
                
                // Verificar se deve redirecionar ou carregar seção
                await handleNavigation(currentUser);
                
            } else {
                throw new Error('Dados do usuário não encontrados ou incompletos');
            }
            
        } catch (error) {
            console.error("❌ Erro no processo de autenticação:", error);
            showTemporaryAlert("Erro ao carregar dados do usuário. Verifique sua conexão.", "error");
            
            if (!window.location.pathname.includes('index.html')) {
                await firebase.auth().signOut();
            }
        }
    } else {
        console.log("👋 Usuário deslogado");
        handleLoggedOut();
    }
}

// Garantir que dados de teste existam no Firestore
async function ensureTestDataExists() {
    try {
        // Verificar se já existem produtos
        const products = await DataService.getProducts();
        
        // Se não há produtos, criar produtos de exemplo
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

// Buscar usuário por email
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

// Criar usuário de teste
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

// Gerenciar navegação após login
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

// Obter seção padrão baseada no papel do usuário
function getDefaultSection(role) {
    switch (role) {
        case 'Vendedor': return 'vendas-painel';
        case 'Controlador de Estoque': return 'estoque';
        case 'Dono/Gerente': return 'geral';
        default: return 'geral';
    }
}

// Gerenciar estado deslogado
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

// === FUNÇÕES DO MODAL DE PRODUTO ===

function openProductModal(product = null) {
    if (!productModal) {
        console.error("❌ Modal de produto não encontrado");
        return;
    }
    
    console.log("📝 Abrindo modal de produto:", product ? 'Editar' : 'Novo');
    
    // Reset form
    if (productForm) productForm.reset();
    
    if (product) {
        // Modo edição
        if (productModalTitle) productModalTitle.textContent = 'Editar Produto';
        if (productIdField) productIdField.value = product.id;
        if (productNameField) productNameField.value = product.name;
        if (productCategoryField) productCategoryField.value = product.category;
        if (productPriceField) productPriceField.value = product.price;
        if (productStockField) productStockField.value = product.stock;
    } else {
        // Modo criação
        if (productModalTitle) productModalTitle.textContent = 'Adicionar Novo Produto';
        if (productIdField) productIdField.value = '';
    }
    
    // Mostrar modal
    productModal.classList.remove('hidden');
    
    // Focar no primeiro campo
    if (productNameField) {
        setTimeout(() => productNameField.focus(), 100);
    }
}

function closeProductModal() {
    if (productModal) {
        productModal.classList.add('hidden');
        console.log("❌ Modal de produto fechado");
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    console.log("💾 Salvando produto...");
    
    if (!validateProductForm()) {
        return;
    }
    
    const id = productIdField?.value;
    const productData = {
        name: productNameField.value.trim(),
        category: productCategoryField.value.trim(),
        price: parseFloat(productPriceField.value),
        stock: parseInt(productStockField.value)
    };
    
    // Desabilitar botão durante salvamento
    if (saveProductButton) {
        saveProductButton.disabled = true;
        saveProductButton.textContent = 'Salvando...';
    }
    
    try {
        if (id) {
            // Atualizar produto existente
            await DataService.updateProduct(id, productData);
            showTemporaryAlert('Produto atualizado com sucesso!', 'success');
        } else {
            // Criar novo produto
            await DataService.addProduct(productData);
            showTemporaryAlert('Produto adicionado com sucesso!', 'success');
        }
        
        closeProductModal();
        
        // Recarregar lista de produtos se estiver na seção correta
        await reloadProductsIfNeeded();
        
    } catch (error) {
        console.error("❌ Erro ao salvar produto:", error);
        showTemporaryAlert('Erro ao salvar produto. Tente novamente.', 'error');
    } finally {
        // Reabilitar botão
        if (saveProductButton) {
            saveProductButton.disabled = false;
            saveProductButton.textContent = 'Salvar Produto';
        }
    }
}

function validateProductForm() {
    if (!productNameField || !productCategoryField || !productPriceField || !productStockField) {
        showTemporaryAlert("Erro: Campos do formulário não encontrados.", "error");
        return false;
    }
    
    const name = productNameField.value.trim();
    const category = productCategoryField.value.trim();
    const price = parseFloat(productPriceField.value);
    const stock = parseInt(productStockField.value);
    
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

// === FUNÇÕES DE CARREGAMENTO DE DADOS ===

async function loadDashboardData(currentUser) {
    console.log("📊 Carregando dados do dashboard para:", currentUser.role);
    
    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("❌ Area de conteúdo dinâmico não encontrada");
        return;
    }
    
    // Template do dashboard baseado no perfil
    dynamicContentArea.innerHTML = getDashboardTemplate(currentUser.role);
    
    // Configurar event listeners dos gráficos
    setupChartEventListeners();
    
    try {
        showTemporaryAlert("Carregando dados do dashboard...", "info", 2000);
        
        // Carregar dados baseados no perfil do usuário
        let salesStats, topProductsData, recentSalesData;
        
        if (currentUser.role === 'Vendedor') {
            // Para vendedores: apenas suas próprias vendas
            const [productStats, allProducts, vendorSales] = await Promise.all([
                DataService.getProductStats(),
                DataService.getProducts(),
                DataService.getSalesBySeller(currentUser.uid)
            ]);
            
            // Calcular estatísticas específicas do vendedor
            salesStats = await DataService.getSalesStatsBySeller(currentUser.uid);
            topProductsData = await DataService.getTopProductsBySeller(currentUser.uid, 5);
            recentSalesData = vendorSales;
            
            console.log("✅ Dados do vendedor carregados:", { salesStats, topProductsData, recentSalesData });
            
            // Atualizar interface do vendedor
            updateDashboardKPIs(salesStats, productStats, allProducts, currentUser);
            renderVendorCharts(salesStats);
            updateRecentActivitiesUI(recentSalesData.slice(0, 5));
            
        } else {
            // Para admin e estoque: dados gerais
            const [productStats, allProducts, generalSales] = await Promise.all([
                DataService.getProductStats(),
                DataService.getProducts(),
                DataService.getSales()
            ]);
            
            salesStats = await DataService.getSalesStats();
            topProductsData = await DataService.getTopProducts(5);
            recentSalesData = generalSales;
            
            console.log("✅ Dados gerais carregados:", { productStats, salesStats, topProductsData, recentSalesData });
            
            // Atualizar interface
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
    // Template base dos KPIs
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
    
    // Template de gráficos baseado no perfil
    let chartsTemplate = '';
    
    if (userRole === 'Dono/Gerente') {
        // Admin vê todos os gráficos
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
        // Vendedor vê apenas gráfico de performance pessoal
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
        // Estoque vê apenas gráfico de produtos (sem vendas)
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
    
    // Template de atividades
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
    // Event listeners dos gráficos serão configurados após renderização
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

async function loadSectionContent(sectionId, currentUser) {
    console.log(`📄 Carregando seção: ${sectionId} para usuário:`, currentUser.role);
    
    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("❌ Area de conteúdo dinâmico não encontrada");
        return;
    }
    
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
            case 'produtos-consulta':
                const products = await DataService.getProducts();
                renderProductsList(products, dynamicContentArea, currentUser.role);
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
            case 'minhas-vendas':
                const sales = await DataService.getSales();
                renderSalesList(sales, dynamicContentArea, currentUser.role);
                break;
                
            default:
                dynamicContentArea.innerHTML = `
                    <div class="p-8 text-center text-slate-400">
                        <i class="fas fa-exclamation-triangle fa-2x mb-4"></i>
                        <p>Seção "${sectionId}" ainda não implementada.</p>
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

// === FUNÇÕES DE RENDERIZAÇÃO ===

function renderProductsList(products, container, userRole) {
    console.log("📦 Renderizando lista de produtos:", products.length);
    
    container.innerHTML = '';
    
    // Título
    const title = document.createElement('h2');
    title.className = 'text-xl font-semibold text-slate-100 mb-4';
    title.textContent = 'Lista de Produtos';
    container.appendChild(title);
    
    // Botão adicionar (apenas para certos papéis)
    if (userRole === 'Controlador de Estoque' || userRole === 'Dono/Gerente') {
        const addButton = document.createElement('button');
        addButton.id = 'openAddProductModalButton';
        addButton.className = 'btn-primary mb-4 inline-flex items-center';
        addButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Novo Produto';
        container.appendChild(addButton);
    }
    
    // Verificar se há produtos
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
    
    // Tabela de produtos
    const table = createProductsTable(products, userRole);
    container.appendChild(table);
}

function createProductsTable(products, userRole) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden';
    
    // Cabeçalho
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-700';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nome</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Categoria</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Preço</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estoque</th>
            ${(userRole === 'Controlador de Estoque' || userRole === 'Dono/Gerente') ? 
                '<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>' : ''}
        </tr>
    `;
    table.appendChild(thead);
    
    // Corpo da tabela
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
        
        const stockClass = Number(product.stock) < 20 ? 'text-red-400 font-semibold' : 'text-slate-300';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-200">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${product.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${stockClass}">
                ${product.stock}
                ${Number(product.stock) < 20 ? '<i class="fas fa-exclamation-triangle ml-1" title="Estoque baixo"></i>' : ''}
            </td>
            ${actionsHtml}
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    return table;
}

function renderRegisterSaleForm(container, currentUser) {
    container.innerHTML = `
        <div class="p-8">
            <h2 class="text-xl font-semibold text-slate-100 mb-4">Registrar Nova Venda</h2>
            <div class="bg-slate-800 p-6 rounded-lg">
                <div class="text-center text-slate-400">
                    <i class="fas fa-tools fa-3x mb-4"></i>
                    <p>Formulário de registro de venda em desenvolvimento.</p>
                    <p class="text-sm mt-2">Esta funcionalidade será implementada em breve.</p>
                </div>
            </div>
        </div>
    `;
}

function renderSalesList(sales, container, userRole) {
    console.log("💰 Renderizando lista de vendas:", sales.length);
    
    container.innerHTML = '';
    
    // Título
    const title = document.createElement('h2');
    title.className = 'text-xl font-semibold text-slate-100 mb-4';
    title.textContent = userRole === 'Vendedor' ? 'Minhas Vendas' : 'Histórico de Vendas';
    container.appendChild(title);
    
    // Verificar se há vendas
    if (!sales || sales.length === 0) {
        const noSalesMsg = document.createElement('div');
        noSalesMsg.className = 'text-center py-8 text-slate-400';
        noSalesMsg.innerHTML = `
            <i class="fas fa-receipt fa-3x mb-4"></i>
            <p>Nenhuma venda encontrada.</p>
        `;
        container.appendChild(noSalesMsg);
        return;
    }
    
    // Tabela de vendas
    const table = createSalesTable(sales);
    container.appendChild(table);
}

function createSalesTable(sales) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden';
    
    // Cabeçalho
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-700';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Data</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Produtos</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vendedor</th>
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
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(sale.date)}</td>
            <td class="px-6 py-4 text-sm text-slate-200" title="${productNames}">${truncateText(productNames, 50)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-semibold">${formatCurrency(sale.total)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${sale.sellerName || 'N/A'}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    return table;
}

// === FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ===

function updateDashboardKPIs(salesStats, productStats, allProducts, currentUser) {
    console.log("📊 Atualizando KPIs para:", currentUser.role);
    
    const kpiCards = document.querySelectorAll('#kpiContainer .kpi-card');
    if (kpiCards.length < 4) return;
    
    // Referências aos elementos
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
    
    // Configurar KPIs baseado no papel do usuário
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

function renderSalesChart(salesStats) {
    const salesCtx = document.getElementById('salesChart');
    if (!salesCtx) return;
    
    // Destruir gráfico anterior se existir
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
    
    // Destruir gráfico anterior se existir
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

// === FUNÇÕES DE INTERFACE GERAL ===

function initializeUI(currentUser) {
    console.log("🎨 Inicializando interface para:", currentUser.role);
    
    updateUserInfo(currentUser);
    initializeNotifications();
    initializeSidebar(currentUser.role);
    
    // Mostrar mensagem de boas-vindas apenas uma vez por sessão
    if (document.getElementById('temporaryAlertsContainer') && 
        window.location.href.includes('dashboard.html') &&
        !sessionStorage.getItem('welcomeAlertShown')) {
        
        const userName = currentUser.name || currentUser.email.split('@')[0];
        showTemporaryAlert(`Bem-vindo, ${userName}! Sistema EliteControl.`, 'success', 5000);
        sessionStorage.setItem('welcomeAlertShown', 'true');
    }
}

function clearDashboardUI() {
    console.log("🧹 Limpando interface do dashboard");
    
    // Limpar informações do usuário
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
    
    // Limpar TODOS os gráficos (admin, vendedor e estoque)
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
    
    // Reset KPIs
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
    
    // Limpar atividades
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

function updateUserInfo(user) {
    if (!user) return;
    
    console.log("👤 Atualizando informações do usuário");
    
    // Calcular iniciais
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
    
    // Atualizar elementos da interface
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
    
    // Atualizar títulos da página
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

// === CONFIGURAÇÃO DE EVENT LISTENERS ===

function setupEventListeners() {
    console.log("🔧 Configurando event listeners");
    
    // Event listeners principais
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
    // Hash change para navegação SPA
    window.addEventListener('hashchange', handleHashChange);
    
    // Delegação de eventos para links de navegação
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

function setupModalListeners() {
    // Event listeners do modal serão configurados quando os elementos estiverem disponíveis
    document.addEventListener('click', function(e) {
        if (closeProductModalButton && e.target === closeProductModalButton) {
            closeProductModal();
        }
        if (cancelProductFormButton && e.target === cancelProductFormButton) {
            closeProductModal();
        }
    });
    
    // Form submit
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }
}

function setupDropdownListeners() {
    // Dropdown de notificações
    const notificationBellButton = document.getElementById('notificationBellButton');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBellButton && notificationDropdown) {
        notificationBellButton.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });
    }
    
    // Dropdown do usuário
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
    }
    
    // Fechar dropdowns quando clicar fora
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
    
    // Marcar notificações como lidas
    const markAllAsReadButton = document.getElementById('markAllAsReadButton');
    if (markAllAsReadButton) {
        markAllAsReadButton.addEventListener('click', markAllNotificationsAsRead);
    }
}

function setupProductActionListeners() {
    // Delegação de eventos para ações de produtos
    document.addEventListener('click', function(e) {
        // Editar produto
        const editButton = e.target.closest('.edit-product-btn');
        if (editButton) {
            e.preventDefault();
            const productId = editButton.dataset.productId;
            if (productId) {
                handleEditProduct(productId);
            }
        }
        
        // Excluir produto
        const deleteButton = e.target.closest('.delete-product-btn');
        if (deleteButton) {
            e.preventDefault();
            const productId = deleteButton.dataset.productId;
            const productName = deleteButton.dataset.productName;
            if (productId && productName) {
                handleDeleteProductConfirmation(productId, productName);
            }
        }
        
        // Abrir modal de adicionar produto
        const openModalButton = e.target.closest('#openAddProductModalButton');
        if (openModalButton) {
            e.preventDefault();
            openProductModal();
        }
    });
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
    console.log("🔑 Tentativa de login");
    
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const perfil = document.getElementById('perfil')?.value;
    
    // Validação
    if (!email || !password) {
        showLoginError('Por favor, preencha email e senha.');
        return;
    }
    
    if (!perfil) {
        showLoginError('Por favor, selecione seu perfil.');
        return;
    }
    
    // Estado do botão de login
    const loginButton = e.target.querySelector('button[type="submit"]');
    const originalText = loginButton?.textContent;
    
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
    }
    
    try {
        // Autenticar com Firebase
        await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Verificar se o perfil selecionado corresponde ao usuário
        const user = firebase.auth().currentUser;
        if (user) {
            let userData = await DataService.getUserData(user.uid);
            
            // Se não encontrou por UID, buscar por email
            if (!userData) {
                userData = await findUserByEmail(email);
            }
            
            // Se ainda não encontrou e é um usuário de teste, criar
            if (!userData && testUsers[email]) {
                userData = await createTestUser(user.uid, email);
            }
            
            // Verificar se o perfil corresponde
            if (userData && userData.role !== perfil) {
                await firebase.auth().signOut();
                showLoginError(`Perfil incorreto. Este usuário é ${userData.role}.`);
                return;
            }
        }
        
        showLoginError('');
        console.log("✅ Login realizado com sucesso");
        
    } catch (error) {
        console.error("❌ Erro de login:", error);
        
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
        }
        
        showLoginError(friendlyMessage);
        
    } finally {
        // Restaurar botão
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

// === FUNÇÕES AUXILIARES ===

function updateSidebarActiveState(currentSection) {
    // Remover classe active de todos os links
    document.querySelectorAll('#navLinks a.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Adicionar classe active ao link atual
    const activeLink = document.querySelector(`#navLinks a.nav-link[data-section="${currentSection}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function showCustomConfirm(message, onConfirm) {
    // Remover modal existente se houver
    const existingModal = document.getElementById('customConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Criar modal
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
    
    // Event listeners
    document.getElementById('cancelConfirm').onclick = () => modalBackdrop.remove();
    document.getElementById('confirmAction').onclick = () => {
        onConfirm();
        modalBackdrop.remove();
    };
    
    // Fechar com ESC
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

function initializeNotifications() {
    if (!document.getElementById('notificationCountBadge')) return;
    
    let notifications = JSON.parse(localStorage.getItem('elitecontrol_notifications') || '[]');
    
    // Criar notificações padrão se não existirem
    if (notifications.length === 0) {
        notifications = [
            {
                id: 'welcome',
                title: 'Bem-vindo!',
                message: 'Seu sistema EliteControl está pronto para uso.',
                time: 'Agora',
                read: false,
                type: 'success'
            },
            {
                id: 'tip',
                title: 'Dica do Sistema',
                message: 'Explore os relatórios para obter insights valiosos.',
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
    
    // Atualizar badge
    notificationBadge.textContent = unreadCount;
    notificationBadge.classList.toggle('hidden', unreadCount === 0);
    
    // Atualizar lista
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
    
    // Adicionar event listeners para marcar como lida
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
    
    // Renderizar links
    navLinksContainer.innerHTML = links.map(link => `
        <a href="#${link.section}" 
           class="nav-link ${isActive(link.section) ? 'active' : ''}" 
           data-section="${link.section}">
            <i class="fas ${link.icon} nav-link-icon"></i>
            <span>${link.text}</span>
        </a>
    `).join('');
}

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
    
    // Animar entrada
    setTimeout(() => alertDiv.classList.add('show'), 10);
    
    // Remover automaticamente
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    }, duration);
}

// === FUNÇÕES UTILITÁRIAS ===

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

// === EXPOR FUNÇÕES GLOBALMENTE (para compatibilidade) ===
window.handleEditProduct = handleEditProduct;
window.handleDeleteProductConfirmation = handleDeleteProductConfirmation;

console.log("✅ EliteControl main.js carregado com sucesso!");
