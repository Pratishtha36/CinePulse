const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';


export const getAuthToken = (): string | null => {
  return localStorage.getItem('jwt_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('jwt_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
};

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred during API request');
  }

  return data;
};
