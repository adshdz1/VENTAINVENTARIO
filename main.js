const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const moment = require('moment');

// Initialize data store
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Rocoto Burguer'
  });

  // Start with login page
  mainWindow.loadFile('login.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for data management

// Products/Inventory
ipcMain.handle('get-products', () => {
  return store.get('products', []);
});

ipcMain.handle('save-product', (event, product) => {
  const products = store.get('products', []);
  if (product.id) {
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
    }
  } else {
    product.id = Date.now().toString();
    product.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
    products.push(product);
  }
  store.set('products', products);
  return product;
});

ipcMain.handle('delete-product', (event, productId) => {
  const products = store.get('products', []);
  const filtered = products.filter(p => p.id !== productId);
  store.set('products', filtered);
  return true;
});

// Orders/Billing
ipcMain.handle('get-orders', () => {
  return store.get('orders', []);
});

ipcMain.handle('save-order', (event, order) => {
  const orders = store.get('orders', []);
  if (order.id) {
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders[index] = order;
    }
  } else {
    order.id = Date.now().toString();
    order.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
    order.status = 'pending';
    orders.push(order);
  }
  store.set('orders', orders);
  return order;
});

ipcMain.handle('clear-all-orders', () => {
  store.set('orders', []);
  return { success: true, message: 'Todas las órdenes han sido eliminadas' };
});

ipcMain.handle('update-order-status', (event, orderId, status) => {
  const orders = store.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
    store.set('orders', orders);
  }
  return order;
});

// Database management
ipcMain.handle('load-database', () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'database.json');
    
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      const database = JSON.parse(data);
      
      // Store categories and products in electron-store
      store.set('categories', database.categories);
      store.set('products', database.products);
      store.set('settings', database.settings);
      
      return { success: true, message: 'Database loaded successfully' };
    } else {
      return { success: false, message: 'Database file not found' };
    }
  } catch (error) {
    console.error('Error loading database:', error);
    return { success: false, message: 'Error loading database' };
  }
});

// Categories
ipcMain.handle('get-categories', () => {
  return store.get('categories', [
    { id: '1', name: 'Hamburguesas', color: '#FF6B6B', icon: 'fas fa-hamburger' },
    { id: '2', name: 'Sandwiches', color: '#4ECDC4', icon: 'fas fa-bread-slice' },
    { id: '3', name: 'Hot Dogs', color: '#45B7D1', icon: 'fas fa-hotdog' },
    { id: '4', name: 'Ensaladas', color: '#96CEB4', icon: 'fas fa-leaf' },
    { id: '5', name: 'Carnes', color: '#FFA500', icon: 'fas fa-drumstick-bite' },
    { id: '6', name: 'Bebidas', color: '#3498DB', icon: 'fas fa-wine-bottle' },
    { id: '7', name: 'Adicionales', color: '#9B59B6', icon: 'fas fa-plus-circle' },
    { id: '8', name: 'Mazorcadas', color: '#E67E22', icon: 'fas fa-seedling' },
    { id: '9', name: 'Toppings', color: '#E74C3C', icon: 'fas fa-star' }
  ]);
});

// Get products by category
ipcMain.handle('get-products-by-category', (event, categoryId) => {
  const products = store.get('products', {});
  
  if (categoryId === '1') {
    // Hamburguesas
    return products.hamburguesas || [];
  } else if (categoryId === '7') {
    // Adicionales
    return products.adicionales || [];
  }
  
  return [];
});

// Reports
ipcMain.handle('get-sales-report', (event, startDate, endDate) => {
  const orders = store.get('orders', []);
  const filtered = orders.filter(order => {
    const orderDate = moment(order.createdAt);
    return orderDate.isBetween(startDate, endDate, 'day', '[]') && order.status === 'completed';
  });
  
  const total = filtered.reduce((sum, order) => sum + order.total, 0);
  const count = filtered.length;
  
  return { orders: filtered, total, count };
});

// Authentication handlers
ipcMain.handle('get-credentials', () => {
  return store.get('credentials', {});
});

ipcMain.handle('save-credentials', (event, credentials) => {
  store.set('credentials', credentials);
  return true;
});

ipcMain.handle('get-user-session', () => {
  return store.get('userSession', null);
});

ipcMain.handle('save-user-session', (event, session) => {
  store.set('userSession', session);
  return true;
});

ipcMain.handle('clear-user-session', () => {
  store.delete('userSession');
  return true;
});

// Export data
ipcMain.handle('export-data', async (event) => {
  const data = {
    products: store.get('products', []),
    orders: store.get('orders', []),
    categories: store.get('categories', []),
    exportDate: moment().format('YYYY-MM-DD HH:mm:ss')
  };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Datos',
    defaultPath: `restaurant-data-${moment().format('YYYY-MM-DD')}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (!result.canceled) {
    const fs = require('fs');
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return result.filePath;
  }
  return null;
}); 