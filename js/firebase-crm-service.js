// js/firebase-crm-service.js
// Serviço avançado de CRM para EliteControl

const CRMService = {
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
            console.log("👤 Criando/atualizando cliente:", customerData);
            
            // Validar dados obrigatórios
            if (!customerData.name || !customerData.phone) {
                throw new Error("Nome e telefone são obrigatórios");
            }
            
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            // Verificar se cliente já existe por telefone
            let customerId = customerData.id;
            if (!customerId && customerData.phone) {
                const existingCustomer = await this.getCustomerByPhone(customerData.phone);
                if (existingCustomer) {
                    customerId = existingCustomer.id;
                }
            }
            
            const dataToSave = {
                name: customerData.name.trim(),
                phone: customerData.phone.trim(),
                email: customerData.email?.trim() || '',
                cpf: customerData.cpf?.trim() || '',
                address: customerData.address?.trim() || '',
                birthdate: customerData.birthdate || '',
                notes: customerData.notes?.trim() || '',
                tags: customerData.tags || [],
                updatedAt: timestamp
            };
            
            if (customerId) {
                // Atualizar cliente existente
                await db.collection('customers').doc(customerId).update(dataToSave);
                console.log("✅ Cliente atualizado:", customerId);
            } else {
                // Criar novo cliente
                dataToSave.createdAt = timestamp;
                dataToSave.firstPurchaseDate = null;
                dataToSave.lastPurchaseDate = null;
                dataToSave.totalPurchases = 0;
                dataToSave.totalSpent = 0;
                dataToSave.averageTicket = 0;
                dataToSave.favoriteCategories = [];
                dataToSave.favoriteProducts = [];
                dataToSave.status = 'active';
                dataToSave.loyaltyPoints = 0;
                
                const docRef = await db.collection('customers').add(dataToSave);
                customerId = docRef.id;
                console.log("✅ Cliente criado:", customerId);
            }
            
            return { id: customerId, ...dataToSave };
            
        } catch (error) {
            console.error("❌ Erro ao criar/atualizar cliente:", error);
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
            const cleanPhone = phone.replace(/\D/g, '');
            
            const snapshot = await db.collection('customers')
                .where('phone', '==', cleanPhone)
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
     * Buscar todos os clientes
     * @param {Object} filters - Filtros opcionais
     * @returns {Array} Lista de clientes
     */
    getCustomers: async function(filters = {}) {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("🔍 Buscando clientes com filtros:", filters);
            
            let query = db.collection('customers');
            
            // Aplicar filtros
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            if (filters.inactiveDays) {
                const inactiveDate = new Date();
                inactiveDate.setDate(inactiveDate.getDate() - filters.inactiveDays);
                query = query.where('lastPurchaseDate', '<=', inactiveDate);
            }
            
            // Ordenação
            query = query.orderBy(filters.orderBy || 'name', filters.orderDirection || 'asc');
            
            const snapshot = await query.get();
            const customers = [];
            
            snapshot.forEach(doc => {
                customers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log("✅ Clientes encontrados:", customers.length);
            return customers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar clientes:", error);
            throw error;
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
            const doc = await db.collection('customers').doc(customerId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
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
            const customerRef = db.collection('customers').doc(customerId);
            const customerDoc = await customerRef.get();
            
            if (!customerDoc.exists) {
                console.warn("⚠️ Cliente não encontrado para atualizar estatísticas");
                return;
            }
            
            const currentData = customerDoc.data();
            const totalPurchases = (currentData.totalPurchases || 0) + 1;
            const totalSpent = (currentData.totalSpent || 0) + saleData.total;
            
            // Calcular categorias e produtos favoritos
            const productCategories = {};
            const productCounts = {};
            
            saleData.productsDetail.forEach(item => {
                // Contar produtos
                if (!productCounts[item.productId]) {
                    productCounts[item.productId] = {
                        id: item.productId,
                        name: item.name,
                        count: 0
                    };
                }
                productCounts[item.productId].count += item.quantity;
                
                // Contar categorias (seria necessário buscar a categoria do produto)
                // Por enquanto, vamos simplificar
            });
            
            // Atualizar dados do cliente
            await customerRef.update({
                lastPurchaseDate: firebase.firestore.FieldValue.serverTimestamp(),
                firstPurchaseDate: currentData.firstPurchaseDate || firebase.firestore.FieldValue.serverTimestamp(),
                totalPurchases: totalPurchases,
                totalSpent: totalSpent,
                averageTicket: totalSpent / totalPurchases,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("✅ Estatísticas do cliente atualizadas");
            
        } catch (error) {
            console.error("❌ Erro ao atualizar estatísticas do cliente:", error);
        }
    },

    /**
     * Buscar histórico de compras do cliente
     * @param {string} customerId - ID do cliente
     * @returns {Array} Lista de vendas do cliente
     */
    getCustomerPurchaseHistory: async function(customerId) {
        if (!db) throw new Error("Firestore não inicializado");
        if (!customerId) throw new Error("ID do cliente é obrigatório");
        
        try {
            console.log("🛒 Buscando histórico de compras do cliente:", customerId);
            
            const snapshot = await db.collection('sales')
                .where('customerId', '==', customerId)
                .orderBy('date', 'desc')
                .get();
            
            const purchases = [];
            snapshot.forEach(doc => {
                purchases.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log("✅ Compras encontradas:", purchases.length);
            return purchases;
            
        } catch (error) {
            console.error("❌ Erro ao buscar histórico de compras:", error);
            throw error;
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
            
            const snapshot = await db.collection('customers')
                .where('lastPurchaseDate', '<=', firebase.firestore.Timestamp.fromDate(inactiveDate))
                .orderBy('lastPurchaseDate', 'desc')
                .get();
            
            const inactiveCustomers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                inactiveCustomers.push({
                    id: doc.id,
                    ...data,
                    daysSinceLastPurchase: Math.floor(
                        (new Date() - data.lastPurchaseDate?.toDate()) / (1000 * 60 * 60 * 24)
                    )
                });
            });
            
            console.log("✅ Clientes inativos encontrados:", inactiveCustomers.length);
            return inactiveCustomers;
            
        } catch (error) {
            console.error("❌ Erro ao buscar clientes inativos:", error);
            throw error;
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
            
            // Buscar histórico de compras
            const purchases = await this.getCustomerPurchaseHistory(customerId);
            
            if (purchases.length === 0) {
                return {
                    favoriteProducts: [],
                    favoriteCategories: [],
                    purchasePatterns: {},
                    recommendations: []
                };
            }
            
            // Analisar produtos
            const productStats = {};
            const categoryStats = {};
            let totalSpent = 0;
            
            for (const purchase of purchases) {
                if (purchase.productsDetail && Array.isArray(purchase.productsDetail)) {
                    for (const item of purchase.productsDetail) {
                        // Estatísticas de produtos
                        if (!productStats[item.productId]) {
                            productStats[item.productId] = {
                                id: item.productId,
                                name: item.name,
                                quantity: 0,
                                revenue: 0,
                                purchases: 0
                            };
                        }
                        
                        productStats[item.productId].quantity += item.quantity;
                        productStats[item.productId].revenue += item.quantity * item.unitPrice;
                        productStats[item.productId].purchases += 1;
                        
                        totalSpent += item.quantity * item.unitPrice;
                        
                        // Buscar categoria do produto
                        try {
                            const product = await DataService.getProductById(item.productId);
                            if (product && product.category) {
                                if (!categoryStats[product.category]) {
                                    categoryStats[product.category] = {
                                        name: product.category,
                                        quantity: 0,
                                        revenue: 0,
                                        purchases: 0
                                    };
                                }
                                
                                categoryStats[product.category].quantity += item.quantity;
                                categoryStats[product.category].revenue += item.quantity * item.unitPrice;
                                categoryStats[product.category].purchases += 1;
                            }
                        } catch (err) {
                            console.warn("Erro ao buscar categoria do produto:", err);
                        }
                    }
                }
            }
            
            // Ordenar por relevância
            const favoriteProducts = Object.values(productStats)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            
            const favoriteCategories = Object.values(categoryStats)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3);
            
            // Padrões de compra
            const purchasePatterns = {
                totalPurchases: purchases.length,
                totalSpent: totalSpent,
                averageTicket: totalSpent / purchases.length,
                purchaseFrequency: this.calculatePurchaseFrequency(purchases),
                lastPurchase: purchases[0]?.date,
                firstPurchase: purchases[purchases.length - 1]?.date
            };
            
            // Gerar recomendações baseadas em preferências
            const recommendations = await this.generateProductRecommendations(
                favoriteCategories.map(c => c.name),
                favoriteProducts.map(p => p.id)
            );
            
            return {
                favoriteProducts,
                favoriteCategories,
                purchasePatterns,
                recommendations
            };
            
        } catch (error) {
            console.error("❌ Erro ao analisar preferências do cliente:", error);
            throw error;
        }
    },

    /**
     * Calcular frequência de compra
     * @param {Array} purchases - Lista de compras
     * @returns {Object} Dados de frequência
     */
    calculatePurchaseFrequency: function(purchases) {
        if (!purchases || purchases.length < 2) {
            return {
                averageDaysBetweenPurchases: null,
                frequency: 'primeira_compra'
            };
        }
        
        // Calcular intervalo médio entre compras
        let totalDays = 0;
        for (let i = 1; i < purchases.length; i++) {
            const date1 = purchases[i-1].date?.toDate ? purchases[i-1].date.toDate() : new Date(purchases[i-1].date);
            const date2 = purchases[i].date?.toDate ? purchases[i].date.toDate() : new Date(purchases[i].date);
            const daysBetween = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
            totalDays += daysBetween;
        }
        
        const averageDays = totalDays / (purchases.length - 1);
        
        // Classificar frequência
        let frequency;
        if (averageDays <= 7) frequency = 'muito_frequente';
        else if (averageDays <= 15) frequency = 'frequente';
        else if (averageDays <= 30) frequency = 'regular';
        else if (averageDays <= 60) frequency = 'ocasional';
        else frequency = 'raro';
        
        return {
            averageDaysBetweenPurchases: Math.round(averageDays),
            frequency
        };
    },

    /**
     * Gerar recomendações de produtos
     * @param {Array} favoriteCategories - Categorias favoritas
     * @param {Array} purchasedProductIds - IDs de produtos já comprados
     * @returns {Array} Lista de produtos recomendados
     */
    generateProductRecommendations: async function(favoriteCategories, purchasedProductIds) {
        if (!db) return [];
        
        try {
            // Buscar produtos das categorias favoritas que não foram comprados
            const allProducts = await DataService.getProducts();
            
            const recommendations = allProducts
                .filter(product => 
                    favoriteCategories.includes(product.category) &&
                    !purchasedProductIds.includes(product.id) &&
                    product.stock > 0
                )
                .slice(0, 5);
            
            return recommendations;
            
        } catch (error) {
            console.error("❌ Erro ao gerar recomendações:", error);
            return [];
        }
    },

    /**
     * Gerar mensagem de promoção personalizada com IA
     * @param {Object} customer - Dados do cliente
     * @param {Object} preferences - Preferências analisadas
     * @returns {Object} Mensagem gerada
     */
    generatePromotionalMessage: async function(customer, preferences) {
        if (!customer || !preferences) throw new Error("Dados insuficientes para gerar mensagem");
        
        try {
            console.log("🤖 Gerando mensagem promocional personalizada");
            
            const { favoriteProducts, favoriteCategories, purchasePatterns } = preferences;
            
            // Templates de mensagem baseados no perfil
            const templates = {
                muito_frequente: {
                    greeting: `Olá ${customer.name}! Sentimos sua falta! 💙`,
                    hook: 'Como nosso cliente VIP, preparamos uma oferta exclusiva para você!',
                    type: 'VIP'
                },
                frequente: {
                    greeting: `Oi ${customer.name}! Que bom ter você de volta! 😊`,
                    hook: 'Temos novidades incríveis que combinam com seu estilo!',
                    type: 'Fidelidade'
                },
                regular: {
                    greeting: `Olá ${customer.name}! Como você está? 🌟`,
                    hook: 'Preparamos ofertas especiais pensando em você!',
                    type: 'Retorno'
                },
                ocasional: {
                    greeting: `Oi ${customer.name}! Há quanto tempo! 👋`,
                    hook: 'Que tal aproveitar essas ofertas imperdíveis?',
                    type: 'Reengajamento'
                },
                raro: {
                    greeting: `Olá ${customer.name}! Sentimos muito sua falta! ❤️`,
                    hook: 'Temos uma surpresa especial para você voltar!',
                    type: 'Reativação'
                },
                primeira_compra: {
                    greeting: `Oi ${customer.name}! Bem-vindo! 🎉`,
                    hook: 'Como novo cliente, temos um presente especial para você!',
                    type: 'Boas-vindas'
                }
            };
            
            const frequency = purchasePatterns.purchaseFrequency || 'regular';
            const template = templates[frequency] || templates.regular;
            
            // Construir mensagem
            let message = `${template.greeting}\n\n${template.hook}\n\n`;
            
            // Adicionar produtos recomendados
            if (favoriteCategories.length > 0) {
                message += `✨ Baseado no seu interesse em ${favoriteCategories[0].name}:\n`;
                
                if (preferences.recommendations && preferences.recommendations.length > 0) {
                    preferences.recommendations.slice(0, 3).forEach(product => {
                        const discount = Math.floor(Math.random() * 15) + 10; // 10-25% desconto
                        const newPrice = product.price * (1 - discount/100);
                        message += `\n📍 ${product.name}\n`;
                        message += `   De R$ ${product.price.toFixed(2)} por R$ ${newPrice.toFixed(2)} (${discount}% OFF!)\n`;
                    });
                }
            }
            
            // Adicionar incentivo baseado no histórico
            if (purchasePatterns.averageTicket > 100) {
                message += `\n💳 FRETE GRÁTIS em compras acima de R$ ${Math.floor(purchasePatterns.averageTicket * 0.8)},00!`;
            } else {
                message += `\n🎁 Ganhe 10% de desconto extra usando o cupom: VOLTEI${new Date().getMonth() + 1}`;
            }
            
            // Call to action
            message += `\n\n📱 Válido até ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`;
            message += `\n\nAproveite! Estamos esperando por você! 😊`;
            
            // Metadados da promoção
            const promotion = {
                type: template.type,
                message: message,
                customerId: customer.id,
                customerName: customer.name,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                recommendations: preferences.recommendations?.slice(0, 3) || [],
                generatedAt: new Date()
            };
            
            // Salvar promoção no histórico
            await this.savePromotionHistory(promotion);
            
            return promotion;
            
        } catch (error) {
            console.error("❌ Erro ao gerar mensagem promocional:", error);
            throw error;
        }
    },

    /**
     * Salvar histórico de promoções
     * @param {Object} promotion - Dados da promoção
     */
    savePromotionHistory: async function(promotion) {
        if (!db) return;
        
        try {
            await db.collection('promotions').add({
                ...promotion,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("✅ Promoção salva no histórico");
        } catch (error) {
            console.error("❌ Erro ao salvar promoção:", error);
        }
    },

    /**
     * Buscar sugestões de clientes para autocompletar
     * @param {string} searchTerm - Termo de busca
     * @returns {Array} Lista de sugestões
     */
    searchCustomers: async function(searchTerm) {
        if (!db || !searchTerm || searchTerm.length < 2) return [];
        
        try {
            const searchLower = searchTerm.toLowerCase();
            const customers = await this.getCustomers();
            
            return customers
                .filter(customer => 
                    customer.name.toLowerCase().includes(searchLower) ||
                    customer.phone.includes(searchTerm) ||
                    (customer.email && customer.email.toLowerCase().includes(searchLower))
                )
                .slice(0, 10)
                .map(customer => ({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    label: `${customer.name} - ${customer.phone}`
                }));
                
        } catch (error) {
            console.error("❌ Erro ao buscar sugestões de clientes:", error);
            return [];
        }
    },

    /**
     * Dashboard de insights de clientes
     * @returns {Object} Insights agregados
     */
    getCustomerInsights: async function() {
        if (!db) throw new Error("Firestore não inicializado");
        
        try {
            console.log("📊 Gerando insights de clientes");
            
            const customers = await this.getCustomers();
            const now = new Date();
            
            // Métricas básicas
            const totalCustomers = customers.length;
            const activeCustomers = customers.filter(c => c.status === 'active').length;
            
            // Segmentação por frequência
            const segmentation = {
                vip: 0,
                frequente: 0,
                regular: 0,
                ocasional: 0,
                inativos: 0,
                novos: 0
            };
            
            // Análise de valor
            let totalRevenue = 0;
            let bestCustomers = [];
            
            for (const customer of customers) {
                totalRevenue += customer.totalSpent || 0;
                
                // Classificar cliente
                if (!customer.lastPurchaseDate) {
                    segmentation.novos++;
                } else {
                    const daysSinceLastPurchase = Math.floor(
                        (now - customer.lastPurchaseDate.toDate()) / (1000 * 60 * 60 * 24)
                    );
                    
                    if (daysSinceLastPurchase > 90) {
                        segmentation.inativos++;
                    } else if (customer.totalPurchases >= 10) {
                        segmentation.vip++;
                    } else if (customer.totalPurchases >= 5) {
                        segmentation.frequente++;
                    } else if (customer.totalPurchases >= 2) {
                        segmentation.regular++;
                    } else {
                        segmentation.ocasional++;
                    }
                }
                
                if (customer.totalSpent > 0) {
                    bestCustomers.push({
                        id: customer.id,
                        name: customer.name,
                        totalSpent: customer.totalSpent,
                        totalPurchases: customer.totalPurchases,
                        averageTicket: customer.averageTicket
                    });
                }
            }
            
            // Ordenar melhores clientes
            bestCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
            
            // Calcular taxa de retenção
            const customersWithPurchases = customers.filter(c => c.totalPurchases > 0).length;
            const retentionRate = totalCustomers > 0 ? 
                (customersWithPurchases / totalCustomers * 100).toFixed(1) : 0;
            
            return {
                totalCustomers,
                activeCustomers,
                segmentation,
                totalRevenue,
                averageCustomerValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
                retentionRate,
                bestCustomers: bestCustomers.slice(0, 10),
                insights: {
                    inactiveAlert: segmentation.inativos,
                    vipPercentage: totalCustomers > 0 ? 
                        (segmentation.vip / totalCustomers * 100).toFixed(1) : 0
                }
            };
            
        } catch (error) {
            console.error("❌ Erro ao gerar insights de clientes:", error);
            throw error;
        }
    }
};

// Expor o serviço globalmente
window.CRMService = CRMService;

console.log("✅ CRM Service inicializado");