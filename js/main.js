if (getTitle(3)) getTitle(3).textContent = "Adicionar Produto";
            if (getValueEl(3) && !getValueEl(3).querySelector('#addProductFromKPIButton')) {
                getValueEl(3).innerHTML = `<button class="btn-primary" id="addProductFromKPIButton">Adicionar</button>`;
                setupKPIActionButton('addProductFromKPIButton', null, openProductModal);
            }
            break;

        case 'Dono/Gerente':
            if (getTitle(0)) getTitle(0).textContent = "Receita (Mês)";
            if (getValueEl(0)) getValueEl(0).textContent = formatCurrency(salesStats?.monthRevenue || 0);

            if (getTitle(1)) getTitle(1).textContent = "Vendas (Mês)";
            if (getValueEl(1)) getValueEl(1).textContent = salesStats?.monthSales || 0;

            if (getTitle(2)) getTitle(2).textContent = "Total Produtos";
            if (getValueEl(2)) getValueEl(2).textContent = productStats?.totalProducts || 0;

            if (getTitle(3)) getTitle(3).textContent = "Ver Vendas";
            if (getValueEl(3) && !getValueEl(3).querySelector('#viewReportsButton')) {
                getValueEl(3).innerHTML = `<button class="btn-primary" id="viewReportsButton">Ver</button>`;
                setupKPIActionButton('viewReportsButton', 'vendas');
            }
            break;
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

// === RENDERIZAÇÃO DE PRODUTOS ===

function renderProductsList(products, container, userRole) {
    console.log("📦 Renderizando lista de produtos");

    if (!container) return;

    const canEditProducts = userRole === 'Dono/Gerente' || userRole === 'Controlador de Estoque';

    container.innerHTML = `
        <div class="products-container">
            <div class="products-header mb-4 flex justify-between items-center">
                <h2 class="text-xl font-semibold text-slate-100">Gestão de Produtos</h2>
                ${canEditProducts ? `
                    <button id="openAddProductModalButton" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>
                        Adicionar Produto
                    </button>
                ` : ''}
            </div>

            <div class="search-container mb-6">
                <div class="relative">
                    <input type="text" 
                           id="productSearchField"
                           class="form-input pl-10 w-full"
                           placeholder="Buscar produtos...">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                </div>
            </div>

            <div id="productsTable" class="products-table-container">
                ${renderProductsTable(products, canEditProducts)}
            </div>
        </div>
    `;

    setupProductSearch(products, canEditProducts);
}

function renderProductsTable(products, canEdit) {
    if (!products || products.length === 0) {
        return `
            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-box-open fa-3x mb-4"></i>
                <p>Nenhum produto encontrado.</p>
                ${canEdit ? '<p class="text-sm mt-2">Clique em "Adicionar Produto" para começar.</p>' : ''}
            </div>
        `;
    }

    return `
        <table class="min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden">
            <thead class="bg-slate-700">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Produto</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Categoria</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Preço</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estoque</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    ${canEdit ? '<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>' : ''}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
                ${products.map(product => renderProductRow(product, canEdit)).join('')}
            </tbody>
        </table>
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
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-200">${product.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${product.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-300">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${product.stock} unidades</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${statusClass}">
                <i class="fas ${statusIcon} mr-2"></i>
                ${statusText}
            </td>
            ${canEdit ? `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center gap-2">
                        <button class="btn-secondary btn-sm edit-product-btn" 
                                data-product-id="${product.id}"
                                title="Editar produto">
                            <i class="fas fa-edit mr-1"></i>
                            Editar
                        </button>
                        <button class="btn-danger btn-sm delete-product-btn" 
                                data-product-id="${product.id}" 
                                data-product-name="${product.name}"
                                title="Excluir produto">
                            <i class="fas fa-trash mr-1"></i>
                            Excluir
                        </button>
                    </div>
                </td>
            ` : ''}
        </tr>
    `;
}

function setupProductSearch(allProducts, canEdit) {
    const searchField = document.getElementById('productSearchField');
    if (!searchField) return;

    searchField.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );

        const tableContainer = document.getElementById('productsTable');
        if (tableContainer) {
            tableContainer.innerHTML = renderProductsTable(filteredProducts, canEdit);
        }
    });
}

