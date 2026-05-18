import * as SecureStore from "expo-secure-store";

export const saveAuth = async (token: string, userId: string) => {
  await SecureStore.setItemAsync("token", token);
  await SecureStore.setItemAsync("userId", userId);
};

export const getToken = () => SecureStore.getItemAsync("token");
export const getUserId = () => SecureStore.getItemAsync("userId");

export const logout = async () => {
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("userId");
};