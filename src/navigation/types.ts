import { NavigatorScreenParams } from '@react-navigation/native';
import { SlotIndex } from '../types/slot';

export type MainTabParamList = {
  Rooms: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  RoomDetail: { roomId: string };
  ConfirmBooking: {
    roomId: string;
    bookingDate: string;
    slotIndex: SlotIndex;
  };
  BookingPass: { bookingId: string };
};
