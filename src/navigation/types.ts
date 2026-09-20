import { NavigatorScreenParams } from '@react-navigation/native';
import { SlotIndex } from '../types/slot';

export type MainTabParamList = {
  Rooms: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  RoomDetail: { roomId: string };
  ConfirmBooking: {
    roomId: string;
    bookingDate: string;
    slotIndex: SlotIndex;
  };
  BookingPass: { bookingId: string };
};
