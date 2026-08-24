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
    throw new Error(data.message || data.error || 'An error occurred during API request');
  }

  return data;
};

/**
 * Uploads a file via backend server proxy (saves to cloud storage or disk)
 */
export const uploadViaServer = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('poster', file);
  const token = getAuthToken();

  const result = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/organiser/upload/local`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new Error(json.error || 'Server upload failed'));
        }
      } catch {
        reject(new Error('Invalid response from upload server'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload.'));
    xhr.send(formData);
  });

  const backendOrigin = API_BASE_URL.replace(/\/api$/, '');
  return result.fileUrl.startsWith('http')
    ? result.fileUrl
    : `${backendOrigin}${result.fileUrl}`;
};

/**
 * Uploads a poster image directly to S3/Cloud Storage via Presigned URL
 * with automatic fallback to server upload if browser CORS or network issues occur.
 */
export const uploadPosterImage = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  try {
    // Step 1: Request Presigned URL from backend
    const presigned = await fetchAPI('/organiser/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'image/jpeg',
        fileSize: file.size,
      }),
    });

    // Step 2A: Direct-to-Cloud Upload (AWS S3 / Cloudflare R2)
    if (presigned.storageType === 'S3') {
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presigned.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

          if (onProgress) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct cloud upload failed (${xhr.status}: ${xhr.statusText})`));
            }
          };

          xhr.onerror = () => reject(new Error('Browser CORS or Network error on direct cloud upload.'));
          xhr.send(file);
        });

        return presigned.fileUrl;
      } catch (cloudErr) {
        console.warn('Direct cloud upload failed, falling back to server-side upload:', cloudErr);
        // Fallback to server upload so user experience is never broken
        return await uploadViaServer(file, onProgress);
      }
    }

    // Step 2B: Server Upload
    return await uploadViaServer(file, onProgress);
  } catch (err: any) {
    throw err;
  }
};

