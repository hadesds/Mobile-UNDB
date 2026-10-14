// Base da API. Defina EXPO_PUBLIC_API_URL no arquivo .env do frontend.
//  - Emulador Android: http://10.0.2.2:8000
//  - Simulador iOS / Expo Web: http://localhost:8000
//  - Celular físico: http://<IP-da-sua-máquina>:8000
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export const API_BASE = `${API_URL}/api/v1`;