// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, cleanup, act } from '@testing-library/react'
import { api } from '@/lib/api'
import { useConfigStore } from '@/store/configStore'
import { usePublishStore } from '@/store/publishStore'
import { useAutoSave } from './useAutoSave'

/**
 * Leaving the page inside the save delay must not throw the last edit away: the
 * editor reloads the saved copy from the server on the way back in, so an edit
 * that never reached the server is simply gone.
 */
describe('autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    usePublishStore.setState({ siteId: 'site-1' })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('saves after the delay', async () => {
    const save = vi.spyOn(api, 'saveSite').mockResolvedValue({} as never)
    renderHook(() => useAutoSave(1500))
    act(() => { useConfigStore.getState().setTheme({ accent: '#123456' }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2]).toBeUndefined()
  })

  it('sends the waiting edit with keepalive when the page is being left', async () => {
    const save = vi.spyOn(api, 'saveSite').mockResolvedValue({} as never)
    renderHook(() => useAutoSave(1500))
    act(() => { useConfigStore.getState().setTheme({ accent: '#abcdef' }) })
    expect(save).not.toHaveBeenCalled()
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2]).toEqual({ keepalive: true })
    expect(JSON.stringify(save.mock.calls[0][1])).toContain('#abcdef')
    // The delayed save has nothing left to send twice.
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(save.mock.calls.filter((call) => !call[2])).toHaveLength(1)
  })

  it('sends nothing on leaving when everything is already saved', async () => {
    const save = vi.spyOn(api, 'saveSite').mockResolvedValue({} as never)
    renderHook(() => useAutoSave(1500))
    act(() => { useConfigStore.getState().setTheme({ accent: '#0a0b0c' }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    save.mockClear()
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(save).not.toHaveBeenCalled()
  })
})
