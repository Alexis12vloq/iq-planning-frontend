# Pruebas de Integración - Plan de Medios Backend

## 🚀 Cómo Probar la Integración

### 1. **Iniciar el Proyecto**
```bash
npm run start
```

### 2. **Abrir la Consola del Navegador**
- F12 → Console tab
- Network tab para ver las llamadas HTTP

### 3. **Navegar al Módulo**
- Ir a: `http://localhost:4200/plan-medios-consulta`

### 4. **Verificar Llamadas**
Al cargar la página deberías ver en la consola:
```
Consultando: http://localhost:5000/api/planmedios/consultar
Query: {pagination: {pageNumber: 1, pageSize: 10}}
```

### 5. **Cambiar Backend URL (si es necesario)**
En la consola del navegador, ejecuta:
```javascript
// Cambiar a puerto 5001
window.angular.getComponent(document.querySelector('app-plan-medios-consulta')).cambiarBackendUrl(1);

// Cambiar a puerto 7000
window.angular.getComponent(document.querySelector('app-plan-medios-consulta')).cambiarBackendUrl(2);

// Volver a puerto 5000
window.angular.getComponent(document.querySelector('app-plan-medios-consulta')).cambiarBackendUrl(0);
```

## 🔍 Qué Verificar

### ✅ Carga Inicial
- [ ] Se hace llamada POST a `/api/planmedios/consultar`
- [ ] Se envía `{pagination: {pageNumber: 1, pageSize: 10}}`
- [ ] Se muestra spinner de carga
- [ ] Se procesan los datos recibidos

### ✅ Búsqueda con Filtros
- [ ] Llenar campos de filtros
- [ ] Click en "Buscar"
- [ ] Se envía POST con `filter` y `pagination`
- [ ] Se actualizan los resultados

### ✅ Limpiar Filtros
- [ ] Click en "Borrar filtros"
- [ ] Se limpian los campos
- [ ] Se hace nueva llamada sin filtros

## 🐛 Posibles Problemas y Soluciones

### Error CORS
```
Access to XMLHttpRequest at 'http://localhost:5000/api/planmedios/consultar' from origin 'http://localhost:4200' has been blocked by CORS policy
```

**Solución**: Configurar CORS en tu backend para permitir:
- Origin: `http://localhost:4200`
- Methods: `POST, GET, OPTIONS`
- Headers: `Content-Type, Accept`

### Error de Conexión
```
net::ERR_CONNECTION_REFUSED
```

**Solución**: Verificar que tu backend esté corriendo en el puerto configurado.

### Error 404
```
404 Not Found
```

**Solución**: Verificar que la ruta `/api/planmedios/consultar` existe en tu backend.

## 📋 Ejemplo de Request/Response

### Request
```json
POST http://localhost:5000/api/planmedios/consultar
Content-Type: application/json

{
  "filter": {
    "anunciante": "Coca-Cola",
    "fechaInicio": "2025-01-01T00:00:00.000Z",
    "fechaFin": "2025-12-31T00:00:00.000Z"
  },
  "pagination": {
    "pageNumber": 1,
    "pageSize": 10
  }
}
```

### Response Esperada
```json
{
  "items": [
    {
      "idPlan": 1001,
      "version": 1,
      "numeroPlan": 1001,
      "campania": "Campaña de Prueba",
      "fechaInicio": "2025-01-01T00:00:00",
      "fechaFin": "2025-12-31T00:00:00",
      "idEstadoRegistro": 1,
      "paisesPauta": "Perú",
      "anunciante": "Coca-Cola",
      "cliente": "Coca-Cola Perú",
      "marca": "Coca-Cola",
      "producto": "Coca-Cola Original",
      "pais": "Perú",
      "tipoIngreso": "Plan de Medios",
      "estado": "Activo"
    }
  ],
  "totalCount": 1,
  "pageNumber": 1,
  "pageSize": 10,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

## 🎯 Comandos Útiles para Debugging

### En la Consola del Navegador
```javascript
// Ver el servicio actual
angular.getComponent(document.querySelector('app-plan-medios-consulta')).planMediosService.getCurrentUrl()

// Hacer consulta manual
angular.getComponent(document.querySelector('app-plan-medios-consulta')).consultarBackend()

// Ver filtros construidos
angular.getComponent(document.querySelector('app-plan-medios-consulta')).construirFiltrosBackend()
``` 