import { Injectable } from '@angular/core';
import { PlantillaPauta, LookupData, CampoPlantilla } from '../models/plantilla-pauta.model';

@Injectable({
  providedIn: 'root'
})
export class PlantillaPautaService {

  constructor() {
    this.inicializarDatosEjemplo();
  }

  // Obtener plantilla según país de facturación y medio
  obtenerPlantilla(paisFacturacion: string, medio: string): PlantillaPauta | null {
    const plantillas = this.obtenerTodasLasPlantillas();
    return plantillas.find(p => 
      p.paisFacturacion.toLowerCase() === paisFacturacion.toLowerCase() && 
      p.medio.toLowerCase() === medio.toLowerCase() &&
      p.activa
    ) || null;
  }

  // Obtener todas las plantillas desde localStorage
  obtenerTodasLasPlantillas(): PlantillaPauta[] {
    return JSON.parse(localStorage.getItem('plantillasPautas') || '[]');
  }

  // Guardar plantilla en localStorage
  guardarPlantilla(plantilla: PlantillaPauta): void {
    const plantillas = this.obtenerTodasLasPlantillas();
    const index = plantillas.findIndex(p => p.id === plantilla.id);
    
    if (index >= 0) {
      plantillas[index] = plantilla;
    } else {
      plantillas.push(plantilla);
    }
    
    localStorage.setItem('plantillasPautas', JSON.stringify(plantillas));
  }

  // Obtener datos de lookup
  obtenerDatosLookup(tabla: string, categoria?: string): any[] {
    const lookupData = this.obtenerTodosLosLookups();
    const tablaData = lookupData.find(l => 
      l.tabla === tabla && 
      (!categoria || l.categoria === categoria)
    );
    
    return tablaData ? tablaData.datos.filter(d => d.activo) : [];
  }

  // Obtener todos los lookups desde localStorage
  obtenerTodosLosLookups(): LookupData[] {
    return JSON.parse(localStorage.getItem('lookupData') || '[]');
  }

