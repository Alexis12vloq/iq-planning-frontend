// Modelo tipado para localStorage de Pautas

export interface PautaLocal {
  id: string;
  planId: string; // ID del plan al que pertenece esta pauta
  medio: string;
  tipoMedio: string;
  salidas: number;
  valorNeto: number;
  soi: number;
  semanas: boolean[]; // Array de 5 elementos para L1, L7, L14, L21, L28
  fechaCreacion: string;
}

export interface PeriodoResumen {
  planId: string;
  periodo: string;
  totalInversionNeta: number;
  iva: number;
  totalInversion: number;
  pautas: PautaLocal[];
} 