// js/firebase-service.js
// Serviço de dados Firebase - EliteControl v2.0 - OTIMIZADO E COMPLETO

const DataService = {
    // Cache para melhor performance
    cache: {
        products: null,
        sales: null,
        users: null,
        lastUpdate: {
            products: null,
            sales: null,
            users: null
        },
        ttl: 5 * 60 * 1000 // 5 minutos
    },

    // === FUNÇÕES DE USUÁRIO ===
    
    /**
     * Busca dados do usuário por UID
     * @param {string} userId - UID do usuário
     * @returns {Object|null} Dados do usuário ou null se não encontrado
     */
    getUserData: async function(userId) {
        if (!db) {
            console.error("❌ Firestore não está inicializado!");
            throw new Error("Conexão com banco de dados não disponível.");
        }
        
        if (!userId) {
            throw new Error("ID do usuário é obrigatório");
        }
        
        try {
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('getUserData');
            }
            
            console.log("🔍 Buscando dados do usuário:", userId);
            
            const userDocRef = db.collection('users').doc(userId);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                const userData = { uid: userId, ...userDoc.data() };
                console.log("✅ Dados do usuário encontrados:", userData.name || userData.email);
                
                if (window.performanceMonitor) {
                    window.performanceMonitor.endOperation('getUserData');
                }
                
                return userData;
            } else {
                console.warn(`⚠️ Documento do usuário não encontrado: ${userId}`);
                
                // Tentar buscar por email se o usuário está logado
                if (auth?.currentUser?.email) {
                    const email = auth.currentUser.email;
                    console.log("🔍 Tentando buscar usuário por email:", email);
                    
                    const emailQuery = await db.collection('users')
                        .where('email', '==', email)
                        .limit(1)
                        .get();
                    
                    if (!emailQuery.empty) {
                        const doc = emailQuery.docs[0];
                        const userData = { uid: userId, email: email, ...doc.data() };
                        console.log("✅ Usuário encontrado por email:", userData.name || email);
                        return userData;
                    }
                }
                
                return null;
            }
        } catch (error) {
            console.error("❌ Erro ao buscar dados do usuário:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getUserData');
            }
            
            throw error;
        }
    },

    /**
     * Cria ou atualiza dados do usuário
     * @param {string} userId - UID do usuário
     * @param {Object} userData - Dados do usuário
     * @returns {Object} Dados do usuário criado/atualizado
     */
    createOrUpdateUser: async function(userId, userData) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!userId) throw new Error("ID do usuário é obrigatório");
        if (!userData) throw new Error("Dados do usuário são obrigatórios");
        
        try {
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('createOrUpdateUser');
            }
            
            console.log("📝 Criando/atualizando usuário:", userId);
            
            const userRef = db.collection('users').doc(userId);
            const timestamp = getServerTimestamp();
            
            // Validar dados obrigatórios
            if (!userData.email) {
                throw new Error("Email é obrigatório");
            }
            
            if (!userData.role) {
                throw new Error("Cargo/Role é obrigatório");
            }
            
            const dataToSave = {
                ...userData,
                email: userData.email.toLowerCase().trim(),
                updatedAt: timestamp,
                lastAccess: timestamp
            };
            
            // Se é criação, adicionar dados iniciais
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                dataToSave.createdAt = timestamp;
                dataToSave.isActive = true;
                dataToSave.loginCount = 0;
                console.log("👤 Criando novo usuário");
            } else {
                // Incrementar contador de login
                const currentData = userDoc.data();
                dataToSave.loginCount = (currentData.loginCount || 0) + 1;
                console.log("👤 Atualizando usuário existente");
            }
            
            await userRef.set(dataToSave, { merge: true });
            console.log("✅ Usuário criado/atualizado:", userId);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('createOrUpdateUser');
            }
            
            // Invalidar cache de usuários
            this.cache.users = null;
            this.cache.lastUpdate.users = null;
            
            return { uid: userId, ...dataToSave };
            
        } catch (error) {
            console.error("❌ Erro ao criar/atualizar usuário:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('createOrUpdateUser');
            }
            
            throw error;
        }
    },

    // === FUNÇÕES DE PRODUTOS ===
    
    /**
     * Busca todos os produtos com cache
     * @param {boolean} forceRefresh - Forçar atualização do cache
     * @returns {Array} Lista de produtos
     */
    getProducts: async function(forceRefresh = false) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            // Verificar cache
            if (!forceRefresh && this.cache.products && this.cache.lastUpdate.products) {
                const cacheAge = Date.now() - this.cache.lastUpdate.products;
                if (cacheAge < this.cache.ttl) {
                    console.log("📦 Retornando produtos do cache");
                    return this.cache.products;
                }
            }
            
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('getProducts');
            }
            
            console.log("🔍 Buscando produtos do Firebase...");
            
            const snapshot = await db.collection('products')
                .orderBy('name')
                .get();
            
            const products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    price: Number(data.price) || 0,
                    stock: Number(data.stock) || 0,
                    lowStockAlert: Number(data.lowStockAlert) || 10,
                    category: data.category || 'Sem categoria',
                    description: data.description || '',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                });
            });
            
            // Atualizar cache
            this.cache.products = products;
            this.cache.lastUpdate.products = Date.now();
            
            console.log("✅ Produtos carregados:", products.length);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getProducts');
            }
            
            return products;
            
        } catch (error) {
            console.error("❌ Erro ao buscar produtos:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getProducts');
            }
            
            throw error;
        }
    },

    /**
     * Busca produto por ID
     * @param {string} productId - ID do produto
     * @returns {Object|null} Dados do produto ou null se não encontrado
     */
    getProductById: async function(productId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!productId) throw new Error("ID do produto é obrigatório");
        
        try {
            // Tentar encontrar no cache primeiro
            if (this.cache.products) {
                const cachedProduct = this.cache.products.find(p => p.id === productId);
                if (cachedProduct) {
                    console.log("📦 Produto encontrado no cache:", cachedProduct.name);
                    return cachedProduct;
                }
            }
            
            console.log("🔍 Buscando produto por ID:", productId);
            
            const docRef = db.collection('products').doc(productId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const data = docSnap.data();
                const product = {
                    id: docSnap.id,
                    ...data,
                    price: Number(data.price) || 0,
                    stock: Number(data.stock) || 0,
                    lowStockAlert: Number(data.lowStockAlert) || 10,
                    category: data.category || 'Sem categoria',
                    description: data.description || ''
                };
                
                console.log("✅ Produto encontrado:", product.name);
                return product;
            } else {
                console.warn("⚠️ Produto não encontrado:", productId);
                return null;
            }
        } catch (error) {
            console.error("❌ Erro ao buscar produto por ID:", error);
            throw error;
        }
    },

    /**
     * Adiciona novo produto
     * @param {Object} productData - Dados do produto
     * @returns {Object} Produto criado com ID
     */
    addProduct: async function(productData) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!productData) throw new Error("Dados do produto são obrigatórios");
        
        try {
            console.log("➕ Adicionando produto:", productData.name);
            
            // Validar dados
            const validatedData = this.validateProductData(productData);
            
            const timestamp = getServerTimestamp();
            const dataToSave = {
                ...validatedData,
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: auth?.currentUser?.uid || 'unknown',
                isActive: true
            };
            
            const docRef = await db.collection('products').add(dataToSave);
            console.log("✅ Produto adicionado com ID:", docRef.id);
            
            // Invalidar cache
            this.cache.products = null;
            this.cache.lastUpdate.products = null;
            
            const newProduct = { id: docRef.id, ...dataToSave };
            
            // Registrar atividade
            this.logActivity('product_created', {
                productId: docRef.id,
                productName: validatedData.name,
                userId: auth?.currentUser?.uid
            });
            
            return newProduct;
            
        } catch (error) {
            console.error("❌ Erro ao adicionar produto:", error);
            throw error;
        }
    },

    /**
     * Atualiza produto existente
     * @param {string} productId - ID do produto
     * @param {Object} productData - Dados atualizados
     * @returns {Object} Produto atualizado
     */
    updateProduct: async function(productId, productData) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!productId) throw new Error("ID do produto é obrigatório");
        if (!productData) throw new Error("Dados do produto são obrigatórios");
        
        try {
            console.log("✏️ Atualizando produto:", productId);
            
            // Buscar produto atual para comparação
            const currentProduct = await this.getProductById(productId);
            if (!currentProduct) {
                throw new Error("Produto não encontrado");
            }
            
            const dataToUpdate = {
                updatedAt: getServerTimestamp(),
                updatedBy: auth?.currentUser?.uid || 'unknown'
            };
            
            // Atualizar apenas campos fornecidos e válidos
            if (productData.name !== undefined) {
                dataToUpdate.name = String(productData.name).trim();
                if (!dataToUpdate.name) throw new Error("Nome do produto não pode estar vazio");
            }
            
            if (productData.category !== undefined) {
                dataToUpdate.category = String(productData.category).trim() || 'Sem categoria';
            }
            
            if (productData.price !== undefined) {
                const price = Number(productData.price);
                if (isNaN(price) || price < 0) throw new Error("Preço deve ser um número válido e não negativo");
                dataToUpdate.price = price;
            }
            
            if (productData.stock !== undefined) {
                const stock = Number(productData.stock);
                if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
                    throw new Error("Estoque deve ser um número inteiro válido e não negativo");
                }
                dataToUpdate.stock = stock;
            }
            
            if (productData.lowStockAlert !== undefined) {
                const alert = Number(productData.lowStockAlert);
                if (isNaN(alert) || alert < 1 || !Number.isInteger(alert)) {
                    throw new Error("Alerta de estoque baixo deve ser um número inteiro válido e maior que 0");
                }
                dataToUpdate.lowStockAlert = alert;
            }
            
            if (productData.description !== undefined) {
                dataToUpdate.description = String(productData.description).trim();
            }
            
            await db.collection('products').doc(productId).update(dataToUpdate);
            console.log("✅ Produto atualizado:", productId);
            
            // Invalidar cache
            this.cache.products = null;
            this.cache.lastUpdate.products = null;
            
            // Registrar atividade
            this.logActivity('product_updated', {
                productId,
                productName: dataToUpdate.name || currentProduct.name,
                changes: Object.keys(dataToUpdate).filter(key => !key.includes('At') && !key.includes('By')),
                userId: auth?.currentUser?.uid
            });
            
            return { id: productId, ...currentProduct, ...dataToUpdate };
            
        } catch (error) {
            console.error("❌ Erro ao atualizar produto:", error);
            throw error;
        }
    },

    /**
     * Remove produto
     * @param {string} productId - ID do produto
     * @returns {boolean} Sucesso da operação
     */
    deleteProduct: async function(productId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!productId) throw new Error("ID do produto é obrigatório");
        
        try {
            console.log("🗑️ Removendo produto:", productId);
            
            // Verificar se o produto existe
            const productRef = db.collection('products').doc(productId);
            const productDoc = await productRef.get();
            
            if (!productDoc.exists) {
                throw new Error("Produto não encontrado");
            }
            
            const productData = productDoc.data();
            
            // Verificar se há vendas associadas
            const salesQuery = await db.collection('sales')
                .where('productsDetail', 'array-contains-any', [{ productId }])
                .limit(1)
                .get();
            
            if (!salesQuery.empty) {
                throw new Error("Não é possível excluir produto que possui vendas associadas");
            }
            
            await productRef.delete();
            console.log("✅ Produto removido:", productId);
            
            // Invalidar cache
            this.cache.products = null;
            this.cache.lastUpdate.products = null;
            
            // Registrar atividade
            this.logActivity('product_deleted', {
                productId,
                productName: productData.name,
                userId: auth?.currentUser?.uid
            });
            
            return true;
            
        } catch (error) {
            console.error("❌ Erro ao deletar produto:", error);
            throw error;
        }
    },

    /**
     * Busca produtos por categoria
     * @param {string} category - Categoria dos produtos
     * @returns {Array} Lista de produtos da categoria
     */
    getProductsByCategory: async function(category) {
        if (!category) throw new Error("Categoria é obrigatória");
        
        try {
            console.log("🔍 Buscando produtos da categoria:", category);
            
            const snapshot = await db.collection('products')
                .where('category', '==', category)
                .where('isActive', '==', true)
                .orderBy('name')
                .get();
            
            const products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    price: Number(data.price) || 0,
                    stock: Number(data.stock) || 0,
                    lowStockAlert: Number(data.lowStockAlert) || 10
                });
            });
            
            console.log(`✅ Produtos encontrados na categoria "${category}":`, products.length);
            return products;
            
        } catch (error) {
            console.error("❌ Erro ao buscar produtos por categoria:", error);
            throw error;
        }
    },

    /**
     * Busca produtos com estoque baixo
     * @returns {Array} Lista de produtos com estoque baixo
     */
    getLowStockProducts: async function() {
        try {
            console.log("🔍 Buscando produtos com estoque baixo...");
            
            const products = await this.getProducts();
            const lowStockProducts = products.filter(product => {
                return product.stock <= product.lowStockAlert && product.stock > 0;
            });
            
            console.log("⚠️ Produtos com estoque baixo:", lowStockProducts.length);
            return lowStockProducts;
            
        } catch (error) {
            console.error("❌ Erro ao buscar produtos com estoque baixo:", error);
            throw error;
        }
    },

    /**
     * Busca produtos sem estoque
     * @returns {Array} Lista de produtos sem estoque
     */
    getOutOfStockProducts: async function() {
        try {
            console.log("🔍 Buscando produtos sem estoque...");
            
            const products = await this.getProducts();
            const outOfStockProducts = products.filter(product => product.stock === 0);
            
            console.log("❌ Produtos sem estoque:", outOfStockProducts.length);
            return outOfStockProducts;
            
        } catch (error) {
            console.error("❌ Erro ao buscar produtos sem estoque:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE VENDAS ===
    
    /**
     * Busca todas as vendas com cache
     * @param {boolean} forceRefresh - Forçar atualização do cache
     * @returns {Array} Lista de vendas
     */
    getSales: async function(forceRefresh = false) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            // Verificar cache
            if (!forceRefresh && this.cache.sales && this.cache.lastUpdate.sales) {
                const cacheAge = Date.now() - this.cache.lastUpdate.sales;
                if (cacheAge < this.cache.ttl) {
                    console.log("💰 Retornando vendas do cache");
                    return this.cache.sales;
                }
            }
            
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('getSales');
            }
            
            console.log("🔍 Buscando vendas do Firebase...");
            
            const snapshot = await db.collection('sales')
                .orderBy('date', 'desc')
                .get();
            
            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({
                    id: doc.id,
                    ...data,
                    total: Number(data.total) || 0,
                    date: data.date,
                    productsDetail: data.productsDetail || []
                });
            });
            
            // Atualizar cache
            this.cache.sales = sales;
            this.cache.lastUpdate.sales = Date.now();
            
            console.log("✅ Vendas carregadas:", sales.length);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getSales');
            }
            
            return sales;
            
        } catch (error) {
            console.error("❌ Erro ao buscar vendas:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getSales');
            }
            
            throw error;
        }
    },

    /**
     * Busca vendas por vendedor
     * @param {string} sellerId - ID do vendedor
     * @returns {Array} Lista de vendas do vendedor
     */
    getSalesBySeller: async function(sellerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!sellerId) throw new Error("ID do vendedor é obrigatório");
        
        try {
            console.log("🔍 Buscando vendas do vendedor:", sellerId);
            
            const snapshot = await db.collection('sales')
                .where('sellerId', '==', sellerId)
                .orderBy('date', 'desc')
                .get();
            
            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({
                    id: doc.id,
                    ...data,
                    total: Number(data.total) || 0
                });
            });
            
            console.log("✅ Vendas do vendedor encontradas:", sales.length);
            return sales;
            
        } catch (error) {
            console.error("❌ Erro ao buscar vendas por vendedor:", error);
            throw error;
        }
    },

    /**
     * Adiciona nova venda com transação
     * @param {Object} saleData - Dados básicos da venda
     * @param {Array} productsSoldDetails - Detalhes dos produtos vendidos
     * @param {string} sellerName - Nome do vendedor
     * @param {Object} customerData - Dados do cliente (opcional)
     * @returns {Object} Venda criada
     */
    addSale: async function(saleData, productsSoldDetails, sellerName, customerData = null) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!saleData || !productsSoldDetails || !Array.isArray(productsSoldDetails)) {
            throw new Error("Dados da venda são obrigatórios");
        }
        
        try {
            console.log("➕ Processando nova venda...");
            
            // Validar produtos antes da transação
            await this.validateSaleProducts(productsSoldDetails);
            
            // Usar transação para garantir consistência
            const result = await db.runTransaction(async (transaction) => {
                const saleDocRef = db.collection('sales').doc();
                const currentUser = auth?.currentUser;
                
                // Calcular total
                const calculatedTotal = productsSoldDetails.reduce((sum, item) => {
                    return sum + (Number(item.quantity) * Number(item.unitPrice || 0));
                }, 0);
                
                // Preparar dados da venda
                const salePayload = {
                    date: saleData.date ? getCurrentTimestamp() : getServerTimestamp(),
                    sellerId: currentUser?.uid || 'unknown',
                    sellerName: sellerName || currentUser?.email || 'Vendedor Desconhecido',
                    productsDetail: productsSoldDetails.map(p => ({
                        productId: p.productId,
                        name: p.name,
                        quantity: Number(p.quantity),
                        unitPrice: Number(p.unitPrice || 0),
                        category: p.category || 'Sem categoria'
                    })),
                    total: calculatedTotal,
                    createdAt: getServerTimestamp(),
                    status: 'completed',
                    paymentMethod: saleData.paymentMethod || 'money'
                };
                
                // Adicionar dados do cliente se fornecidos
                if (customerData && customerData.id) {
                    salePayload.customerId = customerData.id;
                    salePayload.customerName = customerData.name;
                    salePayload.customerPhone = customerData.phone;
                    salePayload.customerEmail = customerData.email;
                }
                
                // Criar venda
                transaction.set(saleDocRef, salePayload);
                
                // Atualizar estoque dos produtos
                for (const item of productsSoldDetails) {
                    const productRef = db.collection('products').doc(item.productId);
                    const productDoc = await transaction.get(productRef);
                    
                    if (!productDoc.exists) {
                        throw new Error(`Produto não encontrado: ${item.name}`);
                    }
                    
                    const currentStock = Number(productDoc.data().stock) || 0;
                    const newStock = currentStock - Number(item.quantity);
                    
                    if (newStock < 0) {
                        throw new Error(`Estoque insuficiente para ${item.name}. Disponível: ${currentStock}`);
                    }
                    
                    transaction.update(productRef, {
                        stock: newStock,
                        updatedAt: getServerTimestamp(),
                        lastSale: getServerTimestamp()
                    });
                }
                
                return { id: saleDocRef.id, ...salePayload };
            });
            
            console.log("✅ Venda processada com sucesso:", result.id);
            
            // Invalidar cache
            this.cache.sales = null;
            this.cache.lastUpdate.sales = null;
            this.cache.products = null;
            this.cache.lastUpdate.products = null;
            
            // Registrar atividade
            this.logActivity('sale_created', {
                saleId: result.id,
                total: result.total,
                itemsCount: productsSoldDetails.length,
                customerId: customerData?.id,
                userId: auth?.currentUser?.uid
            });
            
            // Atualizar estatísticas do cliente se aplicável
            if (customerData && customerData.id && window.CRMService) {
                try {
                    await window.CRMService.updateCustomerStats(customerData.id, result);
                } catch (crmError) {
                    console.warn("⚠️ Erro ao atualizar estatísticas do cliente:", crmError);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error("❌ Erro ao processar venda:", error);
            throw error;
        }
    },

    /**
     * Valida produtos antes da venda
     * @param {Array} products - Lista de produtos a serem validados
     */
    validateSaleProducts: async function(products) {
        for (const item of products) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                throw new Error(`Dados inválidos para o produto: ${item.name || 'Desconhecido'}`);
            }
            
            // Verificar se o produto ainda existe e tem estoque
            const product = await this.getProductById(item.productId);
            if (!product) {
                throw new Error(`Produto não encontrado: ${item.name}`);
            }
            
            if (product.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, Solicitado: ${item.quantity}`);
            }
        }
    },

    /**
     * Cancela uma venda (restaura estoque)
     * @param {string} saleId - ID da venda
     * @param {string} reason - Motivo do cancelamento
     * @returns {boolean} Sucesso da operação
     */
    cancelSale: async function(saleId, reason = 'Cancelamento manual') {
        if (!db) throw new Error("Firestore não inicializado");
        if (!saleId) throw new Error("ID da venda é obrigatório");
        
        try {
            console.log("❌ Cancelando venda:", saleId);
            
            const result = await db.runTransaction(async (transaction) => {
                const saleRef = db.collection('sales').doc(saleId);
                const saleDoc = await transaction.get(saleRef);
                
                if (!saleDoc.exists) {
                    throw new Error("Venda não encontrada");
                }
                
                const saleData = saleDoc.data();
                
                if (saleData.status === 'cancelled') {
                    throw new Error("Venda já foi cancelada");
                }
                
                // Restaurar estoque
                for (const item of saleData.productsDetail || []) {
                    const productRef = db.collection('products').doc(item.productId);
                    transaction.update(productRef, {
                        stock: firebase.firestore.FieldValue.increment(Number(item.quantity)),
                        updatedAt: getServerTimestamp()
                    });
                }
                
                // Marcar venda como cancelada
                transaction.update(saleRef, {
                    status: 'cancelled',
                    cancelledAt: getServerTimestamp(),
                    cancelledBy: auth?.currentUser?.uid || 'unknown',
                    cancelReason: reason
                });
                
                return true;
            });
            
            console.log("✅ Venda cancelada com sucesso");
            
            // Invalidar cache
            this.cache.sales = null;
            this.cache.lastUpdate.sales = null;
            this.cache.products = null;
            this.cache.lastUpdate.products = null;
            
            return result;
            
        } catch (error) {
            console.error("❌ Erro ao cancelar venda:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE ESTATÍSTICAS ===
    
    /**
     * Obtém estatísticas de produtos
     * @returns {Object} Estatísticas dos produtos
     */
    getProductStats: async function() {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("📊 Calculando estatísticas de produtos...");
            
            const products = await this.getProducts();
            
            const stats = {
                totalProducts: products.length,
                lowStock: 0,
                outOfStock: 0,
                categories: {},
                averagePrice: 0,
                totalInventoryValue: 0,
                mostExpensive: null,
                cheapest: null,
                lastUpdated: new Date()
            };
            
            let totalPrice = 0;
            let totalValue = 0;
            let maxPrice = 0;
            let minPrice = Infinity;
            
            products.forEach(product => {
                const price = Number(product.price) || 0;
                const stock = Number(product.stock) || 0;
                const lowStockThreshold = Number(product.lowStockAlert) || 10;
                
                // Contagem por categoria
                const category = product.category || 'Sem categoria';
                stats.categories[category] = (stats.categories[category] || 0) + 1;
                
                // Estoque baixo
                if (stock <= lowStockThreshold && stock > 0) {
                    stats.lowStock++;
                }
                
                // Sem estoque
                if (stock === 0) {
                    stats.outOfStock++;
                }
                
                // Cálculos de preço e valor
                totalPrice += price;
                totalValue += (price * stock);
                
                // Produto mais caro
                if (price > maxPrice) {
                    maxPrice = price;
                    stats.mostExpensive = { name: product.name, price };
                }
                
                // Produto mais barato
                if (price < minPrice && price > 0) {
                    minPrice = price;
                    stats.cheapest = { name: product.name, price };
                }
            });
            
            stats.averagePrice = stats.totalProducts > 0 ? totalPrice / stats.totalProducts : 0;
            stats.totalInventoryValue = totalValue;
            stats.inStock = stats.totalProducts - stats.outOfStock;
            stats.healthyStock = stats.totalProducts - stats.lowStock - stats.outOfStock;
            
            console.log("✅ Estatísticas de produtos calculadas");
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao calcular estatísticas de produtos:", error);
            throw error;
        }
    },

    /**
     * Obtém estatísticas de vendas
     * @returns {Object} Estatísticas das vendas
     */
    getSalesStats: async function() {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("📊 Calculando estatísticas de vendas...");
            
            const sales = await this.getSales();
            
            const stats = {
                totalSales: 0,
                todaySales: 0,
                weekSales: 0,
                monthSales: 0,
                totalRevenue: 0,
                todayRevenue: 0,
                weekRevenue: 0,
                monthRevenue: 0,
                averageTicket: 0,
                totalItems: 0,
                cancelledSales: 0,
                lastUpdated: new Date()
            };
            
            // Calcular datas de referência
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            let totalRevenueSum = 0;
            let completedSales = 0;
            
            sales.forEach(sale => {
                const saleTotal = Number(sale.total) || 0;
                const saleDate = timestampToDate(sale.date) || new Date();
                const isCompleted = sale.status !== 'cancelled';
                
                if (sale.status === 'cancelled') {
                    stats.cancelledSales++;
                    return;
                }
                
                completedSales++;
                totalRevenueSum += saleTotal;
                
                // Contar itens vendidos
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    stats.totalItems += sale.productsDetail.reduce((sum, item) => 
                        sum + (Number(item.quantity) || 0), 0);
                }
                
                if (saleDate >= startOfToday) {
                    stats.todaySales++;
                    stats.todayRevenue += saleTotal;
                }
                
                if (saleDate >= startOfWeek) {
                    stats.weekSales++;
                    stats.weekRevenue += saleTotal;
                }
                
                if (saleDate >= startOfMonth) {
                    stats.monthSales++;
                    stats.monthRevenue += saleTotal;
                }
            });
            
            stats.totalSales = completedSales;
            stats.totalRevenue = totalRevenueSum;
            stats.averageTicket = completedSales > 0 ? stats.totalRevenue / completedSales : 0;
            
            console.log("✅ Estatísticas de vendas calculadas");
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao calcular estatísticas de vendas:", error);
            throw error;
        }
    },

    /**
     * Obtém produtos mais vendidos
     * @param {number} limit - Limite de produtos a retornar
     * @returns {Array} Lista dos produtos mais vendidos
     */
    getTopProducts: async function(limit = 10) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("🔍 Buscando top produtos, limite:", limit);
            
            const sales = await this.getSales();
            const productCounts = {};
            
            sales.forEach(sale => {
                if (sale.status === 'cancelled') return;
                
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    sale.productsDetail.forEach(item => {
                        if (item.productId && item.name) {
                            const key = item.productId;
                            if (!productCounts[key]) {
                                productCounts[key] = {
                                    productId: item.productId,
                                    name: item.name,
                                    category: item.category || 'Sem categoria',
                                    count: 0,
                                    revenue: 0,
                                    averagePrice: 0
                                };
                            }
                            const quantity = Number(item.quantity) || 0;
                            const unitPrice = Number(item.unitPrice) || 0;
                            
                            productCounts[key].count += quantity;
                            productCounts[key].revenue += (quantity * unitPrice);
                            productCounts[key].averagePrice = productCounts[key].revenue / productCounts[key].count;
                        }
                    });
                }
            });
            
            const sortedProducts = Object.values(productCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
            
            console.log("✅ Top produtos encontrados:", sortedProducts.length);
            return sortedProducts;
            
        } catch (error) {
            console.error("❌ Erro ao buscar top produtos:", error);
            throw error;
        }
    },

    /**
     * Obtém estatísticas de vendas por vendedor específico
     * @param {string} sellerId - ID do vendedor
     * @returns {Object} Estatísticas das vendas do vendedor
     */
    getSalesStatsBySeller: async function(sellerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!sellerId) throw new Error("ID do vendedor é obrigatório");
        
        try {
            console.log("📊 Calculando estatísticas do vendedor:", sellerId);
            
            const sales = await this.getSalesBySeller(sellerId);
            
            const stats = {
                totalSales: 0,
                todaySales: 0,
                weekSales: 0,
                monthSales: 0,
                totalRevenue: 0,
                todayRevenue: 0,
                weekRevenue: 0,
                monthRevenue: 0,
                averageTicket: 0,
                totalItems: 0,
                lastUpdated: new Date()
            };
            
            // Calcular datas de referência
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            let totalRevenueSum = 0;
            let completedSales = 0;
            
            sales.forEach(sale => {
                if (sale.status === 'cancelled') return;
                
                const saleTotal = Number(sale.total) || 0;
                const saleDate = timestampToDate(sale.date) || new Date();
                
                completedSales++;
                totalRevenueSum += saleTotal;
                
                // Contar itens vendidos
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    stats.totalItems += sale.productsDetail.reduce((sum, item) => 
                        sum + (Number(item.quantity) || 0), 0);
                }
                
                if (saleDate >= startOfToday) {
                    stats.todaySales++;
                    stats.todayRevenue += saleTotal;
                }
                
                if (saleDate >= startOfWeek) {
                    stats.weekSales++;
                    stats.weekRevenue += saleTotal;
                }
                
                if (saleDate >= startOfMonth) {
                    stats.monthSales++;
                    stats.monthRevenue += saleTotal;
                }
            });
            
            stats.totalSales = completedSales;
            stats.totalRevenue = totalRevenueSum;
            stats.averageTicket = completedSales > 0 ? stats.totalRevenue / completedSales : 0;
            
            console.log("✅ Estatísticas do vendedor calculadas");
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao calcular estatísticas por vendedor:", error);
            throw error;
        }
    },

    /**
     * Obtém produtos mais vendidos por vendedor específico
     * @param {string} sellerId - ID do vendedor
     * @param {number} limit - Limite de produtos a retornar
     * @returns {Array} Lista dos produtos mais vendidos pelo vendedor
     */
    getTopProductsBySeller: async function(sellerId, limit = 10) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!sellerId) throw new Error("ID do vendedor é obrigatório");
        
        try {
            console.log("🔍 Buscando top produtos do vendedor:", sellerId);
            
            const sales = await this.getSalesBySeller(sellerId);
            const productCounts = {};
            
            sales.forEach(sale => {
                if (sale.status === 'cancelled') return;
                
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    sale.productsDetail.forEach(item => {
                        if (item.productId && item.name) {
                            const key = item.productId;
                            if (!productCounts[key]) {
                                productCounts[key] = {
                                    productId: item.productId,
                                    name: item.name,
                                    category: item.category || 'Sem categoria',
                                    count: 0,
                                    revenue: 0
                                };
                            }
                            const quantity = Number(item.quantity) || 0;
                            const unitPrice = Number(item.unitPrice) || 0;
                            
                            productCounts[key].count += quantity;
                            productCounts[key].revenue += (quantity * unitPrice);
                        }
                    });
                }
            });
            
            const sortedProducts = Object.values(productCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
            
            console.log("✅ Top produtos do vendedor encontrados:", sortedProducts.length);
            return sortedProducts;
            
        } catch (error) {
            console.error("❌ Erro ao buscar top produtos por vendedor:", error);
            throw error;
        }
    },

    /**
     * Obtém vendedores com melhor performance
     * @param {number} limit - Limite de vendedores a retornar
     * @returns {Array} Lista dos melhores vendedores
     */
    getTopSellers: async function(limit = 10) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("🔍 Buscando top vendedores, limite:", limit);
            
            const sales = await this.getSales();
            const sellerStats = {};
            
            sales.forEach(sale => {
                if (sale.status === 'cancelled') return;
                
                const sellerId = sale.sellerId || 'unknown';
                const sellerName = sale.sellerName || 'Desconhecido';
                const saleTotal = Number(sale.total) || 0;
                
                if (!sellerStats[sellerId]) {
                    sellerStats[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        salesCount: 0,
                        totalRevenue: 0,
                        averageTicket: 0,
                        totalItems: 0
                    };
                }
                
                sellerStats[sellerId].salesCount++;
                sellerStats[sellerId].totalRevenue += saleTotal;
                
                // Contar itens vendidos
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    sellerStats[sellerId].totalItems += sale.productsDetail.reduce((sum, item) => 
                        sum + (Number(item.quantity) || 0), 0);
                }
            });
            
            // Calcular ticket médio
            Object.values(sellerStats).forEach(seller => {
                seller.averageTicket = seller.salesCount > 0 ? 
                    seller.totalRevenue / seller.salesCount : 0;
            });
            
            const sortedSellers = Object.values(sellerStats)
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, limit);
            
            console.log("✅ Top vendedores encontrados:", sortedSellers.length);
            return sortedSellers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar top vendedores:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE ATIVIDADE/LOG ===
    
    /**
     * Registra atividade do sistema
     * @param {string} action - Ação realizada
     * @param {Object} metadata - Metadados da ação
     */
    logActivity: async function(action, metadata = {}) {
        try {
            const activityData = {
                action,
                metadata,
                userId: auth?.currentUser?.uid || 'unknown',
                userEmail: auth?.currentUser?.email || 'unknown',
                timestamp: getServerTimestamp(),
                userAgent: navigator.userAgent,
                ip: 'unknown' // Em produção, obteria do servidor
            };
            
            await db.collection('activities').add(activityData);
            
        } catch (error) {
            console.error("⚠️ Erro ao registrar atividade (não crítico):", error);
        }
    },

    /**
     * Obtém atividades recentes
     * @param {number} limit - Limite de atividades
     * @returns {Array} Lista de atividades
     */
    getRecentActivities: async function(limit = 20) {
        try {
            const snapshot = await db.collection('activities')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            const activities = [];
            snapshot.forEach(doc => {
                activities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return activities;
            
        } catch (error) {
            console.error("❌ Erro ao buscar atividades:", error);
            return [];
        }
    },

    // === FUNÇÕES AUXILIARES ===
    
    /**
     * Verifica se o Firestore está disponível
     * @returns {boolean} Status da conexão
     */
    isConnected: function() {
        return !!db && window.AppState?.isInitialized;
    },

    /**
     * Limpa cache
     */
    clearCache: function() {
        this.cache.products = null;
        this.cache.sales = null;
        this.cache.users = null;
        this.cache.lastUpdate = {
            products: null,
            sales: null,
            users: null
        };
        console.log("🧹 Cache limpo");
    },

    /**
     * Valida dados de produto
     * @param {Object} productData - Dados do produto
     * @returns {Object} Dados validados
     */
    validateProductData: function(productData) {
        if (!productData) {
            throw new Error("Dados do produto são obrigatórios");
        }
        
        const errors = [];
        
        if (!productData.name || typeof productData.name !== 'string' || productData.name.trim() === '') {
            errors.push("Nome do produto é obrigatório");
        }
        
        if (!productData.category || typeof productData.category !== 'string' || productData.category.trim() === '') {
            errors.push("Categoria do produto é obrigatória");
        }
        
        const price = Number(productData.price);
        if (isNaN(price) || price < 0) {
            errors.push("Preço deve ser um número válido e não negativo");
        }
        
        const stock = Number(productData.stock);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            errors.push("Estoque deve ser um número inteiro válido e não negativo");
        }
        
        const lowStockAlert = Number(productData.lowStockAlert);
        if (isNaN(lowStockAlert) || lowStockAlert < 1 || !Number.isInteger(lowStockAlert)) {
            errors.push("Alerta de estoque baixo deve ser um número inteiro válido e maior que 0");
        }
        
        if (errors.length > 0) {
            throw new Error("Dados inválidos: " + errors.join(", "));
        }
        
        return {
            name: productData.name.trim(),
            category: productData.category.trim(),
            price: price,
            stock: stock,
            lowStockAlert: lowStockAlert,
            description: productData.description ? productData.description.trim() : ''
        };
    },

    /**
     * Busca dados com retry automático
     * @param {Function} operation - Operação a ser executada
     * @param {number} maxRetries - Número máximo de tentativas
     * @returns {*} Resultado da operação
     */
    withRetry: async function(operation, maxRetries = 3) {
        if (window.retryOperation) {
            return window.retryOperation(operation, maxRetries);
        }
        
        // Fallback se a função global não estiver disponível
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
};

// Configurar listeners para invalidar cache quando necessário
if (typeof window !== 'undefined') {
    window.addEventListener('firebase:online', () => {
        console.log("🔄 Reconectado - limpando cache para recarregar dados");
        DataService.clearCache();
    });
    
    // Limpar cache periodicamente (a cada 30 minutos)
    setInterval(() => {
        DataService.clearCache();
        console.log("🔄 Cache limpo automaticamente");
    }, 30 * 60 * 1000);
}

// Tornar o DataService disponível globalmente
window.DataService = DataService;

console.log("✅ Firebase DataService v2.0 inicializado e pronto para uso");
console.log("🚀 Funcionalidades: Produtos, Vendas, Estatísticas, CRM, Cache, Logs");
console.log("📊 Cache TTL:", DataService.cache.ttl / 1000 / 60, "minutos");
