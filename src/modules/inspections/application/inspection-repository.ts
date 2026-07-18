import type { Inspection } from "../domain/inspection";

export interface InspectionRepository {
  findById(id: string): Promise<Inspection | null>;
  save(inspection: Inspection): Promise<void>;
}
