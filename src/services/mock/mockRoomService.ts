import { IRoomService } from '../types';
import { Room } from '../../types/room';
import { MOCK_ROOMS } from './mockData';

export class MockRoomService implements IRoomService {
  private rooms: Room[] = [...MOCK_ROOMS];

  async getRooms(): Promise<Room[]> {
    // Simulate slight network delay
    await new Promise((resolve) => setTimeout(resolve, 80));
    return [...this.rooms];
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const room = this.rooms.find((r) => r.id === roomId);
    return room ? { ...room } : null;
  }
}

export const mockRoomService = new MockRoomService();
