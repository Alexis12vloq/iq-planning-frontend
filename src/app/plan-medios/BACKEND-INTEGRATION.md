# Integración con Backend - Plan de Medios

## Archivos Creados

### 1. Interfaces TypeScript
`src/app/plan-medios/models/plan-medios-dto.model.ts`
- `PlanMediosQuery` - Para consultas paginadas
- `PlanMediosFilter` - Para filtros de búsqueda
- `PaginationDto` - Para paginación
- `PagedResult<T>` - Para respuestas paginadas
- `PlanMediosListDto` - Para elementos de la lista

### 2. Servicio Angular
`src/app/plan-medios/services/plan-medios.service.ts`
- `consultarPaginado(query: PlanMediosQuery)` - Método principal
- `cargarTodos(pageNumber, pageSize)` - Cargar todos los registros
- `buscarConFiltros(filtros, pageNumber, pageSize)` - Buscar con filtros

### 3. Componente Actualizado
`src/app/plan-medios/plan-medios-consulta/plan-medios-consulta.ts`
- **AHORA USA EL BACKEND POR DEFECTO**
- Métodos modificados:
  - `ngOnInit()` - Ahora llama a `consultarBackend()`
  - `buscar()` - Ahora llama a `buscarEnBackend()`
  - `borrarFiltros()` - Ahora llama a `consultarBackend()`

## Estado Actual

### ✅ Funcionando con Backend
- **Carga inicial**: Al abrir la página se consulta el backend
- **Búsqueda**: Al dar click en "Buscar" se consulta el backend
- **Limpiar filtros**: Al limpiar filtros se consulta el backend

### 🔄 Métodos Disponibles

#### Backend (Activos)
```typescript
this.consultarBackend();    // Consulta paginada
this.buscarEnBackend();     // Buscar con filtros
this.construirFiltrosBackend(); // Construir filtros
```

#### Local (Disponibles como respaldo)
```typescript
this.cargarDatosLocales();  // Cargar desde localStorage
this.buscarLocal();         // Buscar en localStorage
```

## Configuración

### Cambiar URL del Backend
En `src/app/plan-medios/services/plan-medios.service.ts`:
```typescript
private apiUrl = 'https://tu-backend.com/api/planmedios/consultar';
```

### Volver a Funcionalidad Local (si es necesario)
```typescript
// En ngOnInit()
this.cargarDatosLocales(); // En lugar de this.consultarBackend()

// En buscar()
this.buscarLocal(); // En lugar de this.buscarEnBackend()

// En borrarFiltros()
this.dataSource.data = this.allResultados; // En lugar de this.consultarBackend()
```

## Casos de Uso Request

1. **Carga inicial**: `POST /api/planmedios/consultar` con body `{}`
2. **Con paginación**: `POST /api/planmedios/consultar` con body `{"pagination": {"pageNumber": 1, "pageSize": 10}}`
3. **Con filtros**: `POST /api/planmedios/consultar` con body `{"filter": {"anunciante": "Coca-Cola"}, "pagination": {"pageNumber": 1, "pageSize": 10}}`
4. **Filtro por fechas**: `POST /api/planmedios/consultar` con body `{"filter": {"fechaInicio": "2025-01-01", "fechaFin": "2025-12-31"}}`

## Respuesta Esperada

```json
{
  "items": [
    {
      "idPlan": 1001,
      "version": 1,
      "numeroPlan": 1001,
      "campania": "prueba",
      "fechaInicio": "2025-07-10T00:00:00",
      "fechaFin": "2025-07-31T00:00:00",
      "idEstadoRegistro": 1,
      "paisesPauta": "Perú",
      "tipoIngreso": "Plan de Medios",
      "estado": "Activo",
      "anunciante": "Coca-Cola",
      "cliente": "Coca-Cola Perú",
      "marca": "Coca-Cola",
      "producto": "Coca-Cola Original",
      "pais": "Perú"
    }
  ],
  "totalCount": 2,
  "pageNumber": 1,
  "pageSize": 10,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

## Próximos Pasos

1. **Configurar URL del backend** en el servicio
2. **Probar la integración** - Ahora debe llamar al backend automáticamente
3. **Verificar respuestas** - Confirmar que el backend responde correctamente
4. **Implementar paginación del backend** (opcional)
5. **Manejo de errores** - El sistema ya maneja errores básicos 