const { ipcRenderer } = require('electron');
const moment = require('moment');

// Global variables
let currentOrder = {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    location: null,
    locationType: null
};

let currentLocationType = 'mesa';
let occupiedLocations = new Set(); // Para rastrear ubicaciones ocupadas

let products = [];
let categories = [];
let orders = [];

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    await checkAuthentication();
    
    await loadData();
    setupEventListeners();
    updateDashboard();
    loadCategories();
    loadProducts();
    loadOrders();
    
    // Check if this is the first time running (no products)
    if (products.length === 0) {
        if (window.currentUser && window.currentUser.role === 'admin') {
            if (confirm('¿Deseas cargar datos de ejemplo para probar la aplicación?')) {
                await loadSampleData();
                await loadData();
                updateDashboard();
                loadCategories();
                loadProducts();
                loadOrders();
                loadInventoryTable();
            }
        } else {
            alert('No hay productos en el inventario. Contacta al administrador para agregar productos.');
        }
    }
});

// Authentication functions
async function checkAuthentication() {
    try {
        console.log('Checking authentication...');
        const userSession = await ipcRenderer.invoke('get-user-session');
        console.log('User session:', userSession);
        
        if (!userSession) {
            console.log('No user session found, redirecting to login');
            // Redirect to login if no session
            window.location.href = 'login.html';
            return;
        }
        
        // Store current user globally
        window.currentUser = userSession;
        console.log('Current user set:', window.currentUser);
        
        // Update user display
        const currentUserElement = document.getElementById('current-user');
        const userRoleElement = document.getElementById('user-role');
        
        if (currentUserElement) {
            currentUserElement.textContent = `${userSession.displayName} (${userSession.username})`;
        }
        
        if (userRoleElement) {
            userRoleElement.textContent = userSession.role;
        }
        
        // Apply role-based access control
        applyRoleBasedAccess(userSession.role);
        console.log('Authentication successful');
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'login.html';
    }
}

function applyRoleBasedAccess(role) {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const tabName = item.dataset.tab;
        
        // Define access permissions for each role
        const permissions = {
            admin: ['dashboard', 'billing', 'inventory', 'orders', 'reports', 'settings'],
            cajero: ['dashboard', 'billing', 'orders']
        };
        
        // Show/hide nav items based on role
        if (permissions[role] && permissions[role].includes(tabName)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Set default tab based on role
    const defaultTabs = {
        admin: 'dashboard',
        cajero: 'billing'
    };
    
    if (defaultTabs[role]) {
        switchTab(defaultTabs[role]);
    }
}

async function logout() {
    try {
        // Clear user session
        await ipcRenderer.invoke('clear-user-session');
        
        // Redirect to login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.location.href = 'login.html';
    }
}

// Data loading functions
async function loadData() {
    try {
        products = await ipcRenderer.invoke('get-products');
        categories = await ipcRenderer.invoke('get-categories');
        orders = await ipcRenderer.invoke('get-orders');
        
        // Initialize occupied locations based on existing orders
        initializeOccupiedLocations();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function initializeOccupiedLocations() {
    occupiedLocations.clear();
    
    // Mark locations as occupied for pending, preparing, and ready orders
    orders.forEach(order => {
        if (order.location && ['pending', 'preparing', 'ready'].includes(order.status)) {
            occupiedLocations.add(order.location);
        }
    });
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Search and filters
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', filterProducts);
    }

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterOrders);
    }

    const dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', filterOrders);
    }
}

// Tab switching
function switchTab(tabName) {
    // Remove active class from all tabs and nav items
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected tab and nav item
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load specific data for each tab
    switch (tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'billing':
            loadCategories();
            loadProducts();
            loadLocationOptions(currentLocationType);
            break;
        case 'inventory':
            // Check admin permissions for inventory
            if (window.currentUser && window.currentUser.role !== 'admin') {
                alert('Solo los administradores pueden acceder al inventario.');
                switchTab('billing');
                return;
            }
            loadInventoryTable();
            break;
        case 'orders':
            loadOrdersGrid();
            break;
        case 'reports':
            // Check admin permissions for reports
            if (window.currentUser && window.currentUser.role !== 'admin') {
                alert('Solo los administradores pueden acceder a los reportes.');
                switchTab('billing');
                return;
            }
            loadLowStockItems();
            break;
        case 'settings':
            // Check admin permissions for settings
            if (window.currentUser && window.currentUser.role !== 'admin') {
                alert('Solo los administradores pueden acceder a la configuración.');
                switchTab('billing');
                return;
            }
            break;
    }
}

