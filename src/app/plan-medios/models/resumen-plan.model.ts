export interface ResumenPlan {
    id?: string; // AGREGAR ID A LA INTERFAZ
    numeroPlan: string;
    version: number;
    cliente: string;
    producto: string;
    campana: string;
    aprobado?: boolean;
    periodos: PeriodoPlan[];
    fechaInicio: string;
    fechaFin: string;
}

export interface PeriodoPlan {
    id: string;
    nombre: string;
    anio: number;
    fechaInicio: string;
    fechaFin: string;
    medios: MedioPlan[];
    totalInversionNeta: number;
    iva: number;
    totalInversion: number;
}

export interface MedioPlan {
    nombre: string;
    medioId?: number; // ID del medio desde el backend
    proveedor?: string;
    proveedorId?: string;
    canal?: string;
    canalId: number;
    canalNombre?: string;
    canalDescripcion?: string;
    salidas: number;
    valorNeto: number;
    soi: number;
    semanas: boolean[];
    spotsPorSemana?: number[]; // Nueva propiedad para almacenar spots por semana
    spotsPorFecha?: { [fecha: string]: number }; // Nueva propiedad para almacenar spots por fecha específica
    tarifa: number; // Propiedad para almacenar la tarifa por spot
    planMedioItemId: number; // Referencia al ID del backend para operaciones CRUD
    // Campos para flowchart
    pasoPorFlowchart?: boolean; // Flag para controlar si pasó por flowchart
    calendarioJson?: string; // JSON con spots por días desde flowchart
    // Nuevo campo para subgrupos de proveedores
    proveedores?: MedioPlanProveedor[];
}

// Nueva interfaz para los subgrupos de proveedores
export interface MedioPlanProveedor {
    nombre: string;
    proveedorId: string;
    canal: string;
    canalId: number;
    canalNombre?: string;
    canalDescripcion?: string;
    salidas: number;
    valorNeto: number;
    soi: number;
    semanas: boolean[];
    tarifa: number;
    spotsPorFecha?: { [fecha: string]: number };
    planMedioItemId: number;
    pasoPorFlowchart?: boolean;
    calendarioJson?: string;
}

// Interface para pasar datos desde la consulta al resumen
export interface PlanConsultaData {
    id?: string;
    numeroPlan: string;
    version: number;
    cliente: string;
    producto: string;
    campana: string;
    fechaInicio: string;
    fechaFin: string;
}

// Datos de ejemplo para diferentes períodos
export const PERIODOS_EJEMPLO: PeriodoPlan[] = [
    {
        id: '1',
        nombre: 'Julio-Agosto',
        anio: 2024,
        fechaInicio: '2024-07-01',
        fechaFin: '2024-08-31',
        medios: [
            {
                nombre: "TV NAL",
                salidas: 0,
                valorNeto: 48225824,
                soi: 68,
                semanas: [true, true, true, false, false],
                canalId: 1,
                tarifa: 1000,
                planMedioItemId: 1
            },
            {
                nombre: "Radio",
                salidas: 0,
                valorNeto: 16848666,
                soi: 25,
                semanas: [false, false, true, false, true],
                canalId: 2,
                tarifa: 500,
                planMedioItemId: 2
            },
            {
                nombre: "Digital",
                salidas: 0,
                valorNeto: 5000000,
                soi: 7,
                semanas: [true, true, true, true, true],
                canalId: 3,
                tarifa: 100,
                planMedioItemId: 3
            }
        ],
        totalInversionNeta: 68074490,
        iva: 12934153,
        totalInversion: 81008643
    }
]; 