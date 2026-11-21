import { describe, it, expect } from 'vitest'
import handler from '../../api/health'
import type { IncomingMessage, ServerResponse } from 'http'

describe('API Health Check Endpoint Test', () => {
  it('trả về 200 OK và thông tin service khi gọi GET', async () => {
    const req = {
      method: 'GET',
    } as unknown as IncomingMessage

    let statusCode = 0
    let responseData = ''
    const headers: Record<string, string> = {}

    const res = {
      set statusCode(code: number) {
        statusCode = code
      },
      setHeader(name: string, value: string) {
        headers[name] = value
      },
      end(chunk: string) {
        responseData = chunk
      },
    } as unknown as ServerResponse

    await handler(req, res)

    expect(statusCode).toBe(200)
    expect(headers['Content-Type']).toBe('application/json')
    const json = JSON.parse(responseData)
    expect(json.status).toBe('ok')
    expect(json.service).toBe('monify-api')
  })

  it('từ chối các phương thức khác GET với 405 Method Not Allowed', async () => {
    const req = {
      method: 'POST',
    } as unknown as IncomingMessage

    let statusCode = 0
    let responseData = ''

    const res = {
      set statusCode(code: number) {
        statusCode = code
      },
      setHeader() {},
      end(chunk: string) {
        responseData = chunk
      },
    } as unknown as ServerResponse

    await handler(req, res)

    expect(statusCode).toBe(405)
    const json = JSON.parse(responseData)
    expect(json.status).toBe('error')
  })
})

