# 🍔 Restaurant Billing & Inventory System

Una aplicación de escritorio completa para la gestión de facturación y control de inventario de restaurantes, desarrollada con Electron y JavaScript.

## 🚀 Características Principales

### 🔐 **Sistema de Autenticación**
- **Dos roles de usuario:**
  - 👨‍💼 **Administrador** - Acceso completo al sistema
  - 👨‍💻 **Cajero** - Solo facturación y gestión de órdenes
- **Credenciales por defecto:**
  - Admin: `admin` / `admin123`
  - Cajero: `cajero` / `cajero123`

### 📍 **Gestión de Ubicaciones**
- **14 Mesas** para servicio en restaurante
- **14 Domicilios** para pedidos a domicilio
- **14 Barras** para pedidos en barra
- **Control de ocupación** en tiempo real

### 🍽️ **Menú Especializado**
- **Hamburguesas** - Clásica, Doble, Especial
- **Sandwiches** - Pollo, Jamón, Vegetariano
- **Hot Dogs** - Clásico, Especial
- **Ensaladas** - César, Mixta
- **Carnes** - Bistec, Pollo a la plancha
- **Bebidas** - Coca Cola, Agua, Jugos
- **Adicionales** - Papas, Onion Rings, Nuggets
- **Mazorcadas** - Clásica, con Queso
- **Toppings** - Queso, Bacon, Cebolla caramelizada

### 📊 **Dashboard Inteligente**
- Estadísticas en tiempo real
- Resumen de ventas del día
- Productos populares
- Alertas de stock bajo (solo admin)

### 💰 **Sistema de Facturación**
- Cálculo automático de IVA (16%)
- Impresión de recibos
- Gestión de estados de órdenes
- Interfaz visual moderna

### 📦 **Gestión de Inventario** (Solo Admin)
- Control completo de productos
- Categorización automática
- Alertas de stock bajo
- Búsqueda y filtros avanzados

### 📋 **Gestión de Órdenes**
- Seguimiento de estados (Pendiente → Preparando → Listo → Completado)
- Filtros por fecha y estado
- Acciones rápidas para cada orden

### 📈 **Reportes** (Solo Admin)
- Reporte de ventas por período
- Exportación de datos en JSON
- Análisis de productos con stock bajo

## 🛠️ Instalación

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd restaurant-billing-inventory
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar la aplicación**
   ```bash
   npm start
   ```

4. **Para desarrollo (con DevTools)**
   ```bash
   npm run dev
   ```

## 📦 Construcción de la aplicación

### Para Windows
```bash
npm run build
```

### Para distribución
```bash
npm run dist
```

## 🎯 Uso de la aplicación

### Primeros pasos

1. **Iniciar sesión**
   - Usar credenciales de admin o cajero
   - Opción de "Recordar sesión"

2. **Seleccionar ubicación**
   - Mesa, Domicilio o Barra
   - Números del 1 al 14

3. **Crear orden**
   - Seleccionar categoría de productos
   - Agregar productos al carrito
   - Completar orden

### Funcionalidades por rol

#### 👨‍💻 **Cajero**
- ✅ Facturación rápida
- ✅ Gestión de órdenes
- ✅ Dashboard básico
- ❌ Sin acceso a inventario
- ❌ Sin acceso a reportes

#### 👨‍💼 **Administrador**
- ✅ Acceso completo
- ✅ Gestión de inventario
- ✅ Reportes detallados
- ✅ Configuración del sistema
- ✅ Exportación de datos

## 🗂️ Estructura del proyecto

```
restaurant-billing-inventory/
├── main.js              # Proceso principal de Electron
├── index.html           # Interfaz principal
├── login.html           # Pantalla de autenticación
├── styles.css           # Estilos de la aplicación
├── login-styles.css     # Estilos del login
├── renderer.js          # Lógica del frontend
├── login.js             # Lógica de autenticación
├── package.json         # Configuración del proyecto
├── README.md           # Documentación
├── .gitignore          # Archivos a ignorar
└── assets/             # Recursos (iconos, etc.)
```

## 💾 Almacenamiento de datos

La aplicación utiliza `electron-store` para almacenar datos localmente:

- **Productos**: Información de inventario
- **Órdenes**: Historial de ventas
- **Categorías**: Organización de productos
- **Credenciales**: Usuarios y contraseñas
- **Sesiones**: Datos de usuario activo

## 🔧 Configuración avanzada

### Variables de entorno
```bash
# Modo desarrollo
NODE_ENV=development npm run dev

# Modo producción
NODE_ENV=production npm start
```

### Personalización
- **Colores**: Modifica las variables CSS en `styles.css`
- **Categorías**: Edita las categorías por defecto en `main.js`
- **IVA**: Cambia el porcentaje de IVA en `renderer.js`

## 🐛 Solución de problemas

### Problemas comunes

1. **La aplicación no inicia**
   - Verifica que Node.js esté instalado
   - Ejecuta `npm install` nuevamente
   - Revisa los logs de error

2. **Error de credenciales**
   - Usa las credenciales por defecto
   - Admin: `admin` / `admin123`
   - Cajero: `cajero` / `cajero123`

3. **Los datos no se guardan**
   - Verifica permisos de escritura en el directorio
   - Reinicia la aplicación

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🔄 Actualizaciones

### Versión 2.0.0
- ✅ Sistema de autenticación con roles
- ✅ Gestión de ubicaciones (Mesas, Domicilio, Barra)
- ✅ Menú especializado del restaurante
- ✅ Interfaz moderna y responsiva
- ✅ Control de acceso basado en roles
- ✅ Dashboard personalizado por rol

### Próximas características
- 🔄 Integración con impresoras térmicas
- 🔄 Backup automático en la nube
- 🔄 Integración con sistemas de pago
- 🔄 App móvil complementaria
- 🔄 Múltiples sucursales

---

**Desarrollado con ❤️ para restaurantes**

*Sistema completo de facturación e inventario para restaurantes con control de acceso y gestión de ubicaciones.* 