// Dashboard functions
function updateDashboard() {
    const today = moment().format('YYYY-MM-DD');
    const todayOrders = orders.filter(order => 
        moment(order.createdAt).format('YYYY-MM-DD') === today
    );
    
    const todayRevenue = todayOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.total, 0);
    
    const lowStockItems = products.filter(product => product.stock <= 10);

    // Update stats
    document.getElementById('total-orders').textContent = todayOrders.length;
    document.getElementById('total-revenue').textContent = `$${todayRevenue.toFixed(2)}`;
    
    // Show/hide admin-specific stats based on role
    const totalProductsElement = document.getElementById('total-products');
    const lowStockElement = document.getElementById('low-stock');
    
    if (window.currentUser && window.currentUser.role === 'admin') {
        totalProductsElement.textContent = products.length;
        lowStockElement.textContent = lowStockItems.length;
        totalProductsElement.parentElement.style.display = 'flex';
        lowStockElement.parentElement.style.display = 'flex';
    } else {
        // Hide admin stats for cajero
        totalProductsElement.parentElement.style.display = 'none';
        lowStockElement.parentElement.style.display = 'none';
    }

    // Update recent sales
    updateRecentSales();
    updatePopularProducts();
}

function updateRecentSales() {
    const recentSales = document.getElementById('recent-sales');
    const recentOrders = orders
        .filter(order => order.status === 'completed')
        .slice(-5)
        .reverse();

    recentSales.innerHTML = recentOrders.map(order => `
        <div class="recent-sale-item">
            <div class="sale-info">
                <strong>Orden #${order.id.slice(-6)}</strong>
                <span>${moment(order.createdAt).format('HH:mm')}</span>
            </div>
            <div class="sale-amount">$${order.total.toFixed(2)}</div>
        </div>
    `).join('');
}

function updatePopularProducts() {
    const popularProducts = document.getElementById('popular-products');
    const productSales = {};
    
    orders.filter(order => order.status === 'completed').forEach(order => {
        order.items.forEach(item => {
            productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        });
    });

    const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            return { name: product?.name || 'Producto Desconocido', quantity };
        });

    popularProducts.innerHTML = topProducts.map(product => `
        <div class="popular-product-item">
            <span>${product.name}</span>
            <span class="quantity">${product.quantity} vendidos</span>
        </div>
    `).join('');
}