function renderProductsConsult(products, container, userRole) {
    console.log("🔍 Renderizando consulta de produtos");

    container.innerHTML = `
        <div class="products-consult-container">
            <h2 class="text-xl font-semibold text-slate-100 mb-4">Consultar Produtos</h2>

            <div class="search-section mb-6">
                <div class="search-bar bg-slate-800 p-4 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </div>

                    <div class="mt-4 flex items-center justify-between">
                        <div class="text-sm text-slate-400">
                            <span id="searchResultsCount">${products.length}</span> produtos encontrados
                        </div>

                        <button id="clearFiltersButton" class="btn-secondary btn-sm">
                            <i class="fas fa-times mr-1"></i> Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <div id="productsConsultList" class="products-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
        </div>
    `;

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
                <p>Nenhum produto encontrado.</p>
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
            <div class="product-consult-card bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-sky-500 transition-colors">
                <div class="product-header flex justify-between items-start mb-3">
                    <h3 class="product-name font-semibold text-slate-100">${product.name}</h3>
                    <span class="stock-badge ${stockClass} px-2 py-1 text-xs rounded-full">${stockLabel}</span>
                </div>

                <div class="product-info space-y-2 mb-4">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Categoria:</span>
                        <span class="text-slate-300">${product.category}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Preço:</span>
                        <span class="text-sky-400 font-semibold">${formatCurrency(product.price)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Estoque:</span>
                        <span class="text-slate-300">${product.stock} unidades</span>
                    </div>
                </div>

                ${product.stock > 0 ? `
                    <button class="btn-primary btn-sm w-full"
                            onclick="window.location.hash='#registrar-venda'">
                        <i class="fas fa-shopping-cart mr-2"></i>
                        Vender
                    </button>
                ` : `
                    <button class="btn-secondary btn-sm w-full" disabled>
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
    const clearButton = document.getElementById('clearFiltersButton');
    const resultsCount = document.getElementById('searchResultsCount');

    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;

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

        resultsCount.textContent = filtered.length;
        renderFilteredProducts(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            categoryFilter.value = '';
            applyFilters();
        });
    }
}

// === RENDERIZAÇÃO DE VENDAS ===

function renderSalesList(sales, container, userRole, isPersonal = false) {
    console.log(`💰 Renderizando ${isPersonal ? 'minhas vendas' : 'lista de vendas'}:`, sales.length);

    container.innerHTML = `
        <div class="sales-container">
            <h2 class="text-xl font-semibold text-slate-100 mb-4">${isPersonal ? 'Minhas Vendas' : 'Histórico de Vendas'}</h2>

            ${!sales || sales.length === 0 ? `
                <div class="text-center py-8 text-slate-400">
                    <i class="fas fa-receipt fa-3x mb-4"></i>
                    <p>${isPersonal ? 'Você ainda não realizou nenhuma venda.' : 'Nenhuma venda encontrada.'}</p>
                    ${isPersonal ? '<p class="text-sm mt-2">Comece registrando sua primeira venda!</p>' : ''}
                </div>
            ` : `
                <div class="sales-table-container bg-slate-800 rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-slate-700">
                        <thead class="bg-slate-700">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Data</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cliente</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Produtos</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total</th>
                                ${!isPersonal ? '<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vendedor</th>' : ''}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            ${sales.map(sale => renderSaleRow(sale, isPersonal)).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

function renderSaleRow(sale, isPersonal) {
    const productNames = sale.productsDetail && Array.isArray(sale.productsDetail) && sale.productsDetail.length > 0
        ? sale.productsDetail.map(p => `${p.name} (x${p.quantity})`).join(', ')
        : 'N/A';

    const customerInfo = sale.customerName || 'Cliente não identificado';

    return `
        <tr class="hover:bg-slate-750 transition-colors duration-150">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(sale.date)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-200">${customerInfo}</td>
            <td class="px-6 py-4 text-sm text-slate-200" title="${productNames}">${truncateText(productNames, 50)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-semibold">${formatCurrency(sale.total)}</td>
            ${!isPersonal ? `<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${sale.sellerName || 'N/A'}</td>` : ''}
        </tr>
    `;
}

// === SEÇÃO DE VENDAS ===

function renderRegisterSaleForm(container, currentUser) {
    container.innerHTML = `
        <div class="register-sale-container">
            <div class="page-header mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-semibold text-slate-100">Registrar Nova Venda</h2>
                        <p class="text-sm text-slate-400">Sistema simplificado de vendas</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-slate-400">Vendedor: ${currentUser.name || currentUser.email}</p>
                        <p class="text-sm text-slate-400" id="currentDateTime"></p>
                    </div>
                </div>
            </div>

            <div class="sale-form bg-slate-800 rounded-lg p-6">
                <form id="simpleSaleForm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="form-group">
                            <label for="customerName" class="form-label">Nome do Cliente</label>
                            <input type="text"
                                   id="customerName"
                                   class="form-input"
                                   placeholder="Nome completo do cliente"
                                   required>
                        </div>

                        <div class="form-group">
                            <label for="customerPhone" class="form-label">Telefone (opcional)</label>
                            <input type="tel"
                                   id="customerPhone"
                                   class="form-input"
                                   placeholder="(00) 00000-0000">
                        </div>
                    </div>

                    <div class="form-group mb-6">
                        <label for="saleProducts" class="form-label">Produtos Vendidos</label>
                        <textarea id="saleProducts"
                                  class="form-input"
                                  rows="4"
                                  placeholder="Descreva os produtos vendidos (ex: 1x Notebook Dell - R$ 2500,00)..."
                                  required></textarea>
                        <small class="form-help">
                            Descreva os produtos de forma simples. Ex: "1x Notebook Dell - R$ 2500,00"
                        </small>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="form-group">
                            <label for="saleTotal" class="form-label">Valor Total (R$)</label>
                            <input type="number"
                                   id="saleTotal"
                                   class="form-input"
                                   step="0.01"
                                   min="0"
                                   placeholder="0,00"
                                   required>
                        </div>

                        <div class="form-group">
                            <label for="paymentMethod" class="form-label">Forma de Pagamento</label>
                            <select id="paymentMethod" class="form-select">
                                <option value="money">Dinheiro</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                                <option value="transfer">Transferência</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancelSaleButton" class="btn-secondary">
                            <i class="fas fa-times mr-2"></i>
                            Cancelar
                        </button>
                        <button type="submit" id="submitSaleButton" class="btn-primary">
                            <i class="fas fa-check mr-2"></i>
                            Registrar Venda
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    setupSimpleSaleForm(currentUser);
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
}

function setupSimpleSaleForm(currentUser) {
    const form = document.getElementById('simpleSaleForm');
    const cancelButton = document.getElementById('cancelSaleButton');

    if (form) {
        form.addEventListener('submit', (e) => handleSimpleSaleSubmit(e, currentUser));
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            form.reset();
            showTemporaryAlert('Formulário limpo', 'info');
        });
    }

    // Máscara de telefone
    const phoneInput = document.getElementById('customerPhone');
    if (phoneInput) {
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
    }
}

async function handleSimpleSaleSubmit(e, currentUser) {
    e.preventDefault();

    const submitButton = document.getElementById('submitSaleButton');
    const originalText = submitButton.innerHTML;

    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.replace(/\D/g, '');
    const saleProducts = document.getElementById('saleProducts').value.trim();
    const saleTotal = parseFloat(document.getElementById('saleTotal').value);
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!customerName || !saleProducts || !saleTotal || saleTotal <= 0) {
        showTemporaryAlert('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';

    try {
        if (!window.DataService) {
            throw new Error("DataService não está disponível");
        }

        // Criar venda simplificada
        const saleData = {
            date: new Date(),
            paymentMethod
        };

        const productDetails = [{
            productId: 'simple-sale-' + Date.now(),
            name: saleProducts,
            quantity: 1,
            unitPrice: saleTotal,
            category: 'Venda Simplificada'
        }];

        const customerData = customerName ? {
            name: customerName,
            phone: customerPhone || '',
            id: null // Cliente temporário
        } : null;

        // Registrar venda (sem controle de estoque para venda simplificada)
        const newSale = await registerSimpleSale(saleData, productDetails, currentUser.name || currentUser.email, customerData, saleTotal);

        // Limpar formulário
        document.getElementById('simpleSaleForm').reset();

        // Mostrar sucesso
        showSaleSuccessModal({
            id: newSale.id,
            total: saleTotal,
            customerName: customerName,
            productsDetail: productDetails
        });

        console.log("✅ Venda simplificada registrada:", newSale);

    } catch (error) {
        console.error("❌ Erro ao registrar venda:", error);
        showTemporaryAlert(`Erro ao registrar venda: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

async function registerSimpleSale(saleData, productDetails, sellerName, customerData, total) {
    // Registrar venda diretamente no Firestore sem controle de estoque
    const salePayload = {
        date: getServerTimestamp(),
        sellerId: auth?.currentUser?.uid || 'unknown',
        sellerName: sellerName,
        productsDetail: productDetails,
        total: total,
        createdAt: getServerTimestamp(),
        status: 'completed',
        paymentMethod: saleData.paymentMethod || 'money',
        type: 'simple' // Marcar como venda simplificada
    };

    if (customerData && customerData.name) {
        salePayload.customerName = customerData.name;
        salePayload.customerPhone = customerData.phone;
    }

    const docRef = await db.collection('sales').add(salePayload);
    return { id: docRef.id, ...salePayload };
}

function showSaleSuccessModal(sale) {
    const totalItems = sale.productsDetail ? sale.productsDetail.length : 0;
    const customerName = sale.customerName || 'Cliente';
    
    const modalContent = `
        <div class="text-center mb-6">
            <i class="fas fa-check-circle text-green-400 text-5xl mb-4"></i>
            <h3 class="text-xl font-semibold text-slate-100 mb-2">Venda Registrada!</h3>
            <p class="text-slate-400">Venda para ${customerName}</p>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-center mb-2">
                <span class="text-slate-400">Total da venda:</span>
                <span class="text-xl font-bold text-green-400">${formatCurrency(sale.total)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Itens vendidos:</span>
                <span class="text-slate-100">${totalItems} ${totalItems === 1 ? 'item' : 'itens'}</span>
            </div>
        </div>
        <div class="flex justify-center">
            <button onclick="closeCustomModal()" class="btn-primary">
                <i class="fas fa-check mr-2"></i>
                OK
            </button>
        </div>
    `;

    showCustomModal('Venda Concluída', modalContent);
}

// === SEÇÃO DE CLIENTES (SIMPLIFICADA) ===

async function renderCustomersSection(container, currentUser) {
    console.log("👥 Renderizando seção de clientes");

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
        let customers = [];
        
        if (window.CRMService) {
            customers = await CRMService.getCustomers();
        }

        container.innerHTML = `
            <div class="customers-container">
                <h2 class="text-xl font-semibold text-slate-100 mb-4">Gerenciamento de Clientes</h2>

                ${!window.CRMService ? `
                    <div class="text-center py-8 text-yellow-400">
                        <i class="fas fa-exclamation-triangle fa-3x mb-4"></i>
                        <p>Serviço de CRM não disponível</p>
                        <p class="text-sm mt-2">Funcionalidades limitadas</p>
                    </div>
                ` : `
                    <div class="customers-stats grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="kpi-card">
                            <div class="kpi-icon-wrapper">
                                <i class="fas fa-users kpi-icon"></i>
                            </div>
                            <div class="kpi-content">
                                <div class="kpi-title">Total de Clientes</div>
                                <div class="kpi-value">${customers.length}</div>
                            </div>
                        </div>

                        <div class="kpi-card">
                            <div class="kpi-icon-wrapper">
                                <i class="fas fa-star kpi-icon"></i>
                            </div>
                            <div class="kpi-content">
                                <div class="kpi-title">Clientes com Compras</div>
                                <div class="kpi-value">${customers.filter(c => (c.totalPurchases || 0) > 0).length}</div>
                            </div>
                        </div>

                        <div class="kpi-card">
                            <div class="kpi-icon-wrapper">
                                <i class="fas fa-dollar-sign kpi-icon"></i>
                            </div>
                            <div class="kpi-content">
                                <div class="kpi-title">Receita Total</div>
                                <div class="kpi-value">${formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}</div>
                            </div>
                        </div>
                    </div>

                    ${customers.length === 0 ? `
                        <div class="text-center py-8 text-slate-400">
                            <i class="fas fa-users fa-3x mb-4"></i>
                            <p>Nenhum cliente cadastrado ainda</p>
                            <p class="text-sm mt-2">Os clientes aparecerão aqui conforme as vendas forem registradas</p>
                        </div>
                    ` : `
                        <div class="customers-table-container bg-slate-800 rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-slate-700">
                                <thead class="bg-slate-700">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cliente</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contato</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Compras</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total Gasto</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Última Compra</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-700">
                                    ${customers.map(customer => `
                                        <tr class="hover:bg-slate-750 transition-colors duration-150">
                                            <td class="px-6 py-4">
                                                <div class="flex items-center">
                                                    <div class="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                                                        <i class="fas fa-user text-slate-400"></i>
                                                    </div>
                                                    <div class="ml-4">
                                                        <div class="text-sm font-medium text-slate-200">${customer.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-300">${customer.phone || 'N/A'}</div>
                                                ${customer.email ? `<div class="text-sm text-slate-400">${customer.email}</div>` : ''}
                                            </td>
                                            <td class="px-6 py-4 text-sm text-slate-300">
                                                ${customer.totalPurchases || 0} compras
                                            </td>
                                            <td class="px-6 py-4 text-sm text-slate-300">
                                                ${formatCurrency(customer.totalSpent || 0)}
                                            </td>
                                            <td class="px-6 py-4 text-sm text-slate-300">
                                                ${customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate.toDate()) : 'Nunca'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                `}
            </div>
        `;

    } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-times-circle fa-3x mb-4"></i>
                <p>Erro ao carregar dados dos clientes</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// === EVENT LISTENERS ===

function setupEventListeners() {
    console.log("🔧 Configurando event listeners gerais");

    setupFormListeners();
    setupNavigationListeners();
    setupDropdownListeners();
    setupProductActionListeners();

    console.log("✅ Event listeners configurados");
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
    console.log("🔧 Configurando listeners de produtos com delegação de eventos");
    
    document.addEventListener('click', function(e) {
        // Botão de adicionar produto
        if (e.target.closest('#openAddProductModalButton')) {
            e.preventDefault();
            console.log("🔘 Botão adicionar produto clicado");
            
            if (!EliteControl.elements.productModal) {
                initializeModalElements();
            }
            
            if (!EliteControl.state.modalEventListenersAttached && EliteControl.elements.productModal) {
                setupModalEventListeners();
            }
            
            openProductModal();
            return;
        }

        // Botão de editar produto
        const editButton = e.target.closest('.edit-product-btn');
        if (editButton) {
            e.preventDefault();
            console.log("✏️ Botão editar produto clicado");
            const productId = editButton.dataset.productId;
            
            if (productId) {
                if (!EliteControl.elements.productModal) {
                    initializeModalElements();
                }
                
                if (!EliteControl.state.modalEventListenersAttached && EliteControl.elements.productModal) {
                    setupModalEventListeners();
                }
                
                handleEditProduct(productId);
            }
            return;
        }

        // Botão de excluir produto
        const deleteButton = e.target.closest('.delete-product-btn');
        if (deleteButton) {
            e.preventDefault();
            console.log("🗑️ Botão excluir produto clicado");
            const productId = deleteButton.dataset.productId;
            const productName = deleteButton.dataset.productName;
            
            if (productId && productName) {
                handleDeleteProductConfirmation(productId, productName);
            }
            return;
        }
    });
}

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

function updateSidebarActiveState(currentSection) {
    document.querySelectorAll('#navLinks a.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`#navLinks a.nav-link[data-section="${currentSection}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

async function handleEditProduct(productId) {
    console.log("✏️ Editando produto:", productId);

    try {
        if (!window.DataService) {
            throw new Error("DataService não está disponível");
        }

        showTemporaryAlert('Carregando dados do produto...', 'info', 2000);
        
        const product = await DataService.getProductById(productId);
        
        if (product) {
            console.log("✅ Produto encontrado:", product);
            openProductModal(product);
        } else {
            console.error("❌ Produto não encontrado:", productId);
            showTemporaryAlert('Produto não encontrado', 'error');
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produto:", error);
        showTemporaryAlert('Erro ao carregar dados do produto', 'error');
    }
}

function handleDeleteProductConfirmation(productId, productName) {
    console.log("🗑️ Confirmando exclusão do produto:", productName);

    showCustomConfirm(
        `Tem certeza que deseja excluir o produto "${productName}"?\n\nEsta ação não pode ser desfeita.`,
        async () => {
            try {
                if (!window.DataService) {
                    throw new Error("DataService não está disponível");
                }

                await DataService.deleteProduct(productId);
                showTemporaryAlert(`Produto "${productName}" excluído com sucesso`, 'success');
                await reloadProductsIfNeeded();
            } catch (error) {
                console.error("❌ Erro ao excluir produto:", error);
                showTemporaryAlert(`Erro ao excluir produto: ${error.message}`, 'error');
            }
        }
    );
}

// === FUNÇÕES AUXILIARES ===

async function ensureTestDataExists() {
    try {
        if (!window.DataService) {
            console.warn("⚠️ DataService não disponível para criar dados de teste");
            return;
        }

        const products = await DataService.getProducts();

        if (!products || products.length === 0) {
            console.log("📦 Criando produtos de exemplo...");
            for (const product of sampleProducts) {
                await DataService.addProduct(product);
            }
            console.log("✅ Produtos de exemplo criados");
        }
    } catch (error) {
        console.warn("⚠️ Erro ao verificar dados de exemplo:", error);
    }
}

async function findUserByEmail(email) {
    if (!window.db) return null;
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
    if (!window.db) return null;
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

async function reloadProductsIfNeeded() {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        const userRole = localStorage.getItem('elitecontrol_user_role');
        const currentSection = window.location.hash.substring(1);
        const productSectionForRole = (userRole === 'Vendedor' ? 'produtos-consulta' : 'produtos');

        if (currentSection === productSectionForRole || currentSection === 'produtos' || currentSection === 'produtos-consulta') {
            console.log(`Recarregando seção de produtos após modificação`);
            await loadSectionContent(currentSection, {
                uid: currentUser.uid,
                email: currentUser.email,
                role: userRole
            });
        }
    }
}

function updateCurrentTime() {
    const element = document.getElementById('currentDateTime');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    }
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
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '400px';

    modalContent.innerHTML = `
        <div class="modal-header">
            <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl mr-3"></i>
            <h3 class="modal-title">Confirmação</h3>
        </div>
        <div class="modal-body">
            <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" id="cancelConfirm">
                Cancelar
            </button>
            <button class="btn-danger" id="confirmAction">
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

function showCustomModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.display = 'flex';
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
    setTimeout(() => modal.classList.add('visible'), 50);
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
        return "Data inválida";
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

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// Verificar se CRM Service está disponível
function isCRMServiceAvailable() {
    return typeof window.CRMService !== 'undefined' && 
           typeof window.CRMService.getCustomers === 'function';
}

// === FUNÇÕES GLOBAIS EXPOSTAS ===

window.openProductModal = openProductModal;
window.closeCustomModal = closeCustomModal;

// Log de inicialização
console.log("✅ EliteControl v2.0 - main.js carregado e corrigido!");
console.log("🔧 Melhorias implementadas:");
console.log("   - Sistema de vendas simplificado");
console.log("   - Verificação robusta de serviços");
console.log("   - Tratamento de erros melhorado");
console.log("   - Interface responsiva e moderna");
console.log("   - Compatibilidade com Firebase v8");
// js/main.js - Sistema EliteControl v2.0 - CORRIGIDO E OTIMIZADO

// Namespace para o EliteControl
const EliteControl = {
    // Elementos do modal de produto
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
    
    // Estado da aplicação
    state: {
        modalEventListenersAttached: false,
        isModalProcessing: false,
        saleCart: [],
        availableProducts: [],
        selectedCustomer: null,
        isInitialized: false
    },
    
    // Dados de usuários de teste
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

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 EliteControl v2.0 inicializando...');

    try {
        // Aguardar serviços essenciais
        await waitForEssentialServices();
        
        // Inicializar componentes
        initializeModalElements();
        setupEventListeners();
        
        // Verificar se Firebase Auth está disponível
        if (window.firebase && window.firebase.auth) {
            firebase.auth().onAuthStateChanged(handleAuthStateChange);
        } else {
            console.error("❌ Firebase Auth não disponível");
            showTemporaryAlert("Erro: Sistema de autenticação não disponível", "error");
        }

        EliteControl.state.isInitialized = true;
        console.log('✅ EliteControl inicializado com sucesso');

    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showTemporaryAlert("Erro na inicialização do sistema", "error");
    }
});

// Função para verificar se todos os serviços estão carregados
function checkServicesLoaded() {
    const requiredServices = ['firebase', 'db', 'auth', 'DataService'];
    const optionalServices = ['CRMService'];
    
    let allRequired = true;
    let servicesStatus = {};
    
    requiredServices.forEach(service => {
        const exists = window[service] !== undefined;
        servicesStatus[service] = exists;
        if (!exists) allRequired = false;
    });
    
    optionalServices.forEach(service => {
        servicesStatus[service] = window[service] !== undefined;
    });
    
    console.log("📊 Status dos serviços:", servicesStatus);
    return { allRequired, servicesStatus };
}

// Aguardar serviços essenciais estarem carregados
function waitForEssentialServices() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos com intervalos de 100ms
        
        const checkInterval = setInterval(() => {
            attempts++;
            const { allRequired } = checkServicesLoaded();
            
            if (allRequired) {
                clearInterval(checkInterval);
                console.log("✅ Todos os serviços essenciais carregados");
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn("⚠️ Timeout ao aguardar serviços - continuando com o que está disponível");
                resolve(); // Não rejeitar, apenas continuar
            }
        }, 100);
    });
}

// === MODAL DE PRODUTOS ===

function initializeModalElements() {
    console.log("🔧 Inicializando elementos do modal de produto");
    
    // Verificar se o modal existe no DOM
    const modalElement = document.getElementById('productModal');
    if (!modalElement) {
        console.warn("⚠️ Modal de produto não encontrado no DOM - pode não estar na página atual");
        return false;
    }
    
    EliteControl.elements.productModal = modalElement;
    EliteControl.elements.productForm = document.getElementById('productForm');
    EliteControl.elements.productModalTitle = document.getElementById('productModalTitle');
    EliteControl.elements.productIdField = document.getElementById('productId');
    EliteControl.elements.productNameField = document.getElementById('productName');
    EliteControl.elements.productCategoryField = document.getElementById('productCategory');
    EliteControl.elements.productPriceField = document.getElementById('productPrice');
    EliteControl.elements.productStockField = document.getElementById('productStock');
    EliteControl.elements.productLowStockAlertField = document.getElementById('productLowStockAlert');
    EliteControl.elements.closeProductModalButton = document.getElementById('closeProductModalButton');
    EliteControl.elements.cancelProductFormButton = document.getElementById('cancelProductFormButton');
    EliteControl.elements.saveProductButton = document.getElementById('saveProductButton');
    
    console.log("✅ Elementos do modal inicializados");
    return true;
}

function setupModalEventListeners() {
    console.log("🔧 Configurando event listeners do modal de produto");

    if (EliteControl.elements.closeProductModalButton) {
        EliteControl.elements.closeProductModalButton.addEventListener('click', handleModalClose);
    }

    if (EliteControl.elements.cancelProductFormButton) {
        EliteControl.elements.cancelProductFormButton.addEventListener('click', handleModalClose);
    }

    if (EliteControl.elements.productForm) {
        EliteControl.elements.productForm.addEventListener('submit', handleProductFormSubmit);
    }

    if (EliteControl.elements.productModal) {
        EliteControl.elements.productModal.addEventListener('click', (e) => {
            if (e.target === EliteControl.elements.productModal && !EliteControl.state.isModalProcessing) {
                handleModalClose();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && 
            EliteControl.elements.productModal && 
            !EliteControl.elements.productModal.classList.contains('hidden') && 
            !EliteControl.state.isModalProcessing) {
            handleModalClose();
        }
    });
    
    EliteControl.state.modalEventListenersAttached = true;
}

function handleModalClose() {
    if (EliteControl.state.isModalProcessing) {
        console.log("⚠️ Modal está processando, cancelamento bloqueado");
        return;
    }

    console.log("❌ Fechando modal de produto");

    try {
        if (EliteControl.elements.productForm) EliteControl.elements.productForm.reset();

        // Limpar campos específicos
        const fields = [
            'productIdField', 'productNameField', 'productCategoryField', 
            'productPriceField', 'productStockField', 'productLowStockAlertField'
        ];
        
        fields.forEach(fieldName => {
            if (EliteControl.elements[fieldName]) {
                EliteControl.elements[fieldName].value = '';
            }
        });

        if (EliteControl.elements.saveProductButton) {
            EliteControl.elements.saveProductButton.disabled = false;
            EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }

        if (EliteControl.elements.productModal) {
            EliteControl.elements.productModal.classList.add('hidden');
        }

        console.log("✅ Modal fechado com sucesso");

    } catch (error) {
        console.error("❌ Erro ao fechar modal:", error);
        if (EliteControl.elements.productModal) {
            EliteControl.elements.productModal.classList.add('hidden');
        }
    }
}

function openProductModal(product = null) {
    console.log("📝 Abrindo modal de produto:", product ? 'Editar' : 'Novo');
    
    // Verificar disponibilidade dos serviços
    if (!window.DataService) {
        console.error("❌ DataService não disponível");
        showTemporaryAlert("Serviço de dados não disponível", "error");
        return;
    }
    
    // Inicializar elementos se necessário
    if (!EliteControl.elements.productModal) {
        const success = initializeModalElements();
        if (!success) {
            console.error("❌ Falha ao inicializar elementos do modal");
            showTemporaryAlert("Modal de produto não disponível nesta página", "error");
            return;
        }
    }

    // Configurar event listeners se necessário
    if (!EliteControl.state.modalEventListenersAttached) {
        setupModalEventListeners();
    }

    // Resetar formulário
    if (EliteControl.elements.productForm) {
        EliteControl.elements.productForm.reset();
    }

    if (product) {
        // Modo edição
        if (EliteControl.elements.productModalTitle) 
            EliteControl.elements.productModalTitle.textContent = 'Editar Produto';
        if (EliteControl.elements.productIdField) 
            EliteControl.elements.productIdField.value = product.id;
        if (EliteControl.elements.productNameField) 
            EliteControl.elements.productNameField.value = product.name;
        if (EliteControl.elements.productCategoryField) 
            EliteControl.elements.productCategoryField.value = product.category;
        if (EliteControl.elements.productPriceField) 
            EliteControl.elements.productPriceField.value = product.price;
        if (EliteControl.elements.productStockField) 
            EliteControl.elements.productStockField.value = product.stock;
        if (EliteControl.elements.productLowStockAlertField) 
            EliteControl.elements.productLowStockAlertField.value = product.lowStockAlert || 10;
        
        console.log("✅ Produto carregado para edição:", product.name);
    } else {
        // Modo criação
        if (EliteControl.elements.productModalTitle) 
            EliteControl.elements.productModalTitle.textContent = 'Adicionar Novo Produto';
        if (EliteControl.elements.productIdField) 
            EliteControl.elements.productIdField.value = '';
        if (EliteControl.elements.productLowStockAlertField) 
            EliteControl.elements.productLowStockAlertField.value = 10;
        
        console.log("✅ Modal configurado para novo produto");
    }

    // Mostrar modal
    if (EliteControl.elements.productModal) {
        EliteControl.elements.productModal.classList.remove('hidden');
        console.log("✅ Modal exibido");
    }
    
    // Focar no primeiro campo
    if (EliteControl.elements.productNameField) {
        setTimeout(() => {
            EliteControl.elements.productNameField.focus();
        }, 100);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    if (EliteControl.state.isModalProcessing) {
        console.log("⚠️ Formulário já está sendo processado");
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
        lowStockAlert: parseInt(EliteControl.elements.productLowStockAlertField?.value || 10),
        description: document.getElementById('productDescription')?.value?.trim() || ''
    };

    if (EliteControl.elements.saveProductButton) {
        EliteControl.elements.saveProductButton.disabled = true;
        EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
    }

    try {
        if (!window.DataService) {
            throw new Error("DataService não está disponível");
        }

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
        showTemporaryAlert('Erro ao salvar produto: ' + error.message, 'error');
    } finally {
        EliteControl.state.isModalProcessing = false;

        if (EliteControl.elements.saveProductButton) {
            EliteControl.elements.saveProductButton.disabled = false;
            EliteControl.elements.saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }
    }
}

function validateProductForm() {
    const requiredFields = {
        productNameField: 'Nome do produto',
        productCategoryField: 'Categoria',
        productPriceField: 'Preço',
        productStockField: 'Estoque',
        productLowStockAlertField: 'Alerta de estoque baixo'
    };

    for (const [fieldName, label] of Object.entries(requiredFields)) {
        if (!EliteControl.elements[fieldName]) {
            showTemporaryAlert(`Campo ${label} não encontrado`, "error");
            return false;
        }
    }

    const name = EliteControl.elements.productNameField.value.trim();
    const category = EliteControl.elements.productCategoryField.value.trim();
    const price = parseFloat(EliteControl.elements.productPriceField.value);
    const stock = parseInt(EliteControl.elements.productStockField.value);
    const lowStockAlert = parseInt(EliteControl.elements.productLowStockAlertField.value);

    if (!name) {
        showTemporaryAlert("Nome do produto é obrigatório", "warning");
        EliteControl.elements.productNameField.focus();
        return false;
    }

    if (!category) {
        showTemporaryAlert("Categoria é obrigatória", "warning");
        EliteControl.elements.productCategoryField.focus();
        return false;
    }

    if (isNaN(price) || price < 0) {
        showTemporaryAlert("Preço deve ser um número válido e não negativo", "warning");
        EliteControl.elements.productPriceField.focus();
        return false;
    }

    if (isNaN(stock) || stock < 0) {
        showTemporaryAlert("Estoque deve ser um número válido e não negativo", "warning");
        EliteControl.elements.productStockField.focus();
        return false;
    }

    if (isNaN(lowStockAlert) || lowStockAlert < 1) {
        showTemporaryAlert("Alerta de estoque baixo deve ser um número válido maior que 0", "warning");
        EliteControl.elements.productLowStockAlertField.focus();
        return false;
    }

    return true;
}

// === AUTENTICAÇÃO ===

async function handleAuthStateChange(user) {
    console.log('🔐 Estado de autenticação alterado:', user ? 'Logado' : 'Deslogado');

    if (user) {
        try {
            await ensureTestDataExists();
            
            if (!window.DataService) {
                throw new Error("DataService não está disponível");
            }
            
            let userData = await DataService.getUserData(user.uid);

            if (!userData) {
                userData = await findUserByEmail(user.email);
            }

            if (!userData && EliteControl.testUsers[user.email]) {
                userData = await createTestUser(user.uid, user.email);
            }

            if (userData && userData.role) {
                localStorage.setItem('elitecontrol_user_role', userData.role);
                const currentUser = { uid: user.uid, email: user.email, ...userData };

                initializeUI(currentUser);
                await handleNavigation(currentUser);

            } else {
                console.error('Dados do usuário ou cargo não encontrados para:', user.email);
                showTemporaryAlert('Não foi possível carregar os dados do seu perfil', 'error');
                await firebase.auth().signOut();
            }

        } catch (error) {
            console.error("❌ Erro no processo de autenticação:", error);
            showTemporaryAlert("Erro ao carregar dados do usuário", "error");

            if (!window.location.pathname.includes('index.html')) {
                await firebase.auth().signOut();
            }
        }
    } else {
        handleLoggedOut();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    console.log("🔑 Tentativa de login");

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const perfil = document.getElementById('perfil')?.value;

    if (!email || !password) {
        showLoginError('Por favor, preencha email e senha.');
        return;
    }

    if (!perfil) {
        showLoginError('Por favor, selecione seu perfil.');
        return;
    }

    const loginButton = e.target.querySelector('button[type="submit"]');
    const originalText = loginButton?.innerHTML;

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="loading-spinner"></span> Entrando...';
    }

    try {
        if (!window.firebase?.auth) {
            throw new Error("Firebase Auth não está disponível");
        }

        await firebase.auth().signInWithEmailAndPassword(email, password);

        const user = firebase.auth().currentUser;
        if (user) {
            if (!window.DataService) {
                throw new Error("DataService não está disponível");
            }

            let userData = await DataService.getUserData(user.uid);

            if (!userData) {
                userData = await findUserByEmail(email);
            }

            if (!userData && EliteControl.testUsers[email]) {
                userData = await createTestUser(user.uid, email);
            }

            if (userData && userData.role === perfil) {
                showLoginError('');
                console.log("✅ Login bem-sucedido");
            } else if (userData && userData.role !== perfil) {
                await firebase.auth().signOut();
                showLoginError(`Perfil selecionado não corresponde ao perfil do usuário`);
            } else {
                await firebase.auth().signOut();
                showLoginError('Não foi possível verificar os dados do perfil');
            }
        }

    } catch (error) {
        console.error("❌ Erro de login:", error);

        let friendlyMessage = "Email ou senha inválidos";

        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                friendlyMessage = "Usuário não encontrado ou credenciais incorretas";
                break;
            case 'auth/wrong-password':
                friendlyMessage = "Senha incorreta";
                break;
            case 'auth/invalid-email':
                friendlyMessage = "Formato de email inválido";
                break;
            case 'auth/network-request-failed':
                friendlyMessage = "Erro de rede. Verifique sua conexão";
                break;
            case 'auth/too-many-requests':
                friendlyMessage = "Muitas tentativas. Tente novamente mais tarde";
                break;
            default:
                friendlyMessage = error.message || "Erro no sistema de autenticação";
        }

        showLoginError(friendlyMessage);

    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = originalText;
        }
    }
}

async function handleLogout() {
    console.log("👋 Fazendo logout");

    try {
        if (!window.firebase?.auth) {
            throw new Error("Firebase Auth não está disponível");
        }

        await firebase.auth().signOut();
        sessionStorage.removeItem('welcomeAlertShown');
        window.location.hash = '';
        console.log("✅ Logout realizado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao fazer logout:", error);
        showTemporaryAlert('Erro ao sair. Tente novamente', 'error');
    }
}

// === NAVEGAÇÃO ===

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
        const targetSection = section || defaultSection;

        await loadSectionContent(targetSection, currentUser);
        updateSidebarActiveState(targetSection);
    } else {
        console.log("🔄 Redirecionando para dashboard...");
        window.location.href = 'dashboard.html';
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
    console.log("🔒 Usuário deslogado");
    localStorage.removeItem('elitecontrol_user_role');
    sessionStorage.removeItem('welcomeAlertShown');

    const isIndexPage = window.location.pathname.includes('index.html') ||
                       window.location.pathname === '/' ||
                       window.location.pathname.endsWith('/');

    if (!isIndexPage) {
        console.log("🔄 Redirecionando para página de login...");
        window.location.href = 'index.html';
    }
}

// === INTERFACE ===

function initializeUI(currentUser) {
    console.log("🎨 Inicializando interface para:", currentUser.role);

    updateUserInfo(currentUser);
    initializeNotifications();
    initializeSidebar(currentUser.role);

    if (document.getElementById('temporaryAlertsContainer') &&
        window.location.href.includes('dashboard.html') &&
        !sessionStorage.getItem('welcomeAlertShown')) {

        const userName = currentUser.name || currentUser.email.split('@')[0];
        showTemporaryAlert(`Bem-vindo, ${userName}! EliteControl v2.0`, 'success', 5000);
        sessionStorage.setItem('welcomeAlertShown', 'true');
    }
}

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
                { icon: 'fa-users', text: 'Clientes', section: 'clientes' }
            ];
            break;

        case 'Controlador de Estoque':
            links = [
                { icon: 'fa-warehouse', text: 'Painel Estoque', section: 'estoque' },
                { icon: 'fa-boxes-stacked', text: 'Produtos', section: 'produtos' }
            ];
            break;

        case 'Vendedor':
            links = [
                { icon: 'fa-dollar-sign', text: 'Painel Vendas', section: 'vendas-painel' },
                { icon: 'fa-search', text: 'Consultar Produtos', section: 'produtos-consulta' },
                { icon: 'fa-cash-register', text: 'Registrar Venda', section: 'registrar-venda' },
                { icon: 'fa-history', text: 'Minhas Vendas', section: 'minhas-vendas' }
            ];
            break;

        default:
            links = [{ icon: 'fa-tachometer-alt', text: 'Painel', section: 'geral' }];
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

    const typeIcons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };

    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}"
             data-id="${notification.id}">
            <div class="flex items-start">
                <i class="fas ${typeIcons[notification.type] || 'fa-info-circle'} mt-1 mr-3 text-${notification.type === 'error' ? 'red' : notification.type === 'warning' ? 'yellow' : notification.type === 'success' ? 'green' : 'blue'}-400"></i>
                <div class="flex-1">
                    <div class="font-semibold text-slate-200">${notification.title}</div>
                    <div class="text-sm text-slate-400">${notification.message}</div>
                    <div class="text-xs text-slate-500 mt-1">${notification.time}</div>
                </div>
            </div>
        </div>
    `).join('');

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

// === CARREGAMENTO DE SEÇÕES ===

async function loadSectionContent(sectionId, currentUser) {
    console.log(`📄 Carregando seção: ${sectionId}`);

    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("❌ dynamicContentArea não encontrado");
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
        if (!window.DataService) {
            throw new Error("DataService não está disponível");
        }

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
                <p>Erro ao carregar conteúdo da seção ${sectionId}</p>
                <p class="text-xs mt-2">${error.message}</p>
            </div>
        `;
        showTemporaryAlert(`Erro ao carregar ${sectionId}`, 'error');
    }
}

// === DASHBOARD ===

async function loadDashboardData(currentUser) {
    console.log("📊 Carregando dados do dashboard");

    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) return;

    try {
        dynamicContentArea.innerHTML = getDashboardTemplate(currentUser.role);

        let salesStats, productStats, allProducts;

        productStats = await DataService.getProductStats();
        allProducts = await DataService.getProducts();

        if (currentUser.role === 'Vendedor') {
            salesStats = await DataService.getSalesStatsBySeller(currentUser.uid);
        } else {
            salesStats = await DataService.getSalesStats();
        }

        updateDashboardKPIs(salesStats, productStats, allProducts, currentUser);

    } catch (error) {
        console.error("❌ Erro ao carregar dashboard:", error);
        dynamicContentArea.innerHTML = `
            <div class="p-8 text-center text-red-400">
                <i class="fas fa-times-circle fa-2x mb-4"></i>
                <p>Erro ao carregar dados do dashboard</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

function getDashboardTemplate(userRole) {
    return `
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
        
        <div class="mt-8 text-center text-slate-400">
            <i class="fas fa-chart-bar fa-3x mb-4"></i>
            <p>Dashboard em desenvolvimento</p>
            <p class="text-sm mt-2">Estatísticas detalhadas serão adicionadas em breve</p>
        </div>
    `;
}

function updateDashboardKPIs(salesStats, productStats, allProducts, currentUser) {
    console.log("📊 Atualizando KPIs");

    const kpiCards = document.querySelectorAll('#kpiContainer .kpi-card');
    if (kpiCards.length < 4) return;

    const getValue = (index, selector) => kpiCards[index]?.querySelector(selector);
    const getTitle = (index) => getValue(index, '.kpi-title');
    const getValueEl = (index) => getValue(index, '.kpi-value');

    switch (currentUser.role) {
        case 'Vendedor':
            if (getTitle(0)) getTitle(0).textContent = "Minhas Vendas Hoje";
            if (getValueEl(0)) getValueEl(0).textContent = formatCurrency(salesStats?.todayRevenue || 0);

            if (getTitle(1)) getTitle(1).textContent = "Nº Vendas Hoje";
            if (getValueEl(1)) getValueEl(1).textContent = salesStats?.todaySales || 0;

            if (getTitle(2)) getTitle(2).textContent = "Produtos Disponíveis";
            if (getValueEl(2)) getValueEl(2).textContent = allProducts?.length || 0;

            if (getTitle(3)) getTitle(3).textContent = "Nova Venda";
            if (getValueEl(3) && !getValueEl(3).querySelector('#newSaleButton')) {
                getValueEl(3).innerHTML = `<button class="btn-primary" id="newSaleButton">Registrar</button>`;
                setupKPIActionButton('newSaleButton', 'registrar-venda');
            }
            break;

        case 'Controlador de Estoque':
            if (getTitle(0)) getTitle(0).textContent = "Total Produtos";
            if (getValueEl(0)) getValueEl(0).textContent = productStats?.totalProducts || 0;

            if (getTitle(1)) getTitle(1).textContent = "Estoque Baixo";
            if (getValueEl(1)) getValueEl(1).textContent = productStats?.lowStock || 0;

            if (getTitle(2)) getTitle(2).textContent = "Categorias";
            if (getValueEl(2)) getValueEl(2).textContent = productStats?.categories ? Object.keys(productStats.categories).length : 0;

            if (getTitle(3)) getTitle(3).textContent =
