// Modelo tipado para localStorage de Plan de Medios

export interface PlanMediosLocal {
  id: string;
  numeroPlan: string;
  version: string;
  paisFacturacion: string;
  paisesPauta: string[];
  clienteAnunciante: string;
  clienteFueActuacion: string;
  marca: string;
  producto: string;
  campana: string;
  fechaInicio: string;
  fechaFin: string;
  estado: boolean;
  tipoIngresoPlan: string; // Nuevo campo: 'Plan de Medios' o 'Flow Chart'
  fechaCreacion: string; // Nueva fecha de creación del plan
  // Puedes agregar más campos aquí en el futuro
}
