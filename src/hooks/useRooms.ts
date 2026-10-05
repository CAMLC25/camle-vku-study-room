import { useQuery } from '@tanstack/react-query';
import { roomService } from '../services/roomService';
import { Room } from '../types/room';

/**
 * Custom hook useRooms powered by TanStack Query
 * Adheres strictly to VKU Cross-Platform Mobile App Development curriculum (Week 6, Slide 17).
 * Handles server state, background caching, and automatic refetching.
 */
export function useRooms(building?: string) {
  return useQuery<Room[]>({
    queryKey: ['rooms', { building: building ?? '' }],
    queryFn: async () => {
      const rooms = await roomService.getRooms();
      if (!building || building === 'ALL') {
        return rooms;
      }
      return rooms.filter((r) => r.building === building);
    },
  });
}
