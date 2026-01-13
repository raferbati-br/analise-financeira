import { API_BASE } from './config.js';

export function apiUrl(path) {
  return new URL(path, API_BASE).toString();
}
