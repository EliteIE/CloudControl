// js/firebase-crm-service.js
// Serviço de CRM completo para EliteControl v2.0 - OTIMIZADO

const CRMService = {
    // Cache para melhor performance
    cache: {
        customers: null,
        insights: null,
        lastUpdate: {
            customers: null,
            insights: null
        },
        ttl: 3 * 60 * 1000 // 3 minutos para dados de CRM
    },

    // === FUNÇÕES DE CLIENTES ===
    
    /**
     * Criar ou atualizar cliente
     * @param {Object} customerData - Dados do cliente
     * @returns {Object} Cliente criado/atualizado
     */
    createOrUpdateCustomer: async function(customerData) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerData) throw new Error("Dados do cliente são obrigatórios");
        
        try {
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('createOrUpdateCustomer');
            }
            
            console.log("👤 Processando cliente:", customerData.name || 'Novo cliente');
            
            // Validar dados obrigatórios
            const validatedData = this.validateCustomerData(customerData);
            
            const timestamp = getServerTimestamp();
            
            // Verificar se cliente já existe por telefone ou ID
            let customerId = customerData.id;
            let existingCustomer = null;
            
            if (!customerId && validatedData.phone) {
                existingCustomer = await this.getCustomerByPhone(validatedData.phone);
                if (existingCustomer) {
                    customerId = existingCustomer.id;
                }
            }
            
            const dataToSave = {
                name: validatedData.name,
                phone: validatedData.phone,
                email: validatedData.email || '',
                cpf: validatedData.cpf || '',
                address: validatedData.address || '',
                birthdate: validatedData.birthdate || '',
                notes: validatedData.notes || '',
                tags: validatedData.tags || [],
                updatedAt: timestamp,
                updatedBy: auth?.currentUser?.uid || 'system'
            };
            
            if (customerId) {
                // Atualizar cliente existente
                const customerRef = db.collection('customers').doc(customerId);
                await customerRef.update(dataToSave);
                console.log("✅ Cliente atualizado:", customerId);
                
                // Registrar atividade
                this.logCustomerActivity(customerId, 'customer_updated', {
                    fields: Object.keys(dataToSave).filter(k => !k.includes('At') && !k.includes('By'))
                });
                
            } else {
                // Criar novo cliente
                dataToSave.createdAt = timestamp;
                dataToSave.createdBy = auth?.currentUser?.uid || 'system';
                dataToSave.firstPurchaseDate = null;
                dataToSave.lastPurchaseDate = null;
                dataToSave.totalPurchases = 0;
                dataToSave.totalSpent = 0;
                dataToSave.averageTicket = 0;
                dataToSave.favoriteCategories = [];
                dataToSave.favoriteProducts = [];
                dataToSave.status = 'active';
                dataToSave.loyaltyPoints = 0;
                dataToSave.segment = 'new';
                dataToSave.riskScore = 0;
                
                const docRef = await db.collection('customers').add(dataToSave);
                customerId = docRef.id;
                console.log("✅ Cliente criado:", customerId);
                
                // Registrar atividade
                this.logCustomerActivity(customerId, 'customer_created', {
                    source: 'manual'
                });
            }
            
            // Invalidar cache
            this.clearCache();
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('createOrUpdateCustomer');
            }
            
            return { id: customerId, ...dataToSave };
            
        } catch (error) {
            console.error("❌ Erro ao processar cliente:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('createOrUpdateCustomer');
            }
            
            throw error;
        }
    },

    /**
     * Buscar cliente por telefone
     * @param {string} phone - Telefone do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    getCustomerByPhone: async function(phone) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!phone) return null;
        
        try {
            const cleanPhone = this.normalizePhone(phone);
            
            const snapshot = await db.collection('customers')
                .where('phone', '==', cleanPhone)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
            
        } catch (error) {
            console.error("❌ Erro ao buscar cliente por telefone:", error);
            return null;
        }
    },

    /**
     * Buscar cliente por email
     * @param {string} email - Email do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    getCustomerByEmail: async function(email) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!email) return null;
        
        try {
            const cleanEmail = email.toLowerCase().trim();
            
            const snapshot = await db.collection('customers')
                .where('email', '==', cleanEmail)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
            
        } catch (error) {
            console.error("❌ Erro ao buscar cliente por email:", error);
            return null;
        }
    },

    /**
     * Buscar todos os clientes com cache
     * @param {Object} filters - Filtros opcionais
     * @param {boolean} forceRefresh - Forçar atualização do cache
     * @returns {Array} Lista de clientes
     */
    getCustomers: async function(filters = {}, forceRefresh = false) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            // Verificar cache apenas se não há filtros específicos
            if (!forceRefresh && Object.keys(filters).length === 0 && this.cache.customers && this.cache.lastUpdate.customers) {
                const cacheAge = Date.now() - this.cache.lastUpdate.customers;
                if (cacheAge < this.cache.ttl) {
                    console.log("👥 Retornando clientes do cache");
                    return this.cache.customers;
                }
            }
            
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('getCustomers');
            }
            
            console.log("🔍 Buscando clientes com filtros:", filters);
            
            let query = db.collection('customers');
            
            // Aplicar filtros
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            } else {
                query = query.where('status', '==', 'active'); // Por padrão, apenas ativos
            }
            
            if (filters.segment) {
                query = query.where('segment', '==', filters.segment);
            }
            
            if (filters.inactiveDays) {
                const inactiveDate = new Date();
                inactiveDate.setDate(inactiveDate.getDate() - filters.inactiveDays);
                query = query.where('lastPurchaseDate', '<=', getCurrentTimestamp());
            }
            
            if (filters.minSpent) {
                query = query.where('totalSpent', '>=', filters.minSpent);
            }
            
            // Ordenação
            const orderBy = filters.orderBy || 'name';
            const orderDirection = filters.orderDirection || 'asc';
            
            try {
                query = query.orderBy(orderBy, orderDirection);
            } catch (error) {
                // Se não conseguir ordenar pelo campo solicitado, usar nome
                console.warn("⚠️ Não foi possível ordenar por", orderBy, "- usando nome");
                query = query.orderBy('name', 'asc');
            }
            
            // Limite
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            
            const snapshot = await query.get();
            const customers = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                customers.push({
                    id: doc.id,
                    ...data,
                    // Garantir que campos numéricos sejam números
                    totalPurchases: Number(data.totalPurchases) || 0,
                    totalSpent: Number(data.totalSpent) || 0,
                    averageTicket: Number(data.averageTicket) || 0,
                    loyaltyPoints: Number(data.loyaltyPoints) || 0,
                    riskScore: Number(data.riskScore) || 0
                });
            });
            
            // Enriquecer dados dos clientes
            const enrichedCustomers = await this.enrichCustomersData(customers);
            
            // Atualizar cache apenas se não há filtros específicos
            if (Object.keys(filters).length === 0) {
                this.cache.customers = enrichedCustomers;
                this.cache.lastUpdate.customers = Date.now();
            }
            
            console.log("✅ Clientes encontrados:", enrichedCustomers.length);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getCustomers');
            }
            
            return enrichedCustomers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar clientes:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getCustomers');
            }
            
            return [];
        }
    },

    /**
     * Buscar cliente por ID
     * @param {string} customerId - ID do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    getCustomerById: async function(customerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerId) throw new Error("ID do cliente é obrigatório");
        
        try {
            // Tentar encontrar no cache primeiro
            if (this.cache.customers) {
                const cachedCustomer = this.cache.customers.find(c => c.id === customerId);
                if (cachedCustomer) {
                    console.log("👤 Cliente encontrado no cache:", cachedCustomer.name);
                    return cachedCustomer;
                }
            }
            
            console.log("🔍 Buscando cliente por ID:", customerId);
            
            const doc = await db.collection('customers').doc(customerId).get();
            
            if (doc.exists) {
                const data = doc.data();
                const customer = {
                    id: doc.id,
                    ...data,
                    totalPurchases: Number(data.totalPurchases) || 0,
                    totalSpent: Number(data.totalSpent) || 0,
                    averageTicket: Number(data.averageTicket) || 0,
                    loyaltyPoints: Number(data.loyaltyPoints) || 0,
                    riskScore: Number(data.riskScore) || 0
                };
                
                console.log("✅ Cliente encontrado:", customer.name);
                return customer;
            }
            
            return null;
            
        } catch (error) {
            console.error("❌ Erro ao buscar cliente por ID:", error);
            throw error;
        }
    },

    /**
     * Atualizar estatísticas do cliente após venda
     * @param {string} customerId - ID do cliente
     * @param {Object} saleData - Dados da venda
     */
    updateCustomerStats: async function(customerId, saleData) {
        if (!db || !customerId || !saleData) return;
        
        try {
            console.log("📊 Atualizando estatísticas do cliente:", customerId);
            
            const customerRef = db.collection('customers').doc(customerId);
            const customerDoc = await customerRef.get();
            
            if (!customerDoc.exists) {
                console.warn("⚠️ Cliente não encontrado para atualizar estatísticas");
                return;
            }
            
            const currentData = customerDoc.data();
            const saleTotal = Number(saleData.total) || 0;
            const newTotalPurchases = (currentData.totalPurchases || 0) + 1;
            const newTotalSpent = (currentData.totalSpent || 0) + saleTotal;
            const newAverageTicket = newTotalSpent / newTotalPurchases;
            
            // Calcular pontos de fidelidade (1 ponto para cada R$ 10 gastos)
            const newPoints = Math.floor(saleTotal / 10);
            const newLoyaltyPoints = (currentData.loyaltyPoints || 0) + newPoints;
            
            // Determinar segmento do cliente
            const newSegment = this.calculateCustomerSegment(newTotalPurchases, newTotalSpent, newAverageTicket);
            
            // Analisar produtos favoritos
            const favoriteCategories = this.analyzeCategories(saleData.productsDetail, currentData.favoriteCategories);
            const favoriteProducts = this.analyzeProducts(saleData.productsDetail, currentData.favoriteProducts);
            
            // Atualizar dados do cliente
            const updateData = {
                lastPurchaseDate: getServerTimestamp(),
                firstPurchaseDate: currentData.firstPurchaseDate || getServerTimestamp(),
                totalPurchases: newTotalPurchases,
                totalSpent: newTotalSpent,
                averageTicket: newAverageTicket,
                loyaltyPoints: newLoyaltyPoints,
                segment: newSegment,
                favoriteCategories: favoriteCategories.slice(0, 5), // Top 5
                favoriteProducts: favoriteProducts.slice(0, 10), // Top 10
                updatedAt: getServerTimestamp(),
                updatedBy: 'system'
            };
            
            await customerRef.update(updateData);
            
            console.log("✅ Estatísticas do cliente atualizadas");
            
            // Registrar atividade
            this.logCustomerActivity(customerId, 'stats_updated', {
                newTotalSpent,
                newTotalPurchases,
                newSegment,
                pointsEarned: newPoints
            });
            
            // Invalidar cache
            this.clearCache();
            
        } catch (error) {
            console.error("❌ Erro ao atualizar estatísticas do cliente:", error);
        }
    },

    /**
     * Buscar histórico de compras do cliente
     * @param {string} customerId - ID do cliente
     * @param {number} limit - Limite de compras a retornar
     * @returns {Array} Lista de vendas do cliente
     */
    getCustomerPurchaseHistory: async function(customerId, limit = 50) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerId) throw new Error("ID do cliente é obrigatório");
        
        try {
            console.log("🛒 Buscando histórico de compras do cliente:", customerId);
            
            const snapshot = await db.collection('sales')
                .where('customerId', '==', customerId)
                .where('status', '!=', 'cancelled')
                .orderBy('status') // Necessário para usar != 
                .orderBy('date', 'desc')
                .limit(limit)
                .get();
            
            const purchases = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                purchases.push({
                    id: doc.id,
                    ...data,
                    total: Number(data.total) || 0
                });
            });
            
            console.log("✅ Compras encontradas:", purchases.length);
            return purchases;
            
        } catch (error) {
            console.error("❌ Erro ao buscar histórico de compras:", error);
            
            // Fallback: buscar todas as vendas e filtrar
            try {
                const allSalesSnapshot = await db.collection('sales')
                    .where('customerId', '==', customerId)
                    .orderBy('date', 'desc')
                    .limit(limit)
                    .get();
                
                const purchases = [];
                allSalesSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.status !== 'cancelled') {
                        purchases.push({
                            id: doc.id,
                            ...data,
                            total: Number(data.total) || 0
                        });
                    }
                });
                
                return purchases;
                
            } catch (fallbackError) {
                console.error("❌ Erro no fallback:", fallbackError);
                return [];
            }
        }
    },

    /**
     * Buscar clientes inativos
     * @param {number} days - Dias de inatividade
     * @returns {Array} Lista de clientes inativos
     */
    getInactiveCustomers: async function(days = 30) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log(`🔍 Buscando clientes inativos há mais de ${days} dias`);
            
            const inactiveDate = new Date();
            inactiveDate.setDate(inactiveDate.getDate() - days);
            const inactiveTimestamp = firebase.firestore.Timestamp.fromDate(inactiveDate);
            
            const snapshot = await db.collection('customers')
                .where('status', '==', 'active')
                .where('lastPurchaseDate', '<=', inactiveTimestamp)
                .orderBy('lastPurchaseDate', 'desc')
                .get();
            
            const inactiveCustomers = [];
            const now = new Date();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const lastPurchaseDate = data.lastPurchaseDate ? timestampToDate(data.lastPurchaseDate) : null;
                const daysSinceLastPurchase = lastPurchaseDate ? 
                    Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24)) : 
                    999;
                
                inactiveCustomers.push({
                    id: doc.id,
                    ...data,
                    daysSinceLastPurchase,
                    inactivityRisk: this.calculateInactivityRisk(daysSinceLastPurchase, data.totalPurchases)
                });
            });
            
            // Ordenar por risco de inatividade
            inactiveCustomers.sort((a, b) => b.inactivityRisk - a.inactivityRisk);
            
            console.log("✅ Clientes inativos encontrados:", inactiveCustomers.length);
            return inactiveCustomers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar clientes inativos:", error);
            return [];
        }
    },

    /**
     * Análise de preferências do cliente
     * @param {string} customerId - ID do cliente
     * @returns {Object} Análise de preferências
     */
    analyzeCustomerPreferences: async function(customerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerId) throw new Error("ID do cliente é obrigatório");
        
        try {
            console.log("📊 Analisando preferências do cliente:", customerId);
            
            // Buscar cliente e histórico
            const [customer, purchases] = await Promise.all([
                this.getCustomerById(customerId),
                this.getCustomerPurchaseHistory(customerId, 100)
            ]);
            
            if (!customer) {
                throw new Error("Cliente não encontrado");
            }
            
            if (purchases.length === 0) {
                return this.getEmptyPreferencesStructure();
            }
            
            // Analisar produtos e categorias
            const productStats = {};
            const categoryStats = {};
            const monthlySpending = {};
            let totalSpent = 0;
            
            purchases.forEach(purchase => {
                const purchaseDate = timestampToDate(purchase.date);
                const monthKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlySpending[monthKey]) {
                    monthlySpending[monthKey] = 0;
                }
                monthlySpending[monthKey] += Number(purchase.total) || 0;
                totalSpent += Number(purchase.total) || 0;
                
                if (purchase.productsDetail && Array.isArray(purchase.productsDetail)) {
                    purchase.productsDetail.forEach(item => {
                        const productId = item.productId;
                        const category = item.category || 'Sem categoria';
                        const quantity = Number(item.quantity) || 0;
                        const revenue = quantity * (Number(item.unitPrice) || 0);
                        
                        // Estatísticas de produtos
                        if (!productStats[productId]) {
                            productStats[productId] = {
                                id: productId,
                                name: item.name,
                                category: category,
                                quantity: 0,
                                revenue: 0,
                                purchases: 0,
                                lastPurchase: purchaseDate
                            };
                        }
                        
                        productStats[productId].quantity += quantity;
                        productStats[productId].revenue += revenue;
                        productStats[productId].purchases += 1;
                        
                        if (purchaseDate > productStats[productId].lastPurchase) {
                            productStats[productId].lastPurchase = purchaseDate;
                        }
                        
                        // Estatísticas de categorias
                        if (!categoryStats[category]) {
                            categoryStats[category] = {
                                name: category,
                                quantity: 0,
                                revenue: 0,
                                purchases: 0
                            };
                        }
                        
                        categoryStats[category].quantity += quantity;
                        categoryStats[category].revenue += revenue;
                        categoryStats[category].purchases += 1;
                    });
                }
            });
            
            // Ordenar por relevância
            const favoriteProducts = Object.values(productStats)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)
                .map(p => ({
                    ...p,
                    averagePrice: p.revenue / p.quantity,
                    recency: this.calculateRecencyScore(p.lastPurchase)
                }));
            
            const favoriteCategories = Object.values(categoryStats)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
                .map(c => ({
                    ...c,
                    percentage: (c.revenue / totalSpent) * 100
                }));
            
            // Padrões de compra
            const purchasePatterns = this.analyzePurchasePatterns(purchases, monthlySpending);
            
            // Recomendações
            const recommendations = await this.generateRecommendations(customer, favoriteCategories, favoriteProducts);
            
            return {
                customer,
                favoriteProducts,
                favoriteCategories,
                purchasePatterns,
                recommendations,
                insights: this.generateCustomerInsights(customer, purchases, favoriteCategories),
                lastAnalysis: new Date()
            };
            
        } catch (error) {
            console.error("❌ Erro ao analisar preferências do cliente:", error);
            return this.getEmptyPreferencesStructure();
        }
    },

    /**
     * Buscar sugestões de clientes para autocompletar
     * @param {string} searchTerm - Termo de busca
     * @param {number} limit - Limite de sugestões
     * @returns {Array} Lista de sugestões
     */
    searchCustomers: async function(searchTerm, limit = 10) {
        if (!db || !searchTerm || searchTerm.length < 2) return [];
        
        try {
            console.log("🔍 Buscando sugestões de clientes:", searchTerm);
            
            const searchLower = searchTerm.toLowerCase();
            
            // Buscar por nome (usando array-contains para busca parcial)
            const namePromise = db.collection('customers')
                .where('status', '==', 'active')
                .orderBy('name')
                .limit(limit)
                .get();
            
            // Buscar por telefone
            const phonePromise = db.collection('customers')
                .where('phone', '>=', searchTerm)
                .where('phone', '<=', searchTerm + '\uf8ff')
                .where('status', '==', 'active')
                .limit(limit)
                .get();
            
            const [nameSnapshot, phoneSnapshot] = await Promise.all([namePromise, phonePromise]);
            
            const results = new Map();
            
            // Processar resultados de nome
            nameSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name.toLowerCase().includes(searchLower)) {
                    results.set(doc.id, {
                        id: doc.id,
                        name: data.name,
                        phone: data.phone,
                        email: data.email,
                        totalPurchases: data.totalPurchases || 0,
                        totalSpent: data.totalSpent || 0,
                        label: `${data.name} - ${data.phone}`
                    });
                }
            });
            
            // Processar resultados de telefone
            phoneSnapshot.forEach(doc => {
                const data = doc.data();
                if (!results.has(doc.id)) {
                    results.set(doc.id, {
                        id: doc.id,
                        name: data.name,
                        phone: data.phone,
                        email: data.email,
                        totalPurchases: data.totalPurchases || 0,
                        totalSpent: data.totalSpent || 0,
                        label: `${data.name} - ${data.phone}`
                    });
                }
            });
            
            // Buscar por email se o termo parece ser um email
            if (searchTerm.includes('@')) {
                const emailSnapshot = await db.collection('customers')
                    .where('email', '>=', searchLower)
                    .where('email', '<=', searchLower + '\uf8ff')
                    .where('status', '==', 'active')
                    .limit(limit)
                    .get();
                
                emailSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!results.has(doc.id)) {
                        results.set(doc.id, {
                            id: doc.id,
                            name: data.name,
                            phone: data.phone,
                            email: data.email,
                            totalPurchases: data.totalPurchases || 0,
                            totalSpent: data.totalSpent || 0,
                            label: `${data.name} - ${data.email}`
                        });
                    }
                });
            }
            
            const suggestions = Array.from(results.values())
                .sort((a, b) => {
                    // Priorizar por relevância: compras recentes e valor gasto
                    const scoreA = (a.totalPurchases * 10) + (a.totalSpent / 100);
                    const scoreB = (b.totalPurchases * 10) + (b.totalSpent / 100);
                    return scoreB - scoreA;
                })
                .slice(0, limit);
            
            console.log("✅ Sugestões encontradas:", suggestions.length);
            return suggestions;
                
        } catch (error) {
            console.error("❌ Erro ao buscar sugestões de clientes:", error);
            return [];
        }
    },

    /**
     * Dashboard de insights de clientes
     * @param {boolean} forceRefresh - Forçar atualização do cache
     * @returns {Object} Insights agregados
     */
    getCustomerInsights: async function(forceRefresh = false) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            // Verificar cache
            if (!forceRefresh && this.cache.insights && this.cache.lastUpdate.insights) {
                const cacheAge = Date.now() - this.cache.lastUpdate.insights;
                if (cacheAge < this.cache.ttl) {
                    console.log("📊 Retornando insights do cache");
                    return this.cache.insights;
                }
            }
            
            if (window.performanceMonitor) {
                window.performanceMonitor.startOperation('getCustomerInsights');
            }
            
            console.log("📊 Gerando insights de clientes");
            
            const customers = await this.getCustomers({}, true);
            const now = new Date();
            
            // Métricas básicas
            const totalCustomers = customers.length;
            const activeCustomers = customers.filter(c => c.status === 'active').length;
            
            // Segmentação
            const segmentation = {
                vip: 0,
                premium: 0,
                regular: 0,
                bronze: 0,
                new: 0,
                inactive: 0
            };
            
            // Análise de valor e comportamento
            let totalRevenue = 0;
            let bestCustomers = [];
            let averageTickets = [];
            const customersByMonth = {};
            
            customers.forEach(customer => {
                const totalSpent = Number(customer.totalSpent) || 0;
                const totalPurchases = Number(customer.totalPurchases) || 0;
                const segment = customer.segment || 'new';
                
                totalRevenue += totalSpent;
                segmentation[segment] = (segmentation[segment] || 0) + 1;
                
                if (totalSpent > 0) {
                    bestCustomers.push({
                        id: customer.id,
                        name: customer.name,
                        totalSpent,
                        totalPurchases,
                        averageTicket: customer.averageTicket || 0,
                        segment,
                        lastPurchaseDate: customer.lastPurchaseDate
                    });
                    
                    averageTickets.push(customer.averageTicket || 0);
                }
                
                // Agrupar por mês de criação
                if (customer.createdAt) {
                    const createdDate = timestampToDate(customer.createdAt);
                    const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
                    customersByMonth[monthKey] = (customersByMonth[monthKey] || 0) + 1;
                }
            });
            
            // Ordenar melhores clientes
            bestCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
            
            // Calcular métricas avançadas
            const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
            const medianTicket = this.calculateMedian(averageTickets);
            const customersWithPurchases = customers.filter(c => (c.totalPurchases || 0) > 0).length;
            const retentionRate = totalCustomers > 0 ? (customersWithPurchases / totalCustomers * 100) : 0;
            
            // Tendências de crescimento
            const monthlyGrowth = this.calculateMonthlyGrowth(customersByMonth);
            
            // Insights de comportamento
            const behaviorInsights = this.analyzeBehaviorPatterns(customers);
            
            const insights = {
                overview: {
                    totalCustomers,
                    activeCustomers,
                    totalRevenue,
                    averageCustomerValue,
                    retentionRate: parseFloat(retentionRate.toFixed(1)),
                    medianTicket
                },
                segmentation,
                growth: {
                    monthlyGrowth,
                    newCustomersThisMonth: segmentation.new,
                    growthRate: monthlyGrowth.rate
                },
                topCustomers: bestCustomers.slice(0, 10),
                behavior: behaviorInsights,
                alerts: {
                    inactiveCustomers: customers.filter(c => {
                        if (!c.lastPurchaseDate) return false;
                        const daysSince = Math.floor((now - timestampToDate(c.lastPurchaseDate)) / (1000 * 60 * 60 * 24));
                        return daysSince > 60;
                    }).length,
                    lowValueCustomers: customers.filter(c => (c.totalSpent || 0) < 100 && (c.totalPurchases || 0) > 0).length,
                    churRisk: customers.filter(c => c.riskScore > 70).length
                },
                lastUpdated: new Date()
            };
            
            // Atualizar cache
            this.cache.insights = insights;
            this.cache.lastUpdate.insights = Date.now();
            
            console.log("✅ Insights de clientes gerados");
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getCustomerInsights');
            }
            
            return insights;
            
        } catch (error) {
            console.error("❌ Erro ao gerar insights de clientes:", error);
            
            if (window.performanceMonitor) {
                window.performanceMonitor.endOperation('getCustomerInsights');
            }
            
            return this.getEmptyInsightsStructure();
        }
    },

    /**
     * Gerar mensagem promocional personalizada
     * @param {Object} customer - Dados do cliente
     * @param {Object} preferences - Preferências analisadas
     * @returns {Object} Mensagem gerada
     */
    generatePromotionalMessage: async function(customer, preferences) {
        if (!customer || !preferences) throw new Error("Dados insuficientes para gerar mensagem");
        
        try {
            console.log("🤖 Gerando mensagem promocional personalizada");
            
            const segment = customer.segment || 'new';
            const totalPurchases = customer.totalPurchases || 0;
            const daysSinceLastPurchase = customer.lastPurchaseDate ? 
                Math.floor((new Date() - timestampToDate(customer.lastPurchaseDate)) / (1000 * 60 * 60 * 24)) : 0;
            
            // Selecionar template baseado no perfil do cliente
            const template = this.selectMessageTemplate(segment, totalPurchases, daysSinceLastPurchase);
            
            // Personalizar mensagem
            let message = template.greeting.replace('{name}', customer.name);
            message += '\n\n' + template.hook;
            
            // Adicionar recomendações de produtos se disponível
            if (preferences.favoriteCategories && preferences.favoriteCategories.length > 0) {
                const topCategory = preferences.favoriteCategories[0];
                message += `\n\n🎁 Ofertas especiais em ${topCategory.name}!`;
            }
            
            message += '\n\n' + template.offer;
            message += '\n\n' + template.cta;
            
            // Adicionar pontos de fidelidade se aplicável
            if (customer.loyaltyPoints > 0) {
                message += `\n\n💎 Seus pontos: ${customer.loyaltyPoints} pontos disponíveis!`;
            }
            
            const promotion = {
                customerId: customer.id,
                customerName: customer.name,
                type: template.type,
                message,
                segment,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                recommendations: preferences.recommendations || [],
                generatedAt: new Date(),
                personalizationScore: this.calculatePersonalizationScore(customer, preferences)
            };
            
            return promotion;
            
        } catch (error) {
            console.error("❌ Erro ao gerar mensagem promocional:", error);
            throw error;
        }
    },

    /**
     * Excluir cliente (marca como inativo)
     * @param {string} customerId - ID do cliente
     */
    deleteCustomer: async function(customerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerId) throw new Error("ID do cliente é obrigatório");
        
        try {
            console.log("🗑️ Desativando cliente:", customerId);
            
            // Verificar se cliente existe
            const customerDoc = await db.collection('customers').doc(customerId).get();
            if (!customerDoc.exists) {
                throw new Error("Cliente não encontrado");
            }
            
            // Marcar como inativo em vez de excluir
            await db.collection('customers').doc(customerId).update({
                status: 'inactive',
                deactivatedAt: getServerTimestamp(),
                deactivatedBy: auth?.currentUser?.uid || 'unknown'
            });
            
            console.log("✅ Cliente desativado com sucesso");
            
            // Registrar atividade
            this.logCustomerActivity(customerId, 'customer_deactivated', {
                reason: 'manual_deletion'
            });
            
            // Invalidar cache
            this.clearCache();
            
        } catch (error) {
            console.error("❌ Erro ao desativar cliente:", error);
            throw error;
        }
    },

    // === FUNÇÕES AUXILIARES ===
    
    /**
     * Validar dados do cliente
     * @param {Object} customerData - Dados do cliente
     * @returns {Object} Dados validados
     */
    validateCustomerData: function(customerData) {
        const errors = [];
        
        if (!customerData.name || typeof customerData.name !== 'string' || customerData.name.trim() === '') {
            errors.push("Nome é obrigatório");
        }
        
        if (!customerData.phone || typeof customerData.phone !== 'string' || customerData.phone.trim() === '') {
            errors.push("Telefone é obrigatório");
        }
        
        if (customerData.email && !this.isValidEmail(customerData.email)) {
            errors.push("Email inválido");
        }
        
        if (customerData.cpf && !this.isValidCPF(customerData.cpf)) {
            errors.push("CPF inválido");
        }
        
        if (errors.length > 0) {
            throw new Error("Dados inválidos: " + errors.join(", "));
        }
        
        return {
            name: customerData.name.trim(),
            phone: this.normalizePhone(customerData.phone),
            email: customerData.email ? customerData.email.toLowerCase().trim() : '',
            cpf: customerData.cpf ? this.normalizeCPF(customerData.cpf) : '',
            address: customerData.address ? customerData.address.trim() : '',
            birthdate: customerData.birthdate || '',
            notes: customerData.notes ? customerData.notes.trim() : '',
            tags: Array.isArray(customerData.tags) ? customerData.tags : []
        };
    },

    /**
     * Normalizar telefone
     * @param {string} phone - Telefone para normalizar
     * @returns {string} Telefone normalizado
     */
    normalizePhone: function(phone) {
        return phone.replace(/\D/g, '');
    },

    /**
     * Normalizar CPF
     * @param {string} cpf - CPF para normalizar
     * @returns {string} CPF normalizado
     */
    normalizeCPF: function(cpf) {
        return cpf.replace(/\D/g, '');
    },

    /**
     * Validar email
     * @param {string} email - Email para validar
     * @returns {boolean} Se o email é válido
     */
    isValidEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validar CPF
     * @param {string} cpf - CPF para validar
     * @returns {boolean} Se o CPF é válido
     */
    isValidCPF: function(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
        
        // Validar dígitos verificadores
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
        }
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
        }
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(10))) return false;
        
        return true;
    },

    /**
     * Calcular segmento do cliente
     * @param {number} totalPurchases - Total de compras
     * @param {number} totalSpent - Total gasto
     * @param {number} averageTicket - Ticket médio
     * @returns {string} Segmento do cliente
     */
    calculateCustomerSegment: function(totalPurchases, totalSpent, averageTicket) {
        if (totalPurchases === 0) return 'new';
        if (totalSpent >= 5000 || averageTicket >= 500) return 'vip';
        if (totalSpent >= 2000 || averageTicket >= 300) return 'premium';
        if (totalPurchases >= 5) return 'regular';
        return 'bronze';
    },

    /**
     * Calcular risco de inatividade
     * @param {number} daysSinceLastPurchase - Dias desde a última compra
     * @param {number} totalPurchases - Total de compras
     * @returns {number} Score de risco (0-100)
     */
    calculateInactivityRisk: function(daysSinceLastPurchase, totalPurchases) {
        if (daysSinceLastPurchase <= 30) return 0;
        
        let risk = Math.min(daysSinceLastPurchase / 180 * 100, 100);
        
        // Reduzir risco para clientes com muitas compras
        if (totalPurchases >= 10) risk *= 0.7;
        else if (totalPurchases >= 5) risk *= 0.8;
        else if (totalPurchases >= 3) risk *= 0.9;
        
        return Math.round(risk);
    },

    /**
     * Analisar categorias favoritas
     * @param {Array} products - Produtos da venda
     * @param {Array} currentFavorites - Favoritas atuais
     * @returns {Array} Categorias atualizadas
     */
    analyzeCategories: function(products, currentFavorites = []) {
        const categoryCount = {};
        
        // Contar categorias atuais
        currentFavorites.forEach(cat => {
            categoryCount[cat.name] = cat.count || 1;
        });
        
        // Adicionar novas categorias
        if (products && Array.isArray(products)) {
            products.forEach(product => {
                const category = product.category || 'Sem categoria';
                categoryCount[category] = (categoryCount[category] || 0) + (product.quantity || 1);
            });
        }
        
        return Object.entries(categoryCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Analisar produtos favoritos
     * @param {Array} products - Produtos da venda
     * @param {Array} currentFavorites - Favoritos atuais
     * @returns {Array} Produtos atualizados
     */
    analyzeProducts: function(products, currentFavorites = []) {
        const productCount = {};
        
        // Contar produtos atuais
        currentFavorites.forEach(prod => {
            productCount[prod.id] = {
                id: prod.id,
                name: prod.name,
                count: prod.count || 1
            };
        });
        
        // Adicionar novos produtos
        if (products && Array.isArray(products)) {
            products.forEach(product => {
                const id = product.productId;
                if (!productCount[id]) {
                    productCount[id] = {
                        id,
                        name: product.name,
                        count: 0
                    };
                }
                productCount[id].count += (product.quantity || 1);
            });
        }
        
        return Object.values(productCount)
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Registrar atividade do cliente
     * @param {string} customerId - ID do cliente
     * @param {string} action - Ação realizada
     * @param {Object} metadata - Metadados da ação
     */
    logCustomerActivity: async function(customerId, action, metadata = {}) {
        try {
            const activityData = {
                customerId,
                action,
                metadata,
                userId: auth?.currentUser?.uid || 'system',
                timestamp: getServerTimestamp()
            };
            
            await db.collection('customer_activities').add(activityData);
            
        } catch (error) {
            console.error("⚠️ Erro ao registrar atividade do cliente (não crítico):", error);
        }
    },

    /**
     * Enriquecer dados dos clientes com informações calculadas
     * @param {Array} customers - Lista de clientes
     * @returns {Array} Clientes enriquecidos
     */
    enrichCustomersData: async function(customers) {
        const now = new Date();
        
        return customers.map(customer => {
            const enriched = { ...customer };
            
            // Calcular dias desde última compra
            if (customer.lastPurchaseDate) {
                const lastPurchase = timestampToDate(customer.lastPurchaseDate);
                enriched.daysSinceLastPurchase = Math.floor((now - lastPurchase) / (1000 * 60 * 60 * 24));
            }
            
            // Calcular score de fidelidade
            enriched.loyaltyScore = this.calculateLoyaltyScore(customer);
            
            // Atualizar risco de churn se necessário
            if (!customer.riskScore) {
                enriched.riskScore = this.calculateInactivityRisk(
                    enriched.daysSinceLastPurchase || 999,
                    customer.totalPurchases || 0
                );
            }
            
            return enriched;
        });
    },

    /**
     * Calcular score de fidelidade
     * @param {Object} customer - Dados do cliente
     * @returns {number} Score de fidelidade (0-100)
     */
    calculateLoyaltyScore: function(customer) {
        const purchases = customer.totalPurchases || 0;
        const spent = customer.totalSpent || 0;
        const points = customer.loyaltyPoints || 0;
        
        let score = 0;
        
        // Baseado em compras (0-40 pontos)
        score += Math.min(purchases * 4, 40);
        
        // Baseado em valor gasto (0-30 pontos)
        score += Math.min(spent / 100, 30);
        
        // Baseado em pontos de fidelidade (0-20 pontos)
        score += Math.min(points / 50, 20);
        
        // Bônus por recência (0-10 pontos)
        if (customer.lastPurchaseDate) {
            const daysSince = Math.floor((new Date() - timestampToDate(customer.lastPurchaseDate)) / (1000 * 60 * 60 * 24));
            if (daysSince <= 30) score += 10;
            else if (daysSince <= 60) score += 5;
        }
        
        return Math.min(Math.round(score), 100);
    },

    /**
     * Limpar cache
     */
    clearCache: function() {
        this.cache.customers = null;
        this.cache.insights = null;
        this.cache.lastUpdate = {
            customers: null,
            insights: null
        };
        console.log("🧹 Cache CRM limpo");
    },

    // Estruturas vazias para casos de erro
    getEmptyPreferencesStructure: function() {
        return {
            favoriteProducts: [],
            favoriteCategories: [],
            purchasePatterns: {
                totalPurchases: 0,
                totalSpent: 0,
                averageTicket: 0,
                frequency: 'new'
            },
            recommendations: [],
            insights: [],
            lastAnalysis: new Date()
        };
    },

    getEmptyInsightsStructure: function() {
        return {
            overview: {
                totalCustomers: 0,
                activeCustomers: 0,
                totalRevenue: 0,
                averageCustomerValue: 0,
                retentionRate: 0,
                medianTicket: 0
            },
            segmentation: {
                vip: 0,
                premium: 0,
                regular: 0,
                bronze: 0,
                new: 0,
                inactive: 0
            },
            growth: {
                monthlyGrowth: { current: 0, previous: 0, rate: 0 },
                newCustomersThisMonth: 0,
                growthRate: 0
            },
            topCustomers: [],
            behavior: {},
            alerts: {
                inactiveCustomers: 0,
                lowValueCustomers: 0,
                churRisk: 0
            },
            lastUpdated: new Date()
        };
    }
};

// Expor o serviço globalmente
window.CRMService = CRMService;

console.log("✅ CRM Service v2.0 inicializado com funcionalidades completas");
console.log("🎯 Recursos: Gestão de clientes, análises, insights, recomendações, segmentação");
console.log("📊 Cache TTL:", CRMService.cache.ttl / 1000 / 60, "minutos");
