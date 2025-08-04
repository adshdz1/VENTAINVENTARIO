// Datos de ejemplo para el restaurante
const sampleData = {
    products: [
        {
            id: "1",
            name: "Hamburguesa Clásica",
            categoryId: "2",
            price: 12.50,
            stock: 25,
            description: "Hamburguesa con carne, lechuga, tomate y queso",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "2",
            name: "Pizza Margherita",
            categoryId: "2",
            price: 15.00,
            stock: 15,
            description: "Pizza con tomate, mozzarella y albahaca",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "3",
            name: "Ensalada César",
            categoryId: "1",
            price: 8.50,
            stock: 20,
            description: "Ensalada con lechuga, crutones, parmesano y aderezo César",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "4",
            name: "Pasta Carbonara",
            categoryId: "2",
            price: 13.00,
            stock: 18,
            description: "Pasta con huevo, queso parmesano, panceta y pimienta negra",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "5",
            name: "Tiramisú",
            categoryId: "3",
            price: 6.50,
            stock: 12,
            description: "Postre italiano con café, mascarpone y cacao",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "6",
            name: "Coca Cola",
            categoryId: "4",
            price: 2.50,
            stock: 50,
            description: "Refresco de cola 350ml",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "7",
            name: "Agua Mineral",
            categoryId: "4",
            price: 1.50,
            stock: 30,
            description: "Agua mineral natural 500ml",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "8",
            name: "Sopa de Tomate",
            categoryId: "1",
            price: 5.50,
            stock: 8,
            description: "Sopa cremosa de tomate con albahaca",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "9",
            name: "Filete de Pescado",
            categoryId: "2",
            price: 18.00,
            stock: 5,
            description: "Filete de pescado fresco con vegetales",
            createdAt: "2024-01-01 10:00:00"
        },
        {
            id: "10",
            name: "Chocolate Caliente",
            categoryId: "4",
            price: 4.00,
            stock: 15,
            description: "Chocolate caliente con leche y canela",
            createdAt: "2024-01-01 10:00:00"
        }
    ],
    categories: [
        { id: "1", name: "Entradas", color: "#FF6B6B" },
        { id: "2", name: "Platos Principales", color: "#4ECDC4" },
        { id: "3", name: "Postres", color: "#45B7D1" },
        { id: "4", name: "Bebidas", color: "#96CEB4" }
    ],
    orders: [
        {
            id: "1001",
            items: [
                { productId: "1", name: "Hamburguesa Clásica", price: 12.50, quantity: 2, subtotal: 25.00 },
                { productId: "6", name: "Coca Cola", price: 2.50, quantity: 2, subtotal: 5.00 }
            ],
            subtotal: 30.00,
            tax: 4.80,
            total: 34.80,
            status: "completed",
            createdAt: "2024-01-15 12:30:00",
            updatedAt: "2024-01-15 13:00:00"
        },
        {
            id: "1002",
            items: [
                { productId: "2", name: "Pizza Margherita", price: 15.00, quantity: 1, subtotal: 15.00 },
                { productId: "3", name: "Ensalada César", price: 8.50, quantity: 1, subtotal: 8.50 },
                { productId: "7", name: "Agua Mineral", price: 1.50, quantity: 2, subtotal: 3.00 }
            ],
            subtotal: 26.50,
            tax: 4.24,
            total: 30.74,
            status: "completed",
            createdAt: "2024-01-15 13:15:00",
            updatedAt: "2024-01-15 13:45:00"
        },
        {
            id: "1003",
            items: [
                { productId: "4", name: "Pasta Carbonara", price: 13.00, quantity: 1, subtotal: 13.00 },
                { productId: "5", name: "Tiramisú", price: 6.50, quantity: 1, subtotal: 6.50 },
                { productId: "10", name: "Chocolate Caliente", price: 4.00, quantity: 1, subtotal: 4.00 }
            ],
            subtotal: 23.50,
            tax: 3.76,
            total: 27.26,
            status: "pending",
            createdAt: "2024-01-15 14:00:00"
        }
    ]
};

// Función para cargar datos de ejemplo
function loadSampleData() {
    const { ipcRenderer } = require('electron');
    
    // Cargar productos
    sampleData.products.forEach(async (product) => {
        await ipcRenderer.invoke('save-product', product);
    });
    
    // Cargar órdenes
    sampleData.orders.forEach(async (order) => {
        await ipcRenderer.invoke('save-order', order);
    });
    
    console.log('Datos de ejemplo cargados exitosamente');
}

// Exportar para uso en renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sampleData, loadSampleData };
} 