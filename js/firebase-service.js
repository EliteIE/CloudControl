// js/firebase-service.js
// Serviço otimizado para interagir com o Firebase Firestore - V2.0 com suporte a CRM

const DataService = {
    // === FUNÇÕES DE USUÁRIO ===
    
    /**
     * Busca dados do usuário por UID
     * @param {string} userId - UID do usuário
     * @returns {Object|null} Dados do usuário ou null se não encontrado
     */
    getUserData: async function(userId) {
        if (!db) {
            console.error("❌ Firestore (db) não está inicializado em getUserData!");
            throw new Error("Conexão com banco de dados não disponível.");
        }
        
        try {
            console.log("🔍 Buscando dados do usuário:", userId);
            
            const userDocRef = db.collection('users').doc(userId);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                const userData = { uid: userId, ...userDoc.data() };
                console.log("✅ Dados do usuário encontrados:", userData);
                return userData;
            } else {
                console.warn(`⚠️ Documento do usuário não encontrado pelo UID: ${userId}`);
                
                // Tentar buscar por email se o usuário está logado
                if (firebase.auth().currentUser && firebase.auth().currentUser.email) {
                    const email = firebase.auth().currentUser.email;
                    console.log("🔍 Tentando buscar usuário por email:", email);
                    
                    const emailQuery = await db.collection('users')
                        .where('email', '==', email)
                        .limit(1)
                        .get();
                    
                    if (!emailQuery.empty) {
                        const doc = emailQuery.docs[0];
                        const userData = { uid: userId, email: email, ...doc.data() };
                        console.log("✅ Usuário encontrado por email:", userData);
                        return userData;
                    }
                }
                
                return null;
            }
        } catch (error) {
            console.error("❌ Erro ao buscar dados do usuário:", error);
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
        if (!db) throw new Error("Firestore não inicializado em createOrUpdateUser");
        
        try {
            const userRef = db.collection('users').doc(userId);
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            const dataToSave = {
                ...userData,
                updatedAt: timestamp
            };
            
            // Se é criação, adicionar createdAt
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                dataToSave.createdAt = timestamp;
            }
            
            await userRef.set(dataToSave, { merge: true });
            console.log("✅ Usuário criado/atualizado:", userId);
            
            return { uid: userId, ...dataToSave };
        } catch (error) {
            console.error("❌ Erro ao criar/atualizar usuário:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE PRODUTOS ===
    
    /**
     * Busca todos os produtos
     * @returns {Array} Lista de produtos
     */
    getProducts: async function() {
        if (!db) throw new Error("Firestore não inicializado em getProducts");
        
        try {
            console.log("🔍 Buscando produtos...");
            
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
                    lowStockAlert: Number(data.lowStockAlert) || 10 // Valor padrão: 10
                });
            });
            
            console.log("✅ Produtos encontrados:", products.length);
            return products;
        } catch (error) {
            console.error("❌ Erro ao buscar produtos:", error);
            throw error;
        }
    },

    /**
     * Busca produto por ID
     * @param {string} productId - ID do produto
     * @returns {Object|null} Dados do produto ou null se não encontrado
     */
    getProductById: async function(productId) {
        if (!db) throw new Error("Firestore não inicializado em getProductById");
        if (!productId) throw new Error("ID do produto é obrigatório");
        
        try {
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
                    lowStockAlert: Number(data.lowStockAlert) || 10 // Valor padrão: 10
                };
                console.log("✅ Produto encontrado:", product);
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
        if (!db) throw new Error("Firestore não inicializado em addProduct");
        if (!productData) throw new Error("Dados do produto são obrigatórios");
        
        try {
            console.log("➕ Adicionando produto:", productData);
            
            // Validar dados obrigatórios
            if (!productData.name || !productData.category) {
                throw new Error("Nome e categoria são obrigatórios");
            }
            
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const dataToSave = {
                name: String(productData.name).trim(),
                category: String(productData.category).trim(),
                price: Number(productData.price) || 0,
                stock: Number(productData.stock) || 0,
                lowStockAlert: Number(productData.lowStockAlert) || 10, // Incluir campo de alerta
                createdAt: timestamp,
                updatedAt: timestamp
            };
            
            const docRef = await db.collection('products').add(dataToSave);
            console.log("✅ Produto adicionado com ID:", docRef.id);
            
            return { id: docRef.id, ...dataToSave };
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
        if (!db) throw new Error("Firestore não inicializado em updateProduct");
        if (!productId) throw new Error("ID do produto é obrigatório");
        if (!productData) throw new Error("Dados do produto são obrigatórios");
        
        try {
            console.log("✏️ Atualizando produto:", productId, productData);
            
            const dataToUpdate = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Atualizar apenas campos fornecidos
            if (productData.name !== undefined) {
                dataToUpdate.name = String(productData.name).trim();
            }
            if (productData.category !== undefined) {
                dataToUpdate.category = String(productData.category).trim();
            }
            if (productData.price !== undefined) {
                dataToUpdate.price = Number(productData.price) || 0;
            }
            if (productData.stock !== undefined) {
                dataToUpdate.stock = Number(productData.stock) || 0;
            }
            if (productData.lowStockAlert !== undefined) {
                dataToUpdate.lowStockAlert = Number(productData.lowStockAlert) || 10;
            }
            
            await db.collection('products').doc(productId).update(dataToUpdate);
            console.log("✅ Produto atualizado:", productId);
            
            return { id: productId, ...dataToUpdate };
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
        if (!db) throw new Error("Firestore não inicializado em deleteProduct");
        if (!productId) throw new Error("ID do produto é obrigatório");
        
        try {
            console.log("🗑️ Removendo produto:", productId);
            
            // Verificar se o produto existe
            const productRef = db.collection('products').doc(productId);
            const productDoc = await productRef.get();
            
            if (!productDoc.exists) {
                throw new Error("Produto não encontrado");
            }
            
            await productRef.delete();
            console.log("✅ Produto removido:", productId);
            
            return true;
        } catch (error) {
            console.error("❌ Erro ao deletar produto:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE VENDAS ===
    
    /**
     * Busca todas as vendas
     * @returns {Array} Lista de vendas
     */
    getSales: async function() {
        if (!db) throw new Error("Firestore não inicializado em getSales");
        
        try {
            console.log("🔍 Buscando vendas...");
            
            const snapshot = await db.collection('sales')
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
            
            console.log("✅ Vendas encontradas:", sales.length);
            return sales;
        } catch (error) {
            console.error("❌ Erro ao buscar vendas:", error);
            throw error;
        }
    },

    /**
     * Busca vendas por vendedor
     * @param {string} sellerId - ID do vendedor
     * @returns {Array} Lista de vendas do vendedor
     */
    getSalesBySeller: async function(sellerId) {
        if (!db) throw new Error("Firestore não inicializado em getSalesBySeller");
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
     * Adiciona nova venda com suporte a cliente
     * @param {Object} saleData - Dados básicos da venda
     * @param {Array} productsSoldDetails - Detalhes dos produtos vendidos
     * @param {string} sellerName - Nome do vendedor
     * @param {Object} customerData - Dados do cliente (opcional)
     * @returns {Object} Venda criada
     */
    addSale: async function(saleData, productsSoldDetails, sellerName, customerData = null) {
        if (!db) throw new Error("Firestore não inicializado em addSale");
        if (!saleData || !productsSoldDetails || !Array.isArray(productsSoldDetails)) {
            throw new Error("Dados da venda são obrigatórios");
        }
        
        const batch = db.batch();
        
        try {
            console.log("➕ Adicionando venda:", saleData, productsSoldDetails);
            
            // Validar produtos
            for (const item of productsSoldDetails) {
                if (!item.productId || !item.quantity || item.quantity <= 0) {
                    throw new Error(`Dados inválidos para o produto: ${item.name || 'Desconhecido'}`);
                }
            }
            
            // Calcular total
            const calculatedTotal = productsSoldDetails.reduce((sum, item) => {
                return sum + (Number(item.quantity) * Number(item.unitPrice || 0));
            }, 0);
            
            // Criar documento da venda
            const saleDocRef = db.collection('sales').doc();
            const currentUser = firebase.auth().currentUser;
            
            const salePayload = {
                date: saleData.date || firebase.firestore.Timestamp.now(),
                sellerId: currentUser?.uid || 'unknown',
                sellerName: sellerName || currentUser?.email || 'Vendedor Desconhecido',
                productsDetail: productsSoldDetails.map(p => ({
                    productId: p.productId,
                    name: p.name,
                    quantity: Number(p.quantity),
                    unitPrice: Number(p.unitPrice || 0)
                })),
                total: calculatedTotal,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Adicionar dados do cliente se fornecidos
            if (customerData && customerData.id) {
                salePayload.customerId = customerData.id;
                salePayload.customerName = customerData.name;
                salePayload.customerPhone = customerData.phone;
            }
            
            batch.set(saleDocRef, salePayload);
            
            // Atualizar estoque dos produtos
            for (const item of productsSoldDetails) {
                const productRef = db.collection('products').doc(item.productId);
                batch.update(productRef, {
                    stock: firebase.firestore.FieldValue.increment(-Number(item.quantity)),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Executar transação
            await batch.commit();
            console.log("✅ Venda adicionada e estoque atualizado:", saleDocRef.id);
            
            // Atualizar estatísticas do cliente se aplicável
            if (customerData && customerData.id && window.CRMService) {
                await window.CRMService.updateCustomerStats(customerData.id, salePayload);
            }
            
            return { id: saleDocRef.id, ...salePayload };
            
        } catch (error) {
            console.error("❌ Erro ao adicionar venda:", error);
            throw error;
        }
    },

    // === FUNÇÕES DE ESTATÍSTICAS ===
    
    /**
     * Obtém estatísticas de produtos
     * @returns {Object} Estatísticas dos produtos
     */
    getProductStats: async function() {
        if (!db) throw new Error("Firestore não inicializado em getProductStats");
        
        try {
            console.log("📊 Calculando estatísticas de produtos...");
            
            const stats = {
                totalProducts: 0,
                lowStock: 0,
                outOfStock: 0,
                categories: {},
                averagePrice: 0,
                totalInventoryValue: 0
            };
            
            const productsSnapshot = await db.collection('products').get();
            stats.totalProducts = productsSnapshot.size;
            
            let totalPrice = 0;
            let totalValue = 0;
            
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                const price = Number(product.price) || 0;
                const stock = Number(product.stock) || 0;
                const lowStockThreshold = Number(product.lowStockAlert) || 10; // Usar valor personalizado
                
                // Contagem por categoria
                const category = product.category || 'Sem categoria';
                stats.categories[category] = (stats.categories[category] || 0) + 1;
                
                // Estoque baixo (usando valor personalizado de cada produto)
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
            });
            
            stats.averagePrice = stats.totalProducts > 0 ? totalPrice / stats.totalProducts : 0;
            stats.totalInventoryValue = totalValue;
            
            console.log("✅ Estatísticas de produtos calculadas:", stats);
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao buscar estatísticas de produtos:", error);
            throw error;
        }
    },

    /**
     * Obtém estatísticas de vendas
     * @returns {Object} Estatísticas das vendas
     */
    getSalesStats: async function() {
        if (!db) throw new Error("Firestore não inicializado em getSalesStats");
        
        try {
            console.log("📊 Calculando estatísticas de vendas...");
            
            const stats = {
                totalSales: 0,
                todaySales: 0,
                weekSales: 0,
                monthSales: 0,
                totalRevenue: 0,
                todayRevenue: 0,
                weekRevenue: 0,
                monthRevenue: 0,
                averageTicket: 0
            };
            
            const salesSnapshot = await db.collection('sales').get();
            stats.totalSales = salesSnapshot.size;
            
            // Calcular datas de referência
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            let totalRevenueSum = 0;
            
            salesSnapshot.forEach(doc => {
                const sale = doc.data();
                const saleTotal = Number(sale.total) || 0;
                const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                
                totalRevenueSum += saleTotal;
                
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
            
            stats.totalRevenue = totalRevenueSum;
            stats.averageTicket = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
            
            console.log("✅ Estatísticas de vendas calculadas:", stats);
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao buscar estatísticas de vendas:", error);
            throw error;
        }
    },

    /**
     * Obtém produtos mais vendidos
     * @param {number} limit - Limite de produtos a retornar
     * @returns {Array} Lista dos produtos mais vendidos
     */
    getTopProducts: async function(limit = 5) {
        if (!db) throw new Error("Firestore não inicializado em getTopProducts");
        
        try {
            console.log("🔍 Buscando top produtos, limite:", limit);
            
            const salesSnapshot = await db.collection('sales').get();
            const productCounts = {};
            
            salesSnapshot.forEach(doc => {
                const sale = doc.data();
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    sale.productsDetail.forEach(item => {
                        if (item.productId && item.name) {
                            const key = item.productId;
                            if (!productCounts[key]) {
                                productCounts[key] = {
                                    productId: item.productId,
                                    name: item.name,
                                    count: 0,
                                    revenue: 0
                                };
                            }
                            productCounts[key].count += Number(item.quantity) || 0;
                            productCounts[key].revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        }
                    });
                }
            });
            
            const sortedProducts = Object.values(productCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
            
            console.log("✅ Top produtos encontrados:", sortedProducts);
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
        if (!db) throw new Error("Firestore não inicializado em getSalesStatsBySeller");
        if (!sellerId) throw new Error("ID do vendedor é obrigatório");
        
        try {
            console.log("📊 Calculando estatísticas de vendas para vendedor:", sellerId);
            
            const stats = {
                totalSales: 0,
                todaySales: 0,
                weekSales: 0,
                monthSales: 0,
                totalRevenue: 0,
                todayRevenue: 0,
                weekRevenue: 0,
                monthRevenue: 0,
                averageTicket: 0
            };
            
            const salesSnapshot = await db.collection('sales')
                .where('sellerId', '==', sellerId)
                .get();
            
            stats.totalSales = salesSnapshot.size;
            
            // Calcular datas de referência
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            let totalRevenueSum = 0;
            
            salesSnapshot.forEach(doc => {
                const sale = doc.data();
                const saleTotal = Number(sale.total) || 0;
                const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                
                totalRevenueSum += saleTotal;
                
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
            
            stats.totalRevenue = totalRevenueSum;
            stats.averageTicket = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
            
            console.log("✅ Estatísticas do vendedor calculadas:", stats);
            return stats;
            
        } catch (error) {
            console.error("❌ Erro ao buscar estatísticas por vendedor:", error);
            throw error;
        }
    },

    /**
     * Obtém produtos mais vendidos por vendedor específico
     * @param {string} sellerId - ID do vendedor
     * @param {number} limit - Limite de produtos a retornar
     * @returns {Array} Lista dos produtos mais vendidos pelo vendedor
     */
    getTopProductsBySeller: async function(sellerId, limit = 5) {
        if (!db) throw new Error("Firestore não inicializado em getTopProductsBySeller");
        if (!sellerId) throw new Error("ID do vendedor é obrigatório");
        
        try {
            console.log("🔍 Buscando top produtos do vendedor:", sellerId, "limite:", limit);
            
            const salesSnapshot = await db.collection('sales')
                .where('sellerId', '==', sellerId)
                .get();
            
            const productCounts = {};
            
            salesSnapshot.forEach(doc => {
                const sale = doc.data();
                if (sale.productsDetail && Array.isArray(sale.productsDetail)) {
                    sale.productsDetail.forEach(item => {
                        if (item.productId && item.name) {
                            const key = item.productId;
                            if (!productCounts[key]) {
                                productCounts[key] = {
                                    productId: item.productId,
                                    name: item.name,
                                    count: 0,
                                    revenue: 0
                                };
                            }
                            productCounts[key].count += Number(item.quantity) || 0;
                            productCounts[key].revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        }
                    });
                }
            });
            
            const sortedProducts = Object.values(productCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
            
            console.log("✅ Top produtos do vendedor encontrados:", sortedProducts);
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
    getTopSellers: async function(limit = 5) {
        if (!db) throw new Error("Firestore não inicializado em getTopSellers");
        
        try {
            console.log("🔍 Buscando top vendedores, limite:", limit);
            
            const salesSnapshot = await db.collection('sales').get();
            const sellerStats = {};
            
            salesSnapshot.forEach(doc => {
                const sale = doc.data();
                const sellerId = sale.sellerId || 'unknown';
                const sellerName = sale.sellerName || 'Desconhecido';
                const saleTotal = Number(sale.total) || 0;
                
                if (!sellerStats[sellerId]) {
                    sellerStats[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        salesCount: 0,
                        totalRevenue: 0
                    };
                }
                
                sellerStats[sellerId].salesCount++;
                sellerStats[sellerId].totalRevenue += saleTotal;
            });
            
            const sortedSellers = Object.values(sellerStats)
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, limit);
            
            console.log("✅ Top vendedores encontrados:", sortedSellers);
            return sortedSellers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar top vendedores:", error);
            throw error;
        }
    },

    // === FUNÇÕES AUXILIARES ===
    
    /**
     * Verifica se o Firestore está disponível
     * @returns {boolean} Status da conexão
     */
    isConnected: function() {
        return !!db;
    },

    /**
     * Obtém timestamp do servidor
     * @returns {firebase.firestore.FieldValue} Timestamp do servidor
     */
    getServerTimestamp: function() {
        return firebase.firestore.FieldValue.serverTimestamp();
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
            lowStockAlert: lowStockAlert
        };
    }
};

// Tornar o DataService disponível globalmente
window.DataService = DataService;

// Log de inicialização
console.log("✅ Firebase DataService v2.0 inicializado e pronto para uso");
console.log("🚀 Nova funcionalidade: Suporte a clientes nas vendas");
