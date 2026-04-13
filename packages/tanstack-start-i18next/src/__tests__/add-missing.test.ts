import { describe, it, expect, vi } from 'vitest'
import { createAddMissingHandler } from '../add-missing'

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/api/i18n/add/en/common', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('createAddMissingHandler', () => {
  describe('successful requests', () => {
    it('calls onMissingKey for each key in the body', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      await handler(makeRequest({ greeting: '', farewell: '' }), { lng: 'en', ns: 'common' })

      expect(onMissingKey).toHaveBeenCalledTimes(2)
      expect(onMissingKey).toHaveBeenCalledWith('en', 'common', 'greeting', '')
      expect(onMissingKey).toHaveBeenCalledWith('en', 'common', 'farewell', '')
    })

    it('passes the fallback value from the body to onMissingKey', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      await handler(makeRequest({ title: 'My App' }), { lng: 'fr', ns: 'home' })

      expect(onMissingKey).toHaveBeenCalledWith('fr', 'home', 'title', 'My App')
    })

    it('uses lng and ns from params, not from the request URL', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      await handler(makeRequest({ key: '' }), { lng: 'de', ns: 'settings' })

      expect(onMissingKey).toHaveBeenCalledWith('de', 'settings', 'key', '')
    })

    it('returns 204 No Content on success', async () => {
      const handler = createAddMissingHandler({ onMissingKey: vi.fn().mockResolvedValue(undefined) })
      const response = await handler(makeRequest({ key: '' }), { lng: 'en', ns: 'common' })

      expect(response.status).toBe(204)
    })

    it('handles a single missing key', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      await handler(makeRequest({ onlyKey: '' }), { lng: 'en', ns: 'common' })

      expect(onMissingKey).toHaveBeenCalledTimes(1)
    })

    it('handles an empty body object without calling onMissingKey', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      const response = await handler(makeRequest({}), { lng: 'en', ns: 'common' })

      expect(onMissingKey).not.toHaveBeenCalled()
      expect(response.status).toBe(204)
    })

    it('coerces a non-string fallback value to string', async () => {
      const onMissingKey = vi.fn().mockResolvedValue(undefined)
      const handler = createAddMissingHandler({ onMissingKey })

      // i18next-http-backend sends the body as JSON; occasionally the value may be null
      await handler(makeRequest({ key: null }), { lng: 'en', ns: 'common' })

      expect(onMissingKey).toHaveBeenCalledWith('en', 'common', 'key', '')
    })
  })

  describe('error handling', () => {
    it('returns 400 when the body is not valid JSON', async () => {
      const handler = createAddMissingHandler({ onMissingKey: vi.fn() })
      const request = new Request('http://localhost/api/i18n/add/en/common', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json {{',
      })

      const response = await handler(request, { lng: 'en', ns: 'common' })

      expect(response.status).toBe(400)
    })

    it('returns 400 when the body is a JSON array instead of an object', async () => {
      const handler = createAddMissingHandler({ onMissingKey: vi.fn() })
      const response = await handler(makeRequest(['key1', 'key2']), { lng: 'en', ns: 'common' })

      expect(response.status).toBe(400)
    })

    it('returns 400 when the body is a JSON primitive', async () => {
      const handler = createAddMissingHandler({ onMissingKey: vi.fn() })
      const response = await handler(makeRequest('just a string'), { lng: 'en', ns: 'common' })

      expect(response.status).toBe(400)
    })

    it('does not call onMissingKey when the body is invalid', async () => {
      const onMissingKey = vi.fn()
      const handler = createAddMissingHandler({ onMissingKey })
      const request = new Request('http://localhost/', {
        method: 'POST',
        body: 'bad',
      })

      await handler(request, { lng: 'en', ns: 'common' })

      expect(onMissingKey).not.toHaveBeenCalled()
    })
  })
})
