export interface ResumenPlan {
    numeroPlan: string;
    version: number;
    cliente: string;
    producto: string;
    campana: string;
    aprobado?: boolean;
    medios: MedioPlan[];
    totalInversionNeta: number;
    iva: number;
    totalInversion: number;
}

export interface MedioPlan {
    nombre: string;
    salidas: number;
    valorNeto: number;
    soi: number;
    semanas: boolean[];
}

export interface Periodo {
    id: string;
    nombre: string;
    anio: number;
    resumenPlan: ResumenPlan;
}

// Datos de ejemplo para diferentes períodos
export const PERIODOS_EJEMPLO: Periodo[] = [
    {
        id: '1',
        nombre: 'Julio-Agosto',
        anio: 2024,
        resumenPlan: {
            numeroPlan: "0002",
            version: 2,
            cliente: "Unilever",
            producto: "MAGNUM CLASSIC",
            campana: "Campaña Invierno",
            aprobado: false,
            medios: [
                {
                    nombre: "TV NAL",
                    salidas: 0,
                    valorNeto: 48225824,
                    soi: 68,
                    semanas: [true, true, true, false, false]
                },
                {
                    nombre: "Radio",
                    salidas: 0,
                    valorNeto: 16848666,
                    soi: 25,
                    semanas: [false, false, true, false, true]
                },
                {
                    nombre: "Digital",
                    salidas: 0,
                    valorNeto: 5000000,
                    soi: 7,
                    semanas: [true, true, true, true, true]
                }
            ],
            totalInversionNeta: 68074490,
            iva: 12934153,
            totalInversion: 81008643
        }
    },
    {
        id: '2',
        nombre: 'Septiembre-Octubre',
        anio: 2024,
        resumenPlan: {
            numeroPlan: "0003",
            version: 1,
            cliente: "Unilever",
            producto: "MAGNUM CLASSIC",
            campana: "Campaña Primavera",
            aprobado: true,
            medios: [
                {
                    nombre: "TV NAL",
                    salidas: 0,
                    valorNeto: 55000000,
                    soi: 70,
                    semanas: [true, true, false, true, true]
                },
                {
                    nombre: "Radio",
                    salidas: 0,
                    valorNeto: 15000000,
                    soi: 20,
                    semanas: [true, false, true, true, false]
                },
                {
                    nombre: "Digital",
                    salidas: 0,
                    valorNeto: 8000000,
                    soi: 10,
                    semanas: [true, true, true, true, true]
                }
            ],
            totalInversionNeta: 78000000,
            iva: 14820000,
            totalInversion: 92820000
        }
    },
    {
        id: '3',
        nombre: 'Noviembre-Diciembre',
        anio: 2024,
        resumenPlan: {
            numeroPlan: "0004",
            version: 1,
            cliente: "Unilever",
            producto: "MAGNUM CLASSIC",
            campana: "Campaña Verano",
            aprobado: false,
            medios: [
                {
                    nombre: "TV NAL",
                    salidas: 0,
                    valorNeto: 65000000,
                    soi: 65,
                    semanas: [true, true, true, true, false]
                },
                {
                    nombre: "Radio",
                    salidas: 0,
                    valorNeto: 25000000,
                    soi: 25,
                    semanas: [false, true, true, true, true]
                },
                {
                    nombre: "Digital",
                    salidas: 0,
                    valorNeto: 10000000,
                    soi: 10,
                    semanas: [true, true, true, true, true]
                }
            ],
            totalInversionNeta: 100000000,
            iva: 19000000,
            totalInversion: 119000000
        }
    },
    {
        id: '4',
        nombre: 'Enero-Febrero',
        anio: 2025,
        resumenPlan: {
            numeroPlan: "0005",
            version: 1,
            cliente: "Unilever",
            producto: "MAGNUM CLASSIC",
            campana: "Campaña Back to School",
            aprobado: true,
            medios: [
                {
                    nombre: "TV NAL",
                    salidas: 0,
                    valorNeto: 45000000,
                    soi: 60,
                    semanas: [true, false, true, true, true]
                },
                {
                    nombre: "Radio",
                    salidas: 0,
                    valorNeto: 20000000,
                    soi: 27,
                    semanas: [true, true, false, true, false]
                },
                {
                    nombre: "Digital",
                    salidas: 0,
                    valorNeto: 10000000,
                    soi: 13,
                    semanas: [true, true, true, true, true]
                }
            ],
            totalInversionNeta: 75000000,
            iva: 14250000,
            totalInversion: 89250000
        }
    }
]; 