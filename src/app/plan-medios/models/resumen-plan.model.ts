export interface ResumenPlan {
    numeroPlan: string;
    version: number;
    cliente: string;
    producto: string;
    fecha: string;
    campana: string;
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

// Datos de ejemplo
export const RESUMEN_PLAN_EJEMPLO: ResumenPlan = {
    numeroPlan: "0002",
    version: 2,
    cliente: "Unilever",
    producto: "MAGNUM CLASSIC",
    fecha: "JULIO",
    campana: "Campaña Invierno",
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
}; 