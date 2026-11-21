import type { IncomingMessage, ServerResponse } from 'http'

// Health check endpoint for Vercel Serverless Functions
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }))
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'monify-api',
      timestamp: Date.now(),
      version: '0.1.0',
    })
  )
}
