import axios from "axios";

const API = axios.create({
  baseURL: "http://YOUR_BACKEND_URL/api/prayer",
});

export type PrayerSession = {
  sessionId: string;
  prayerTypeId: number;
  scheduledTime: string;
  slot: string;
};

export const startPrayer = async (userId: string) => {
  const res = await API.post("/start", { userId });
  return res.data as PrayerSession;
};

export const completePrayer = async (userId: string, sessionId: string) => {
  await API.post("/complete", { userId, sessionId });
};

export const getHistory = async (userId: string) => {
  const res = await API.get(`/history/${userId}`);
  return res.data;
};

export const getGlobalCount = async (slot: string) => {
  const res = await API.get(`/global-count?slot=${slot}`);
  return res.data.count as number;
};

import { getToken } from "../store/auth";

// 🔥 attach token automatically
API.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;