// Location management functions
function switchLocationType(type) {
    currentLocationType = type;
    
    // Update active tab
    document.querySelectorAll('.location-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Load location options
    loadLocationOptions(type);
    
    // Clear current location selection
    currentOrder.location = null;
    currentOrder.locationType = null;
    updateLocationDisplay();
}

function loadLocationOptions(type) {
    const locationOptions = document.getElementById('location-options');
    if (!locationOptions) return;
    
    let options = [];
    const maxLocations = 14;
    
    for (let i = 1; i <= maxLocations; i++) {
        const locationId = `${type}_${i}`;
        const isOccupied = occupiedLocations.has(locationId);
        const isSelected = currentOrder.location === locationId;
        
        let displayName = '';
        switch(type) {
            case 'mesa':
                displayName = `Mesa ${i}`;
                break;
            case 'domicilio':
                displayName = `Dom ${i}`;
                break;
            case 'barra':
                displayName = `Barra ${i}`;
                break;
        }
        
        options.push(`
            <div class="location-option ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}" 
                 onclick="selectLocation('${locationId}', '${displayName}')" 
                 title="${displayName}">
                ${displayName}
            </div>
        `);
    }
    
    locationOptions.innerHTML = options.join('');
}

function selectLocation(locationId, displayName) {
    // Check if location is occupied
    if (occupiedLocations.has(locationId)) {
        alert('Esta ubicación está ocupada. Selecciona otra ubicación.');
        return;
    }
    
    currentOrder.location = locationId;
    currentOrder.locationType = currentLocationType;
    currentOrder.locationDisplay = displayName;
    
    updateLocationDisplay();
    loadLocationOptions(currentLocationType); // Refresh to show selection
}

function updateLocationDisplay() {
    const currentLocationElement = document.getElementById('current-location');
    if (currentLocationElement) {
        if (currentOrder.location) {
            currentLocationElement.textContent = currentOrder.locationDisplay;
        } else {
            currentLocationElement.textContent = 'Sin seleccionar';
        }
    }
}

function markLocationAsOccupied(locationId) {
    occupiedLocations.add(locationId);
}

function markLocationAsFree(locationId) {
    occupiedLocations.delete(locationId);
}

// Billing functions
function loadCategories() {
    const categoryTabs = document.getElementById('category-tabs');
    if (!categoryTabs) return;

    // Define icons for each category
    const categoryIcons = {
        '1': 'fas fa-hamburger', // Hamburguesas
        '2': 'fas fa-bread-slice', // Sandwiches
        '3': 'fas fa-hotdog', // Hot Dogs
        '4': 'fas fa-leaf', // Ensaladas
        '5': 'fas fa-drumstick-bite', // Carnes
        '6': 'fas fa-wine-bottle', // Bebidas
        '7': 'fas fa-plus-circle', // Adicionales
        '8': 'fas fa-seedling', // Mazorcadas
        '9': 'fas fa-star' // Toppings
    };

    categoryTabs.innerHTML = categories.map(category => `
        <button class="category-tab" data-category="${category.id}" onclick="filterByCategory('${category.id}')">
            <i class="${categoryIcons[category.id] || 'fas fa-utensils'}"></i>
            ${category.name}
        </button>
    `).join('');

    // Set first category as active
    if (categories.length > 0) {
        filterByCategory(categories[0].id);
    }
}

function filterByCategory(categoryId) {
    // Update active category tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryId}"]`).classList.add('active');

    // Filter products
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    displayProducts(categoryProducts);
}

function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card" onclick="addToOrder('${product.id}')">
            <h4>${product.name}</h4>
            <div class="price">$${product.price.toFixed(2)}</div>
            <div class="stock">Stock: ${product.stock}</div>
            ${product.description ? `<div class="description">${product.description}</div>` : ''}
        </div>
    `).join('');
}

function addToOrder(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = currentOrder.items.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity++;
        existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
        currentOrder.items.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            subtotal: product.price
        });
    }

    updateOrderDisplay();
}

function updateOrderDisplay() {
    const orderItems = document.getElementById('order-items');
    if (!orderItems) return;

    orderItems.innerHTML = currentOrder.items.map(item => `
        <div class="order-item">
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="item-quantity">
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', 1)">+</button>
            </div>
        </div>
    `).join('');

    calculateTotals();
}

function updateQuantity(productId, change) {
    const item = currentOrder.items.find(item => item.productId === productId);
    if (!item) return;

    item.quantity += change;
    
    if (item.quantity <= 0) {
        currentOrder.items = currentOrder.items.filter(item => item.productId !== productId);
    } else {
        item.subtotal = item.quantity * item.price;
    }

    updateOrderDisplay();
}

function calculateTotals() {
    currentOrder.subtotal = currentOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
    currentOrder.tax = currentOrder.subtotal * 0.16; // 16% IVA
    currentOrder.total = currentOrder.subtotal + currentOrder.tax;

    document.getElementById('subtotal').textContent = `$${currentOrder.subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${currentOrder.tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${currentOrder.total.toFixed(2)}`;
}

function clearOrder() {
    currentOrder = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        location: null,
        locationType: null,
        locationDisplay: null
    };
    updateOrderDisplay();
    updateLocationDisplay();
    loadLocationOptions(currentLocationType);
}

async function completeOrder() {
    if (currentOrder.items.length === 0) {
        alert('Agrega productos a la orden antes de completarla.');
        return;
    }

    if (!currentOrder.location) {
        alert('Selecciona una ubicación antes de completar la orden.');
        return;
    }

    const order = {
        ...currentOrder,
        status: 'pending',
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    try {
        const savedOrder = await ipcRenderer.invoke('save-order', order);
        
        // Mark location as occupied
        markLocationAsOccupied(currentOrder.location);
        
        // Update stock
        currentOrder.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                product.stock -= item.quantity;
                ipcRenderer.invoke('save-product', product);
            }
        });

        // Reload data
        await loadData();
        clearOrder();
        updateDashboard();
        
        alert(`Orden completada exitosamente para ${currentOrder.locationDisplay}!`);
    } catch (error) {
        console.error('Error completing order:', error);
        alert('Error al completar la orden.');
    }
}

function printReceipt() {
    if (currentOrder.items.length === 0) {
        alert('No hay items en la orden para imprimir.');
        return;
    }

    const receipt = `
        ================================
        RESTAURANTE - RECIBO
        ================================
        Fecha: ${moment().format('DD/MM/YYYY HH:mm')}
        ${currentOrder.locationDisplay ? `Ubicación: ${currentOrder.locationDisplay}` : ''}
        ================================
        ${currentOrder.items.map(item => 
            `${item.name} x${item.quantity} $${item.subtotal.toFixed(2)}`
        ).join('\n')}
        ================================
        Subtotal: $${currentOrder.subtotal.toFixed(2)}
        IVA (16%): $${currentOrder.tax.toFixed(2)}
        TOTAL: $${currentOrder.total.toFixed(2)}
        ================================
        ¡Gracias por su visita!
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<pre>${receipt}</pre>`);
    printWindow.document.close();
    printWindow.print();
}

// Inventory functions
function loadInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    tbody.innerHTML = products.map(product => {
        const category = categories.find(c => c.id === product.categoryId);
        const stockStatus = product.stock === 0 ? 'out-of-stock' : 
                           product.stock <= 10 ? 'low-stock' : 'in-stock';
        const statusText = product.stock === 0 ? 'Sin Stock' : 
                          product.stock <= 10 ? 'Stock Bajo' : 'En Stock';

        return `
            <tr>
                <td>${product.name}</td>
                <td>${category?.name || 'Sin categoría'}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td><span class="stock-status ${stockStatus}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('category-filter')?.value || '';

    let filteredProducts = products;

    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(product => 
            product.categoryId === categoryFilter
        );
    }

    loadInventoryTable();
}

function showAddProductModal() {
    // Check if user has admin permissions
    if (window.currentUser && window.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden agregar productos al inventario.');
        return;
    }
    
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const productForm = document.getElementById('product-form');

    modalTitle.textContent = 'Agregar Producto';
    productForm.reset();
    
    // Load categories in select
    const categorySelect = document.getElementById('product-category');
    categorySelect.innerHTML = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');

    modal.style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function saveProduct() {
    const form = document.getElementById('product-form');
    const formData = new FormData(form);
    
    const product = {
        name: document.getElementById('product-name').value,
        categoryId: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        description: document.getElementById('product-description').value
    };

    if (!product.name || !product.categoryId || !product.price || product.stock < 0) {
        alert('Por favor completa todos los campos requeridos.');
        return;
    }

    try {
        await ipcRenderer.invoke('save-product', product);
        await loadData();
        loadInventoryTable();
        closeModal('product-modal');
        alert('Producto guardado exitosamente!');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error al guardar el producto.');
    }
}

async function deleteProduct(productId) {
    // Check if user has admin permissions
    if (window.currentUser && window.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden eliminar productos del inventario.');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        return;
    }

    try {
        await ipcRenderer.invoke('delete-product', productId);
        await loadData();
        loadInventoryTable();
        alert('Producto eliminado exitosamente!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error al eliminar el producto.');
    }
}

function editProduct(productId) {
    // Check if user has admin permissions
    if (window.currentUser && window.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden editar productos del inventario.');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = 'Editar Producto';
    
    // Fill form with product data
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.categoryId;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-description').value = product.description || '';

    // Add product ID for editing
    document.getElementById('product-form').dataset.productId = productId;

    modal.style.display = 'block';
}

// Orders functions
function loadOrdersGrid() {
    const ordersGrid = document.getElementById('orders-grid');
    if (!ordersGrid) return;

    ordersGrid.innerHTML = orders.map(order => {
        const statusClass = order.status;
        const statusText = {
            'pending': 'Pendiente',
            'preparing': 'Preparando',
            'ready': 'Listo',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        }[order.status] || order.status;

        const locationInfo = order.locationDisplay ? 
            `<div class="order-location">${order.locationDisplay}</div>` : '';

        return `
            <div class="order-card">
                <div class="order-header-info">
                    <span class="order-number">Orden #${order.id.slice(-6)}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                ${locationInfo}
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-summary">
                            <span>${item.name} x${item.quantity}</span>
                            <span>$${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                <div class="order-actions-btns">
                    ${getOrderActionButtons(order)}
                </div>
            </div>
        `;
    }).join('');
}

function getOrderActionButtons(order) {
    const buttons = [];
    
    if (order.status === 'pending') {
        buttons.push(`
            <button class="btn btn-info" onclick="updateOrderStatus('${order.id}', 'preparing')">
                Preparar
            </button>
        `);
    }
    
    if (order.status === 'preparing') {
        buttons.push(`
            <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'ready')">
                Listo
            </button>
        `);
    }
    
    if (order.status === 'ready') {
        buttons.push(`
            <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'completed')">
                Entregar
            </button>
        `);
    }
    
    if (['pending', 'preparing'].includes(order.status)) {
        buttons.push(`
            <button class="btn btn-danger" onclick="updateOrderStatus('${order.id}', 'cancelled')">
                Cancelar
            </button>
        `);
    }
    
    return buttons.join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        const order = orders.find(o => o.id === orderId);
        
        await ipcRenderer.invoke('update-order-status', orderId, status);
        
        // If order is completed or cancelled, free the location
        if (status === 'completed' || status === 'cancelled') {
            if (order && order.location) {
                markLocationAsFree(order.location);
            }
        }
        
        await loadData();
        loadOrdersGrid();
        updateDashboard();
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error al actualizar el estado de la orden.');
    }
}

function filterOrders() {
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const dateFilter = document.getElementById('date-filter')?.value || '';

    let filteredOrders = orders;

    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    if (dateFilter) {
        filteredOrders = filteredOrders.filter(order => 
            moment(order.createdAt).format('YYYY-MM-DD') === dateFilter
        );
    }

    // Update orders grid with filtered results
    const ordersGrid = document.getElementById('orders-grid');
    if (!ordersGrid) return;

    ordersGrid.innerHTML = filteredOrders.map(order => {
        // Same rendering logic as loadOrdersGrid
        const statusClass = order.status;
        const statusText = {
            'pending': 'Pendiente',
            'preparing': 'Preparando',
            'ready': 'Listo',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        }[order.status] || order.status;

        return `
            <div class="order-card">
                <div class="order-header-info">
                    <span class="order-number">Orden #${order.id.slice(-6)}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-summary">
                            <span>${item.name} x${item.quantity}</span>
                            <span>$${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                <div class="order-actions-btns">
                    ${getOrderActionButtons(order)}
                </div>
            </div>
        `;
    }).join('');
}

// Reports functions
function loadLowStockItems() {
    const lowStockList = document.getElementById('low-stock-list');
    if (!lowStockList) return;

    const lowStockItems = products.filter(product => product.stock <= 10);

    lowStockList.innerHTML = lowStockItems.map(product => `
        <div class="low-stock-item">
            <span>${product.name}</span>
            <span class="stock-warning">Stock: ${product.stock}</span>
        </div>
    `).join('');
}

async function generateSalesReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('Por favor selecciona un rango de fechas.');
        return;
    }

    try {
        const report = await ipcRenderer.invoke('get-sales-report', startDate, endDate);
        displaySalesReport(report);
    } catch (error) {
        console.error('Error generating sales report:', error);
        alert('Error al generar el reporte.');
    }
}

