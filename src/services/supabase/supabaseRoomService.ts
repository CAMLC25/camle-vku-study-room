import { IRoomService } from '../types';
import { Room } from '../../types/room';
import { supabase } from './client';

export class SupabaseRoomService implements IRoomService {
  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        photo_url,
        building,
        floor,
        capacity,
        is_active,
        room_equipment (
          equipment (
            name
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[SupabaseRoomService] getRooms error:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      photoUrl: row.photo_url,
      building: row.building,
      floor: row.floor,
      capacity: row.capacity,
      isActive: row.is_active,
      equipment: (row.room_equipment || []).map(
        (re: any) => re.equipment?.name
      ).filter(Boolean),
    }));
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        photo_url,
        building,
        floor,
        capacity,
        is_active,
        room_equipment (
          equipment (
            name
          )
        )
      `)
      .eq('id', roomId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      photoUrl: data.photo_url,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      isActive: data.is_active,
      equipment: (data.room_equipment || []).map(
        (re: any) => re.equipment?.name
      ).filter(Boolean),
    };
  }
}

export const supabaseRoomService = new SupabaseRoomService();
