import { Injectable } from '@angular/core';
import { PlantillaPauta, LookupData, CampoPlantilla } from '../models/plantilla-pauta.model';

interface ProveedorKinesso {
  id?: string;
  VENDOR_MEDIUM: string;
  VENDOR_GROUP: string;
  MEDIUMS: string;
  VENDOR: string;
  TIPO_VENDOR: string;
  ORION_BENEFICIO_REAL_VENDOR: number;
  DIRECTO_TRADICIONAL_MVSS: number;
  KINESSO_POWER: number;
  KINESSO_GLASS: number;
  NOTAS_KSO: string | number;
  DUO_GLASS: number;
  DUO_POWER: number;
  ESTADO?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlantillaPautaService {

  constructor() {
    this.inicializarDatosEjemplo();
    this.verificarYCargarProveedores();
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

  // Métodos para proveedores
  obtenerProveedores(): ProveedorKinesso[] {
    const proveedoresData = localStorage.getItem('provedoresKinesso');
    if (proveedoresData) {
      return JSON.parse(proveedoresData);
    }
    return [];
  }

  obtenerProveedoresPorMedio(medio: string): ProveedorKinesso[] {
    const proveedores = this.obtenerProveedores();
    
    // Mapear medios del sistema a medios de proveedores
    const mapeoMedios: { [key: string]: string[] } = {
      'TV NAL': ['TELEVISION AIRE', 'TELEVISION CABLE'],
      'Radio': ['RADIO'],
      'Digital': ['INTERNET'],
      'Prensa': ['GRAFICA'],
      'OOH': ['VIA PUBLICA', 'PRODUCCIONES']
    };
    
    const mediosProveedor = mapeoMedios[medio] || [];
    
    return proveedores.filter(proveedor => {
      const estaActivo = proveedor.ESTADO === undefined || proveedor.ESTADO === 1;
      const tieneElMedio = mediosProveedor.some(medioProveedor => 
        proveedor.MEDIUMS.toLowerCase().includes(medioProveedor.toLowerCase())
      );
      return estaActivo && tieneElMedio;
    });
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

  private verificarYCargarProveedores(): void {
    const proveedoresExistentes = localStorage.getItem('provedoresKinesso');
    
    if (!proveedoresExistentes) {
      // Cargar datos de ejemplo si no existen
      this.cargarProveedoresEjemplo();
    }
  }

  private cargarProveedoresEjemplo(): void {
    const proveedoresEjemplo: ProveedorKinesso[] = [
      // TV - Television Aire
      {
        id: 'prov-1',
        VENDOR_MEDIUM: 'AMERICA TELEVISION S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'AMERICA TELEVISION',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'AMERICA TELEVISION S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.25,
        DIRECTO_TRADICIONAL_MVSS: 0.05,
        KINESSO_POWER: 0.2,
        KINESSO_GLASS: 0.15,
        NOTAS_KSO: '',
        DUO_GLASS: 0.1,
        DUO_POWER: 0.18,
        ESTADO: 1
      },
      {
        id: 'prov-2',
        VENDOR_MEDIUM: 'LATINA TELEVISION S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'LATINA TELEVISION',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'LATINA TELEVISION S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.22,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.18,
        KINESSO_GLASS: 0.12,
        NOTAS_KSO: '',
        DUO_GLASS: 0.08,
        DUO_POWER: 0.15,
        ESTADO: 1
      },
      {
        id: 'prov-3',
        VENDOR_MEDIUM: 'ATV PERU S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'ATV',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'ATV PERU S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.20,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.15,
        KINESSO_GLASS: 0.10,
        NOTAS_KSO: '',
        DUO_GLASS: 0.05,
        DUO_POWER: 0.12,
        ESTADO: 1
      },
      {
        id: 'prov-4',
        VENDOR_MEDIUM: 'PANAMERICANA TELEVISION S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'PANAMERICANA TV',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'PANAMERICANA TELEVISION S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.18,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.12,
        KINESSO_GLASS: 0.08,
        NOTAS_KSO: '',
        DUO_GLASS: 0.05,
        DUO_POWER: 0.10,
        ESTADO: 1
      },
      {
        id: 'prov-5',
        VENDOR_MEDIUM: 'TV PERU S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'TV PERU',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'TV PERU S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.15,
        DIRECTO_TRADICIONAL_MVSS: 0.02,
        KINESSO_POWER: 0.08,
        KINESSO_GLASS: 0.05,
        NOTAS_KSO: '',
        DUO_GLASS: 0.03,
        DUO_POWER: 0.06,
        ESTADO: 1
      },
      {
        id: 'prov-6',
        VENDOR_MEDIUM: 'GLOBAL TELEVISION S.A.TELEVISION AIRE',
        VENDOR_GROUP: 'GLOBAL TV',
        MEDIUMS: 'TELEVISION AIRE',
        VENDOR: 'GLOBAL TELEVISION S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.12,
        DIRECTO_TRADICIONAL_MVSS: 0.02,
        KINESSO_POWER: 0.06,
        KINESSO_GLASS: 0.04,
        NOTAS_KSO: '',
        DUO_GLASS: 0.02,
        DUO_POWER: 0.05,
        ESTADO: 1
      },

      // TV - Television Cable
      {
        id: 'prov-7',
        VENDOR_MEDIUM: 'DIRECTV PERU S.A.TELEVISION CABLE',
        VENDOR_GROUP: 'DIRECTV',
        MEDIUMS: 'TELEVISION CABLE',
        VENDOR: 'DIRECTV PERU S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.20,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.15,
        KINESSO_GLASS: 0.10,
        NOTAS_KSO: '',
        DUO_GLASS: 0.06,
        DUO_POWER: 0.12,
        ESTADO: 1
      },
      {
        id: 'prov-8',
        VENDOR_MEDIUM: 'MOVISTAR TV S.A.TELEVISION CABLE',
        VENDOR_GROUP: 'MOVISTAR TV',
        MEDIUMS: 'TELEVISION CABLE',
        VENDOR: 'MOVISTAR TV S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.18,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.12,
        KINESSO_GLASS: 0.08,
        NOTAS_KSO: '',
        DUO_GLASS: 0.05,
        DUO_POWER: 0.10,
        ESTADO: 1
      },
      {
        id: 'prov-9',
        VENDOR_MEDIUM: 'CLARO TV S.A.TELEVISION CABLE',
        VENDOR_GROUP: 'CLARO TV',
        MEDIUMS: 'TELEVISION CABLE',
        VENDOR: 'CLARO TV S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.16,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.10,
        KINESSO_GLASS: 0.06,
        NOTAS_KSO: '',
        DUO_GLASS: 0.04,
        DUO_POWER: 0.08,
        ESTADO: 1
      },
      {
        id: 'prov-10',
        VENDOR_MEDIUM: 'BEST CABLE S.A.TELEVISION CABLE',
        VENDOR_GROUP: 'BEST CABLE',
        MEDIUMS: 'TELEVISION CABLE',
        VENDOR: 'BEST CABLE S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.12,
        DIRECTO_TRADICIONAL_MVSS: 0.02,
        KINESSO_POWER: 0.06,
        KINESSO_GLASS: 0.04,
        NOTAS_KSO: '',
        DUO_GLASS: 0.02,
        DUO_POWER: 0.05,
        ESTADO: 1
      },

      // Radio
      {
        id: 'prov-11',
        VENDOR_MEDIUM: 'RPP NOTICIAS S.A.RADIO',
        VENDOR_GROUP: 'RPP NOTICIAS',
        MEDIUMS: 'RADIO',
        VENDOR: 'RPP NOTICIAS S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.30,
        DIRECTO_TRADICIONAL_MVSS: 0.05,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-12',
        VENDOR_MEDIUM: 'RADIO CAPITAL S.A.RADIO',
        VENDOR_GROUP: 'RADIO CAPITAL',
        MEDIUMS: 'RADIO',
        VENDOR: 'RADIO CAPITAL S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.25,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-13',
        VENDOR_MEDIUM: 'RADIO NACIONAL S.A.RADIO',
        VENDOR_GROUP: 'RADIO NACIONAL',
        MEDIUMS: 'RADIO',
        VENDOR: 'RADIO NACIONAL S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.20,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-14',
        VENDOR_MEDIUM: 'OXIGENO S.A.RADIO',
        VENDOR_GROUP: 'OXIGENO',
        MEDIUMS: 'RADIO',
        VENDOR: 'OXIGENO S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.22,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-15',
        VENDOR_MEDIUM: 'STUDIO 92 S.A.RADIO',
        VENDOR_GROUP: 'STUDIO 92',
        MEDIUMS: 'RADIO',
        VENDOR: 'STUDIO 92 S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.18,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-16',
        VENDOR_MEDIUM: 'RADIO MODA S.A.RADIO',
        VENDOR_GROUP: 'RADIO MODA',
        MEDIUMS: 'RADIO',
        VENDOR: 'RADIO MODA S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.15,
        DIRECTO_TRADICIONAL_MVSS: 0.02,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },

      // Digital - Internet
      {
        id: 'prov-17',
        VENDOR_MEDIUM: 'GOOGLE PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'GOOGLE',
        MEDIUMS: 'INTERNET',
        VENDOR: 'GOOGLE PERU S.R.L.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.15,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-18',
        VENDOR_MEDIUM: 'FACEBOOK PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'META',
        MEDIUMS: 'INTERNET',
        VENDOR: 'FACEBOOK PERU S.R.L.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.12,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-19',
        VENDOR_MEDIUM: 'YOUTUBE PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'YOUTUBE',
        MEDIUMS: 'INTERNET',
        VENDOR: 'YOUTUBE PERU S.R.L.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.14,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-20',
        VENDOR_MEDIUM: 'TIKTOK PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'TIKTOK',
        MEDIUMS: 'INTERNET',
        VENDOR: 'TIKTOK PERU S.R.L.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.10,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-21',
        VENDOR_MEDIUM: 'LINKEDIN PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'LINKEDIN',
        MEDIUMS: 'INTERNET',
        VENDOR: 'LINKEDIN PERU S.R.L.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.08,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-22',
        VENDOR_MEDIUM: 'SPOTIFY PERU S.R.L.INTERNET',
        VENDOR_GROUP: 'SPOTIFY',
        MEDIUMS: 'INTERNET',
        VENDOR: 'SPOTIFY PERU S.R.L.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.06,
        DIRECTO_TRADICIONAL_MVSS: 0.0,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },

      // Prensa - Grafica
      {
        id: 'prov-23',
        VENDOR_MEDIUM: 'EL COMERCIO S.A.GRAFICA',
        VENDOR_GROUP: 'EL COMERCIO',
        MEDIUMS: 'GRAFICA',
        VENDOR: 'EL COMERCIO S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.25,
        DIRECTO_TRADICIONAL_MVSS: 0.08,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-24',
        VENDOR_MEDIUM: 'LA REPUBLICA S.A.GRAFICA',
        VENDOR_GROUP: 'LA REPUBLICA',
        MEDIUMS: 'GRAFICA',
        VENDOR: 'LA REPUBLICA S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.22,
        DIRECTO_TRADICIONAL_MVSS: 0.06,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-25',
        VENDOR_MEDIUM: 'PERU21 S.A.GRAFICA',
        VENDOR_GROUP: 'PERU21',
        MEDIUMS: 'GRAFICA',
        VENDOR: 'PERU21 S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.20,
        DIRECTO_TRADICIONAL_MVSS: 0.05,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-26',
        VENDOR_MEDIUM: 'GESTION S.A.GRAFICA',
        VENDOR_GROUP: 'GESTION',
        MEDIUMS: 'GRAFICA',
        VENDOR: 'GESTION S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.18,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-27',
        VENDOR_MEDIUM: 'TROME S.A.GRAFICA',
        VENDOR_GROUP: 'TROME',
        MEDIUMS: 'GRAFICA',
        VENDOR: 'TROME S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.15,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },

      // OOH - Via Publica
      {
        id: 'prov-28',
        VENDOR_MEDIUM: 'CLEAR CHANNEL PERU S.A.VIA PUBLICA',
        VENDOR_GROUP: 'CLEAR CHANNEL',
        MEDIUMS: 'VIA PUBLICA',
        VENDOR: 'CLEAR CHANNEL PERU S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.28,
        DIRECTO_TRADICIONAL_MVSS: 0.06,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-29',
        VENDOR_MEDIUM: 'JCDECAUX PERU S.A.VIA PUBLICA',
        VENDOR_GROUP: 'JCDECAUX',
        MEDIUMS: 'VIA PUBLICA',
        VENDOR: 'JCDECAUX PERU S.A.',
        TIPO_VENDOR: 'PREMIUM',
        ORION_BENEFICIO_REAL_VENDOR: 0.26,
        DIRECTO_TRADICIONAL_MVSS: 0.05,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-30',
        VENDOR_MEDIUM: 'VIA DIGITAL S.A.VIA PUBLICA',
        VENDOR_GROUP: 'VIA DIGITAL',
        MEDIUMS: 'VIA PUBLICA',
        VENDOR: 'VIA DIGITAL S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.22,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-31',
        VENDOR_MEDIUM: 'NEO PUBLICIDAD S.A.VIA PUBLICA',
        VENDOR_GROUP: 'NEO PUBLICIDAD',
        MEDIUMS: 'VIA PUBLICA',
        VENDOR: 'NEO PUBLICIDAD S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.18,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },

      // OOH - Producciones
      {
        id: 'prov-32',
        VENDOR_MEDIUM: 'LARA PRODUCCIONES S.A.PRODUCCIONES',
        VENDOR_GROUP: 'LARA PRODUCCIONES',
        MEDIUMS: 'PRODUCCIONES',
        VENDOR: 'LARA PRODUCCIONES S.A.',
        TIPO_VENDOR: 'IMPORTANTE',
        ORION_BENEFICIO_REAL_VENDOR: 0.20,
        DIRECTO_TRADICIONAL_MVSS: 0.04,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-33',
        VENDOR_MEDIUM: 'BTL SOLUTIONS S.A.PRODUCCIONES',
        VENDOR_GROUP: 'BTL SOLUTIONS',
        MEDIUMS: 'PRODUCCIONES',
        VENDOR: 'BTL SOLUTIONS S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.15,
        DIRECTO_TRADICIONAL_MVSS: 0.03,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      },
      {
        id: 'prov-34',
        VENDOR_MEDIUM: 'ACTIVACIONES PERU S.A.PRODUCCIONES',
        VENDOR_GROUP: 'ACTIVACIONES PERU',
        MEDIUMS: 'PRODUCCIONES',
        VENDOR: 'ACTIVACIONES PERU S.A.',
        TIPO_VENDOR: 'STANDARD',
        ORION_BENEFICIO_REAL_VENDOR: 0.12,
        DIRECTO_TRADICIONAL_MVSS: 0.02,
        KINESSO_POWER: 0.0,
        KINESSO_GLASS: 0.0,
        NOTAS_KSO: '',
        DUO_GLASS: 0.0,
        DUO_POWER: 0.0,
        ESTADO: 1
      }
    ];
    
    localStorage.setItem('provedoresKinesso', JSON.stringify(proveedoresEjemplo));
    console.log('📦 Proveedores ampliados cargados:', proveedoresEjemplo.length, 'proveedores en total');
  }
} 