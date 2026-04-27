// /src/utils/user.ts
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

export async function getUserId(): Promise<string> {
  let id = await SecureStore.getItemAsync("userId");

  if (!id) {
    id = uuidv4();
    await SecureStore.setItemAsync("userId", id);
  }

  return id;
}