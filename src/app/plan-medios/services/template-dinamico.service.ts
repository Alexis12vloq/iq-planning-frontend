import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { BackendMediosService } from './backend-medios.service';
import { TemplatePantallaJsonBackend } from '../models/backend-models';
import { PlantillaPauta, CampoPlantilla } from '../models/plantilla-pauta.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateDinamicoService {
  private plantillasCache: Map<number, PlantillaPauta> = new Map();
  private plantillasCargadas: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private mediosDisponibles: any[] = [];

  // ✅ DATOS TEMPORALES HARDCODEADOS (reemplazar con backend después)
  private templatesHardcodeados: TemplatePantallaJsonBackend[] = [
    {
      templateId: 1,
      pantalla: 'tv-abierta-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 6,
      medioNombre: 'TV Abierta',
      jsonSchema: `{
        "fields": [
          { "name": "proveedor", "label": "PROVEEDOR", "type": "string", "required": true, "origen": "I Global" },
          { "name": "vehiculo", "label": "VEHICULO", "type": "string", "required": true, "origen": "I Global" },
          { "name": "programa", "label": "PROGRAMA", "type": "string", "required": false, "origen": "I Global" },
          { "name": "horario", "label": "HORARIO", "type": "string", "required": false, "origen": "Manual" },
          { "name": "duracion", "label": "DURACIÓN", "type": "integer", "required": false, "origen": "Manual" },
          { "name": "tarifa_bruta", "label": "TARIFA BRUTA", "type": "money", "required": true, "origen": "Manual" },
          { "name": "descuento", "label": "DESCUENTO", "type": "decimal", "required": false, "origen": "Manual" },
          { "name": "total_spots", "label": "TOTAL SPOTS", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_neto", "label": "VALOR NETO", "type": "money", "required": false, "origen": "Calculado" },
          { "name": "valor_total", "label": "VALOR TOTAL", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:17:22.270',
      usuarioCreacion: 'SYSTEM',
      estado: true
    },
    {
      templateId: 2,
      pantalla: 'tv-paga-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 7,
      medioNombre: 'TV Paga',
      jsonSchema: `{
        "fields": [
          { "name": "proveedor", "label": "Proveedor", "type": "string", "required": true, "origen": "Desplegable" },
          { "name": "vehiculo", "label": "Vehiculo", "type": "string", "required": true, "origen": "I Global" },
          { "name": "programa", "label": "Programa", "type": "string", "required": false, "origen": "I Global" },
          { "name": "tarifa_bruta", "label": "Tarifa Bruta", "type": "money", "required": true, "origen": "Manual" },
          { "name": "total_spots", "label": "Total Spots", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_total", "label": "Valor Total", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:19:35.523',
      usuarioCreacion: 'SYSTEM',
      estado: true
    },
    {
      templateId: 4,
      pantalla: 'radio-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 2,
      medioNombre: 'Radio',
      jsonSchema: `{
        "fields": [
          { "name": "cobertura", "label": "Cobertura", "type": "string", "required": false, "origen": "Desplegable" },
          { "name": "plaza", "label": "Plaza", "type": "string", "required": false, "origen": "Desplegable" },
          { "name": "proveedor", "label": "Proveedor", "type": "string", "required": true, "origen": "Desplegable" },
          { "name": "estacion", "label": "Estación", "type": "string", "required": true, "origen": "I Global" },
          { "name": "franja", "label": "Franja", "type": "string", "required": false, "origen": "Manual" },
          { "name": "tarifa_bruta", "label": "Tarifa Bruta", "type": "money", "required": true, "origen": "Manual" },
          { "name": "total_spots", "label": "Total Spots", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_total", "label": "Valor Total", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:22:24.880',
      usuarioCreacion: 'SYSTEM',
      estado: true
    },
    {
      templateId: 6,
      pantalla: 'prensa-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 4,
      medioNombre: 'Prensa',
      jsonSchema: `{
        "fields": [
          { "name": "region", "label": "Región", "type": "string", "required": false, "origen": "Desplegable" },
          { "name": "medio", "label": "Medio", "type": "string", "required": false, "origen": "I Global" },
          { "name": "proveedor", "label": "Proveedor", "type": "string", "required": true, "origen": "Manual" },
          { "name": "formato", "label": "Formato", "type": "string", "required": false, "origen": "Manual" },
          { "name": "tarifa_bruta", "label": "Tarifa Bruta", "type": "money", "required": true, "origen": "Manual" },
          { "name": "total_spots", "label": "Total Spots", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_total", "label": "Valor Total", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:26:24.197',
      usuarioCreacion: 'SYSTEM',
      estado: true
    },
    {
      templateId: 8,
      pantalla: 'ooh-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 5,
      medioNombre: 'OOH',
      jsonSchema: `{
        "fields": [
          { "name": "tipoCompra", "label": "Tipo de compra", "type": "string", "required": false, "origen": "I Global" },
          { "name": "proveedor", "label": "Proveedor", "type": "string", "required": false, "origen": "I Global" },
          { "name": "ubicacion", "label": "Ubicación", "type": "string", "required": false, "origen": "Manual" },
          { "name": "formato", "label": "Formato", "type": "string", "required": false, "origen": "Manual" },
          { "name": "tarifa_bruta", "label": "Tarifa Bruta", "type": "money", "required": true, "origen": "Manual" },
          { "name": "total_spots", "label": "Total Spots", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_total", "label": "Valor Total", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:33:04.330',
      usuarioCreacion: 'SYSTEM',
      estado: true
    },
    {
      templateId: 9,
      pantalla: 'digital-formulario',
      paisId: 5,
      paisNombre: 'Perú',
      tablaCompleta: 'Templates',
      medioId: 3,
      medioNombre: 'Digital',
      jsonSchema: `{
        "fields": [
          { "name": "canal", "label": "Canal", "type": "string", "required": false, "origen": "" },
          { "name": "etapa", "label": "Etapa", "type": "string", "required": false, "origen": "" },
          { "name": "medida", "label": "Medida", "type": "string", "required": false, "origen": "" },
          { "name": "plataforma", "label": "Plataforma", "type": "string", "required": false, "origen": "Manual" },
          { "name": "proveedor", "label": "Proveedor", "type": "string", "required": true, "origen": "Manual" },
          { "name": "tarifa_bruta", "label": "Tarifa Bruta", "type": "money", "required": true, "origen": "Manual" },
          { "name": "total_spots", "label": "Total Spots", "type": "integer", "required": true, "origen": "Manual" },
          { "name": "valor_total", "label": "Valor Total", "type": "money", "required": false, "origen": "Calculado" }
        ]
      }`,
      fechaCreacion: '2025-07-17T17:34:40.100',
      usuarioCreacion: 'SYSTEM',
      estado: true
    }
  ];

  // Mapeo de nombres de medios a medioId
  private medioNombreToId: { [key: string]: number } = {
    'TV NAL': 6,        // TV Abierta
    'TV Abierta': 6,
    'TV Paga': 7,
    'TV Local': 8,
    'Radio': 2,
    'Revista': 9,
    'Prensa': 4,
    'Cine': 10,
    'OOH': 5,
    'Digital': 3
  };

  constructor(private backendMediosService: BackendMediosService) {
    console.log('🏗️ TemplateDinamicoService inicializado con datos TEMPORALES hardcodeados');
    console.log('📊 Templates disponibles:', this.templatesHardcodeados.length);
    console.log('📊 Medios mapeados:', Object.keys(this.medioNombreToId));
    
    // 🚧 TODO IMPORTANTE: Para activar backend real, hacer lo siguiente:
    console.warn('🚧 TODO: Para activar backend:');
    console.warn('  1. Descomentar métodos con /* ... */');
    console.warn('  2. Cambiar obtenerPlantillaPorMedio() para llamar backend');
    console.warn('  3. Remover templatesHardcodeados y medioNombreToId');
    console.warn('  4. Remover mensaje temporal del HTML');
  }

  /**
   * 🚧 TEMPORAL: Cargar plantilla usando datos hardcodeados
   */
  obtenerPlantillaPorMedio(medioNombre: string): Observable<PlantillaPauta | null> {
    console.log('🔄 [TEMPORAL] Obteniendo plantilla hardcodeada para medio:', medioNombre);

    // Buscar medioId usando el mapeo
    const medioId = this.medioNombreToId[medioNombre];
    if (!medioId) {
      console.warn('⚠️ [TEMPORAL] No se encontró medioId para:', medioNombre);
      console.warn('⚠️ Medios disponibles:', Object.keys(this.medioNombreToId));
      return of(null);
    }

    // Verificar cache primero
    if (this.plantillasCache.has(medioId)) {
      console.log('✅ [TEMPORAL] Plantilla encontrada en cache para:', medioNombre);
      return of(this.plantillasCache.get(medioId)!);
    }

    // Buscar template hardcodeado
    const template = this.templatesHardcodeados.find(t => t.medioId === medioId && t.estado);
    if (!template) {
      console.warn('⚠️ [TEMPORAL] No se encontró template hardcodeado para medioId:', medioId);
      return of(null);
    }

    // Convertir y cachear
    const plantilla = this.convertirTemplateBackendALocal(template);
    this.plantillasCache.set(medioId, plantilla);
    
    console.log('✅ [TEMPORAL] Plantilla hardcodeada cargada y cacheada:', medioNombre);
    return of(plantilla);
  }

  /**
   * 🚧 TEMPORAL: Obtener plantilla por medioId usando datos hardcodeados
   */
  obtenerPlantillaPorMedioId(medioId: number): Observable<PlantillaPauta | null> {
    console.log('🔄 [TEMPORAL] Obteniendo plantilla hardcodeada para medioId:', medioId);

    // Verificar cache primero
    if (this.plantillasCache.has(medioId)) {
      console.log('✅ [TEMPORAL] Plantilla encontrada en cache para medioId:', medioId);
      return of(this.plantillasCache.get(medioId)!);
    }

    // Buscar template hardcodeado
    const template = this.templatesHardcodeados.find(t => t.medioId === medioId && t.estado);
    if (!template) {
      console.warn('⚠️ [TEMPORAL] No se encontró template hardcodeado para medioId:', medioId);
      return of(null);
    }

    // Convertir y cachear
    const plantilla = this.convertirTemplateBackendALocal(template);
    this.plantillasCache.set(medioId, plantilla);
    
    console.log('✅ [TEMPORAL] Plantilla hardcodeada cargada y cacheada para medioId:', medioId);
    return of(plantilla);

    // TODO: Descomentar cuando se conecte al backend real
    /*
    return this.backendMediosService.getTemplatesPorMedio(medioId).pipe(
      map(templates => {
        if (templates.length === 0) {
          console.warn('⚠️ No se encontraron templates para medioId:', medioId);
          return null;
        }

        // Tomar el primer template activo
        const template = templates.find(t => t.estado) || templates[0];
        const plantilla = this.convertirTemplateBackendALocal(template);
        
        // Guardar en cache
        this.plantillasCache.set(medioId, plantilla);
        console.log('✅ Plantilla cargada y cacheada para medioId:', medioId);
        
        return plantilla;
      }),
      catchError(error => {
        console.error('❌ Error cargando plantilla para medioId:', medioId, error);
        return of(null);
      })
    );
    */
  }

  // TODO: Descomentar cuando se use backend real
  /**
   * Cargar medios disponibles y buscar plantilla
   */
  /*
  private cargarMediosYBuscarPlantilla(medioNombre: string): Observable<PlantillaPauta | null> {
    return this.backendMediosService.getMedios().pipe(
      tap(medios => {
        this.mediosDisponibles = medios;
        console.log('📊 Medios cargados:', medios.length);
      }),
      map(medios => {
        const medio = medios.find(m => m.nombre === medioNombre);
        if (!medio) {
          console.warn('⚠️ Medio no encontrado después de cargar:', medioNombre);
          return null;
        }
        return medio;
      }),
      switchMap(medio => {
        if (!medio) return of(null);
        return this.cargarPlantillaDesdeBackend(medio.medioId, medioNombre);
      }),
      catchError(error => {
        console.error('❌ Error cargando medios:', error);
        return of(null);
      })
    );
  }
  */

  // TODO: Descomentar cuando se use backend real
  /**
   * Cargar plantilla desde backend
   */
  /*
  private cargarPlantillaDesdeBackend(medioId: number, medioNombre: string): Observable<PlantillaPauta | null> {
    return this.backendMediosService.getTemplatesPorMedio(medioId).pipe(
      map(templates => {
        if (templates.length === 0) {
          console.warn('⚠️ No se encontraron templates para:', medioNombre);
          return null;
        }

        // Tomar el primer template activo
        const template = templates.find(t => t.estado) || templates[0];
        const plantilla = this.convertirTemplateBackendALocal(template);
        
        // Guardar en cache
        this.plantillasCache.set(medioId, plantilla);
        console.log('✅ Plantilla cargada y cacheada para:', medioNombre);
        
        return plantilla;
      }),
      catchError(error => {
        console.error('❌ Error cargando template desde backend:', error);
        return of(null);
      })
    );
  }
  */

  /**
   * Convertir template del backend al formato local
   */
  private convertirTemplateBackendALocal(template: TemplatePantallaJsonBackend): PlantillaPauta {
    console.log('🔄 Convirtiendo template backend:', template.templateId);
    
    let campos: CampoPlantilla[] = [];
    
    try {
      // Parsear el jsonSchema para obtener los campos
      const schema = JSON.parse(template.jsonSchema);
      campos = this.extraerCamposDeSchema(schema);
      console.log('✅ Campos extraídos del schema:', campos.length);
    } catch (error) {
      console.error('❌ Error parseando jsonSchema:', error);
      // Fallback a campos por defecto si falla el parsing
      campos = this.generarCamposPorDefecto(template.medioNombre);
    }

    const plantilla: PlantillaPauta = {
      id: template.templateId.toString(),
      nombre: `Template ${template.medioNombre}`,
      descripcion: `Plantilla dinámica para ${template.medioNombre} (${template.paisNombre})`,
      medio: template.medioNombre,
      paisFacturacion: template.paisNombre,
      fields: campos,
      fechaCreacion: template.fechaCreacion,
      activa: template.estado
    };

    console.log('✅ Template convertido:', plantilla);
    return plantilla;
  }

  /**
   * Extraer campos del JSON Schema (adaptado para estructura temporal)
   */
  private extraerCamposDeSchema(schema: any): CampoPlantilla[] {
    const campos: CampoPlantilla[] = [];
    
    // ✅ TEMPORAL: Manejar estructura con "fields" array
    if (schema.fields && Array.isArray(schema.fields)) {
      console.log('📋 [TEMPORAL] Procesando estructura con fields array:', schema.fields.length);
      
      schema.fields.forEach((field: any) => {
        const campo: CampoPlantilla = {
          name: field.name,
          label: field.label || this.formatearLabel(field.name),
          type: this.mapearTipoSchema(field.type),
          required: field.required || false,
          defaultValue: this.obtenerValorPorDefecto(field.type),
          // Campos adicionales para debug
          options: undefined,
          lookupTable: undefined,
          lookupCategory: undefined
        };
        
        campos.push(campo);
        console.log(`📋 Campo procesado: ${field.name} (${field.type}) - ${field.label}`);
      });
    } 
    // Estructura tradicional con properties (para futuro uso con backend real)
    else if (schema.properties) {
      console.log('📋 Procesando estructura con properties');
      
      Object.keys(schema.properties).forEach(fieldName => {
        const property = schema.properties[fieldName];
        
        const campo: CampoPlantilla = {
          name: fieldName,
          label: property.title || this.formatearLabel(fieldName),
          type: this.mapearTipoSchema(property.type),
          required: schema.required ? schema.required.includes(fieldName) : false,
          defaultValue: property.default || this.obtenerValorPorDefecto(property.type),
          options: property.enum || undefined,
          lookupTable: property.lookup?.table || undefined,
          lookupCategory: property.lookup?.category || undefined
        };
        
        campos.push(campo);
      });
    }
    
    console.log('📋 Total campos extraídos del schema:', campos.length);
    console.log('📋 Campos procesados:', campos.map(c => `${c.name}(${c.type})`).join(', '));
    return campos;
  }

  /**
   * Generar campos por defecto si falla el schema
   */
  private generarCamposPorDefecto(medioNombre: string): CampoPlantilla[] {
    const camposComunes: CampoPlantilla[] = [
      { name: 'proveedor', label: 'Proveedor', type: 'string', required: true, defaultValue: '' },
      { name: 'tarifa_bruta', label: 'Tarifa Bruta', type: 'money', required: true, defaultValue: 0 },
      { name: 'total_spots', label: 'Total Spots', type: 'integer', required: true, defaultValue: 1 },
      { name: 'valor_neto', label: 'Valor Neto', type: 'money', required: false, defaultValue: 0 },
      { name: 'valor_total', label: 'Valor Total', type: 'money', required: false, defaultValue: 0 }
    ];

    // Agregar campos específicos por medio
    switch (medioNombre.toUpperCase()) {
      case 'TV NAL':
      case 'TELEVISION':
        camposComunes.push(
          { name: 'programa', label: 'Programa', type: 'string', required: false, defaultValue: '' },
          { name: 'horario', label: 'Horario', type: 'time', required: false, defaultValue: '' },
          { name: 'duracion', label: 'Duración', type: 'integer', required: false, defaultValue: 30 }
        );
        break;
      case 'RADIO':
        camposComunes.push(
          { name: 'estacion', label: 'Estación', type: 'string', required: false, defaultValue: '' },
          { name: 'franja', label: 'Franja', type: 'string', required: false, defaultValue: '' }
        );
        break;
      case 'DIGITAL':
        camposComunes.push(
          { name: 'plataforma', label: 'Plataforma', type: 'string', required: false, defaultValue: '' },
          { name: 'formato', label: 'Formato', type: 'string', required: false, defaultValue: '' }
        );
        break;
    }

    return camposComunes;
  }

  /**
   * Formatear nombre de campo a label
   */
  private formatearLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Obtener valor por defecto según el tipo de campo
   */
  private obtenerValorPorDefecto(tipo: string): any {
    switch (tipo) {
      case 'integer': return 0;
      case 'decimal':
      case 'money': return 0;
      case 'boolean': return false;
      case 'string':
      default: return '';
    }
  }

  /**
   * Mapear tipos de schema a tipos locales
   */
  private mapearTipoSchema(schemaType: string): 'integer' | 'string' | 'decimal' | 'money' | 'time' | 'date' | 'boolean' {
    switch (schemaType) {
      case 'number': return 'decimal';
      case 'integer': return 'integer';
      case 'boolean': return 'boolean';
      default: return 'string';
    }
  }

  /**
   * Limpiar cache (para testing)
   */
  limpiarCache(): void {
    this.plantillasCache.clear();
    this.plantillasCargadas.next(false);
    console.log('🧹 Cache de plantillas limpiado');
  }

  /**
   * Obtener estadísticas del cache (adaptado para datos temporales)
   */
  obtenerEstadisticasCache(): any {
    return {
      // Datos temporales
      modoTemporal: true,
      templatesHardcodeados: this.templatesHardcodeados.length,
      mediosHardcodeados: Object.keys(this.medioNombreToId).length,
      
      // Cache
      plantillasEnCache: this.plantillasCache.size,
      
      // Mapeo disponible
      medioNombreToIdDisponibles: Object.keys(this.medioNombreToId),
      templatesDisponiblesPorMedio: this.templatesHardcodeados.map(t => ({
        medioId: t.medioId,
        medioNombre: t.medioNombre,
        templateId: t.templateId,
        campos: JSON.parse(t.jsonSchema).fields?.length || 0
      })),
      
      // Estado del servicio
      plantillasCargadas: this.plantillasCargadas.value
    };
  }

  // Métodos de compatibilidad con el servicio anterior
  obtenerDatosLookup(tabla: string, categoria?: string): any[] {
    console.log('⚠️ obtenerDatosLookup no implementado en plantillas dinámicas');
    return [];
  }

  obtenerProveedoresPorMedio(medio: string): any[] {
    console.log('⚠️ obtenerProveedoresPorMedio no implementado en plantillas dinámicas');
    return [];
  }
} 