function displaySalesReport(report) {
    const salesReport = document.getElementById('sales-report');
    if (!salesReport) return;

    salesReport.innerHTML = `
        <div class="report-summary">
            <h4>Resumen del Período</h4>
            <div class="report-stats">
                <div class="report-stat">
                    <strong>Total de Ventas:</strong> ${report.count}
                </div>
                <div class="report-stat">
                    <strong>Ingresos Totales:</strong> $${report.total.toFixed(2)}
                </div>
                <div class="report-stat">
                    <strong>Promedio por Venta:</strong> $${report.count > 0 ? (report.total / report.count).toFixed(2) : '0.00'}
                </div>
            </div>
        </div>
        <div class="report-details">
            <h4>Detalle de Ventas</h4>
            <div class="sales-list">
                ${report.orders.map(order => `
                    <div class="sale-item">
                        <span>Orden #${order.id.slice(-6)}</span>
                        <span>${moment(order.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                        <span>$${order.total.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function exportData() {
    // Check if user has admin permissions
    if (window.currentUser && window.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos.');
        return;
    }
    
    try {
        const filePath = await ipcRenderer.invoke('export-data');
        if (filePath) {
            alert(`Datos exportados exitosamente a: ${filePath}`);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error al exportar los datos.');
    }
}

// Utility functions
function createNewOrder() {
    clearOrder();
    switchTab('billing');
}

// Load sample data function
async function loadSampleData() {
    const sampleData = {
        products: [
            // Hamburguesas
            {
                id: "1",
                name: "Hamburguesa Clásica",
                categoryId: "1",
                price: 8.50,
                stock: 25,
                description: "Hamburguesa con carne, lechuga, tomate y queso",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "2",
                name: "Hamburguesa Doble",
                categoryId: "1",
                price: 12.00,
                stock: 20,
                description: "Hamburguesa doble con carne, lechuga, tomate y queso",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "3",
                name: "Hamburguesa Especial",
                categoryId: "1",
                price: 10.50,
                stock: 15,
                description: "Hamburguesa con bacon, queso, lechuga y tomate",
                createdAt: "2024-01-01 10:00:00"
            },
            // Sandwiches
            {
                id: "4",
                name: "Sandwich de Pollo",
                categoryId: "2",
                price: 7.50,
                stock: 18,
                description: "Sandwich con pechuga de pollo, lechuga y mayonesa",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "5",
                name: "Sandwich de Jamón",
                categoryId: "2",
                price: 6.50,
                stock: 22,
                description: "Sandwich con jamón, queso y lechuga",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "6",
                name: "Sandwich Vegetariano",
                categoryId: "2",
                price: 7.00,
                stock: 12,
                description: "Sandwich con vegetales frescos y queso",
                createdAt: "2024-01-01 10:00:00"
            },
            // Hot Dogs
            {
                id: "7",
                name: "Hot Dog Clásico",
                categoryId: "3",
                price: 5.50,
                stock: 30,
                description: "Hot dog con salchicha, mostaza y ketchup",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "8",
                name: "Hot Dog Especial",
                categoryId: "3",
                price: 7.00,
                stock: 20,
                description: "Hot dog con salchicha, cebolla, mostaza y ketchup",
                createdAt: "2024-01-01 10:00:00"
            },
            // Ensaladas
            {
                id: "9",
                name: "Ensalada César",
                categoryId: "4",
                price: 8.50,
                stock: 15,
                description: "Ensalada con lechuga, crutones, parmesano y aderezo César",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "10",
                name: "Ensalada Mixta",
                categoryId: "4",
                price: 7.50,
                stock: 12,
                description: "Ensalada con lechuga, tomate, cebolla y aceite de oliva",
                createdAt: "2024-01-01 10:00:00"
            },
            // Carnes
            {
                id: "11",
                name: "Bistec a la Plancha",
                categoryId: "5",
                price: 15.00,
                stock: 10,
                description: "Bistec de res a la plancha con guarnición",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "12",
                name: "Pollo a la Plancha",
                categoryId: "5",
                price: 12.50,
                stock: 15,
                description: "Pechuga de pollo a la plancha con guarnición",
                createdAt: "2024-01-01 10:00:00"
            },
            // Bebidas
            {
                id: "13",
                name: "Coca Cola",
                categoryId: "6",
                price: 2.50,
                stock: 50,
                description: "Refresco de cola 350ml",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "14",
                name: "Agua Mineral",
                categoryId: "6",
                price: 1.50,
                stock: 40,
                description: "Agua mineral natural 500ml",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "15",
                name: "Jugo de Naranja",
                categoryId: "6",
                price: 3.00,
                stock: 25,
                description: "Jugo de naranja natural 300ml",
                createdAt: "2024-01-01 10:00:00"
            },
            // Adicionales
            {
                id: "16",
                name: "Papas Fritas",
                categoryId: "7",
                price: 3.50,
                stock: 30,
                description: "Porción de papas fritas",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "17",
                name: "Onion Rings",
                categoryId: "7",
                price: 4.00,
                stock: 20,
                description: "Aros de cebolla fritos",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "18",
                name: "Nuggets de Pollo",
                categoryId: "7",
                price: 5.00,
                stock: 25,
                description: "6 nuggets de pollo con salsa",
                createdAt: "2024-01-01 10:00:00"
            },
            // Mazorcadas
            {
                id: "19",
                name: "Mazorcada Clásica",
                categoryId: "8",
                price: 4.50,
                stock: 15,
                description: "Mazorca con mantequilla y sal",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "20",
                name: "Mazorcada con Queso",
                categoryId: "8",
                price: 5.50,
                stock: 12,
                description: "Mazorca con queso rallado y mantequilla",
                createdAt: "2024-01-01 10:00:00"
            },
            // Toppings
            {
                id: "21",
                name: "Queso Extra",
                categoryId: "9",
                price: 1.50,
                stock: 30,
                description: "Queso extra para hamburguesas",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "22",
                name: "Bacon Extra",
                categoryId: "9",
                price: 2.00,
                stock: 25,
                description: "Bacon extra para hamburguesas",
                createdAt: "2024-01-01 10:00:00"
            },
            {
                id: "23",
                name: "Cebolla Caramelizada",
                categoryId: "9",
                price: 1.00,
                stock: 20,
                description: "Cebolla caramelizada para hamburguesas",
                createdAt: "2024-01-01 10:00:00"
            }
        ],
        orders: [
            {
                id: "1001",
                items: [
                    { productId: "1", name: "Hamburguesa Clásica", price: 8.50, quantity: 2, subtotal: 17.00 },
                    { productId: "13", name: "Coca Cola", price: 2.50, quantity: 2, subtotal: 5.00 },
                    { productId: "16", name: "Papas Fritas", price: 3.50, quantity: 1, subtotal: 3.50 }
                ],
                subtotal: 25.50,
                tax: 4.08,
                total: 29.58,
                status: "completed",
                location: "mesa_3",
                locationType: "mesa",
                locationDisplay: "Mesa 3",
                createdAt: "2024-01-15 12:30:00",
                updatedAt: "2024-01-15 13:00:00"
            },
            {
                id: "1002",
                items: [
                    { productId: "7", name: "Hot Dog Clásico", price: 5.50, quantity: 1, subtotal: 5.50 },
                    { productId: "9", name: "Ensalada César", price: 8.50, quantity: 1, subtotal: 8.50 },
                    { productId: "14", name: "Agua Mineral", price: 1.50, quantity: 2, subtotal: 3.00 }
                ],
                subtotal: 17.00,
                tax: 2.72,
                total: 19.72,
                status: "completed",
                location: "domicilio_1",
                locationType: "domicilio",
                locationDisplay: "Dom 1",
                createdAt: "2024-01-15 13:15:00",
                updatedAt: "2024-01-15 13:45:00"
            },
            {
                id: "1003",
                items: [
                    { productId: "4", name: "Sandwich de Pollo", price: 7.50, quantity: 1, subtotal: 7.50 },
                    { productId: "15", name: "Jugo de Naranja", price: 3.00, quantity: 1, subtotal: 3.00 },
                    { productId: "19", name: "Mazorcada Clásica", price: 4.50, quantity: 1, subtotal: 4.50 }
                ],
                subtotal: 15.00,
                tax: 2.40,
                total: 17.40,
                status: "pending",
                location: "barra_2",
                locationType: "barra",
                locationDisplay: "Barra 2",
                createdAt: "2024-01-15 14:00:00"
            }
        ]
    };

    try {
        // Cargar productos
        for (const product of sampleData.products) {
            await ipcRenderer.invoke('save-product', product);
        }
        
        // Cargar órdenes
        for (const order of sampleData.orders) {
            await ipcRenderer.invoke('save-order', order);
        }
        
        console.log('Datos de ejemplo cargados exitosamente');
    } catch (error) {
        console.error('Error cargando datos de ejemplo:', error);
    }
}

// Load initial data
function loadProducts() {
    if (categories.length > 0) {
        filterByCategory(categories[0].id);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
} 