  // Inicializar datos de ejemplo (solo la primera vez)
  private inicializarDatosEjemplo(): void {
    // Verificar si ya existen datos
    if (localStorage.getItem('plantillasPautas') && localStorage.getItem('lookupData')) {
      return;
    }

    // Plantilla de ejemplo para TV NAL en Perú
    const plantillaTV: PlantillaPauta = {
      id: 'tv-nal-peru',
      paisFacturacion: 'Perú',
      medio: 'TV NAL',
      nombre: 'Televisión Nacional - Perú',
      descripcion: 'Plantilla para pautas de TV Nacional en Perú',
      fields: [
        { name: "IdTipoCompra", type: "integer", label: "Tipo de Compra", required: true, lookupTable: "TablaParametros", lookupCategory: "TIPOCOMPRA" },
        { name: "IdProveedor", type: "integer", label: "Proveedor", required: true, lookupTable: "Proveedores", lookupColumn: "CODIGO", displayColumn: "VENDOR" },
        { name: "IdVehiculo", type: "integer", label: "Vehículo", required: true, lookupTable: "TablaParametros", lookupCategory: "VEHICULO" },
        { name: "IdPrograma", type: "integer", label: "Programa", required: false, lookupTable: "TablaParametros", lookupCategory: "PROGRAMA" },
        { name: "emision", type: "string", label: "Emisión", required: false, maxLength: 50 },
        { name: "franja", type: "string", label: "Franja Horaria", required: false, maxLength: 50, options: ["Prime Time", "Day Time", "Late Night"] },
        { name: "hora", type: "time", label: "Hora", required: true },
        { name: "formato", type: "string", label: "Formato", required: false, maxLength: 50 },
        { name: "rat_canal", type: "decimal", label: "Rating Canal", required: false, precision: 5, scale: 2 },
        { name: "rat_up_per", type: "decimal", label: "Rating UP Personas", required: false, precision: 5, scale: 2 },
        { name: "rat_up_target", type: "decimal", label: "Rating UP Target", required: false, precision: 5, scale: 2 },
        { name: "crp_30", type: "money", label: "CRP 30s", required: false },
        { name: "tarifa_bruta_30", type: "money", label: "Tarifa Bruta (30s)", required: true },
        { name: "duracion_real", type: "integer", label: "Duración Real (segundos)", required: true, min: 5, max: 300 },
        { name: "dto_cliente", type: "decimal", label: "Dto Cliente (%)", required: false, precision: 5, scale: 2, min: 0, max: 100 },
        { name: "dto_agencia", type: "decimal", label: "Dto Agencia (%)", required: false, precision: 5, scale: 2, min: 0, max: 100 },
        { name: "valor_spot", type: "money", label: "Valor Spot", required: true },
        { name: "valor_neto", type: "money", label: "Valor Neto", required: true },
        { name: "%_iva", type: "decimal", label: "% IVA", required: false, precision: 5, scale: 2, min: 0, max: 100 },
        { name: "iva", type: "money", label: "Valor IVA", required: false },
        { name: "fee", type: "money", label: "Fee", required: false },
        { name: "total_spots", type: "integer", label: "Total Spots", required: true, min: 1 },
        { name: "valor_total", type: "money", label: "Valor Total", required: true },
        { name: "trps", type: "decimal", label: "TRPs", required: false, precision: 5, scale: 2 },
        { name: "grps", type: "decimal", label: "GRPs", required: false, precision: 5, scale: 2 }
      ],
      fechaCreacion: new Date().toISOString(),
      activa: true
    };

    // Plantilla para Radio en Perú (más simple)
    const plantillaRadio: PlantillaPauta = {
      id: 'radio-peru',
      paisFacturacion: 'Perú',
      medio: 'Radio',
      nombre: 'Radio - Perú',
      descripcion: 'Plantilla para pautas de Radio en Perú',
      fields: [
        { name: "IdProveedor", type: "integer", label: "Emisora", required: true, lookupTable: "Proveedores", lookupColumn: "CODIGO", displayColumn: "VENDOR" },
        { name: "programa", type: "string", label: "Programa", required: false, maxLength: 100 },
        { name: "franja", type: "string", label: "Franja Horaria", required: true, options: ["Mañana", "Tarde", "Noche", "Madrugada"] },
        { name: "hora", type: "time", label: "Hora", required: true },
        { name: "duracion_real", type: "integer", label: "Duración (segundos)", required: true, min: 10, max: 180 },
        { name: "tarifa_bruta", type: "money", label: "Tarifa Bruta", required: true },
        { name: "dto_cliente", type: "decimal", label: "Dto Cliente (%)", required: false, precision: 5, scale: 2, min: 0, max: 100 },
        { name: "valor_neto", type: "money", label: "Valor Neto", required: true },
        { name: "total_spots", type: "integer", label: "Total Spots", required: true, min: 1 },
        { name: "valor_total", type: "money", label: "Valor Total", required: true }
      ],
      fechaCreacion: new Date().toISOString(),
      activa: true
    };

    // Datos de lookup de ejemplo
    const lookupData: LookupData[] = [
      {
        tabla: "TablaParametros",
        categoria: "TIPOCOMPRA",
        datos: [
          { codigo: 1, valor: "Directo", activo: true },
          { codigo: 2, valor: "Programático", activo: true },
          { codigo: 3, valor: "RTB", activo: true }
        ]
      },
      {
        tabla: "TablaParametros",
        categoria: "VEHICULO",
        datos: [
          { codigo: 1, valor: "América TV", activo: true },
          { codigo: 2, valor: "Latina TV", activo: true },
          { codigo: 3, valor: "ATV", activo: true },
          { codigo: 4, valor: "Panamericana", activo: true }
        ]
      },
      {
        tabla: "TablaParametros",
        categoria: "PROGRAMA",
        datos: [
          { codigo: 1, valor: "Noticiero Central", activo: true },
          { codigo: 2, valor: "Esto es Guerra", activo: true },
          { codigo: 3, valor: "Al Fondo Hay Sitio", activo: true },
          { codigo: 4, valor: "América Noticias", activo: true }
        ]
      },
      {
        tabla: "Proveedores",
        datos: [
          { codigo: "PROV001", valor: "América Televisión", activo: true },
          { codigo: "PROV002", valor: "Latina Televisión", activo: true },
          { codigo: "PROV003", valor: "ATV", activo: true },
          { codigo: "PROV004", valor: "RPP Noticias", activo: true },
          { codigo: "PROV005", valor: "Radio Nacional", activo: true }
        ]
      }
    ];

    // Guardar datos iniciales
    localStorage.setItem('plantillasPautas', JSON.stringify([plantillaTV, plantillaRadio]));
    localStorage.setItem('lookupData', JSON.stringify(lookupData));
  }
} 