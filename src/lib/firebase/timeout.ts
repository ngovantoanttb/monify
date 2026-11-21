/**
 * Chạy một Promise với thời gian chờ tối đa (timeoutMs).
 * Nếu vượt quá thời gian chờ (ví dụ mạng chậm hoặc chưa cấu hình Firebase RTDB),
 * hàm sẽ trả về giá trị fallback thay vì làm ứng dụng bị treo vô hạn.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number = 2500
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallback)
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    if (timer) clearTimeout(timer)
    return result
  } catch {
    if (timer) clearTimeout(timer)
    return fallback
  }
}

