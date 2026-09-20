export type Building = 'A' | 'B' | 'C' | 'V';

export type Equipment = 'Projector' | 'Whiteboard' | 'High-spec PC' | 'AC';

export interface Room {
  id: string;
  name: string;
  photoUrl: string;
  building: Building;
  floor: number;
  capacity: number;
  equipment: Equipment[];
  isActive: boolean;
}

export interface RoomFilterState {
  searchQuery: string;
  building: Building | 'ALL';
  capacityMin: number;
  capacityMax: number;
  selectedEquipment: Equipment[];
}
