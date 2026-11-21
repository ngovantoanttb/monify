/**
 * Custom fetch client hỗ trợ:
 * - Tự động đính kèm credentials (cookies)
 * - Tự động thử làm mới token khi nhận 401 (chỉ 1 lần duy nhất để tránh vòng lặp)
 */

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function requestTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export interface ApiClientOptions extends RequestInit {
  retryOn401?: boolean
}

export async function apiClient<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
  const { retryOn401 = true, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers || {})
  if (!headers.has('Content-Type') && fetchOptions.method && fetchOptions.method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  })

  // Không thử refresh cho các endpoint xác thực để tránh lặp vô tận hoặc lỗi console không mong muốn
  const isAuthEndpoint =
    endpoint.includes('/api/auth/login') ||
    endpoint.includes('/api/auth/refresh') ||
    endpoint.includes('/api/auth/me') ||
    endpoint.includes('/api/auth/logout')

  // Nếu nhận mã 401 và được phép thử refresh 1 lần
  if (response.status === 401 && retryOn401 && !isAuthEndpoint) {
    const refreshSuccess = await requestTokenRefresh()
    if (refreshSuccess) {
      // Thực hiện lại request ban đầu (không retry lần thứ 2)
      return apiClient<T>(endpoint, {
        ...options,
        retryOn401: false,
      })
    }
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.message || 'Yêu cầu máy chủ thất bại')
    ;(error as any).status = response.status
    ;(error as any).code = data?.code
    ;(error as any).data = data
    throw error
  }

  return data?.data as T
}

apiClient.get = <T>(endpoint: string, options?: ApiClientOptions): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'GET' })

apiClient.post = <T>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

apiClient.patch = <T>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

apiClient.delete = <T>(endpoint: string, options?: ApiClientOptions): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' })
