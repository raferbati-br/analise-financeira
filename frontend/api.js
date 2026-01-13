import { API_BASE } from './config/index.js';

export function apiUrl(path) {
  return new URL(path, API_BASE).toString();
}
