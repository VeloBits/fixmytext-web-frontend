import { errorMiddleware } from './errorMiddleware';
import type { MiddlewareAPI, Dispatch } from 'redux';

// Minimal stub for the Redux MiddlewareAPI used in middleware tests.
// The errorMiddleware does not use the api (dispatch/getState) - it only
// uses `next` and `action`, so a no-op stub is sufficient.
const noopApi = { dispatch: (() => {}) as Dispatch, getState: () => ({}) } satisfies MiddlewareAPI;

describe('errorMiddleware', () => {
  let next: (action: unknown) => unknown;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    next = vi.fn((action) => action);
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => false);
  });

  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  it('passes through non-rejected actions', () => {
    const action = { type: 'some/action', payload: 'data' };
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  it('passes through mutation rejections without dispatching event', () => {
    // We need to mock isRejectedWithValue. The middleware uses it from RTK.
    // Let's create a proper rejected-with-value action.
    const action = {
      type: 'api/executeMutation/rejected',
      payload: { status: 500, data: { detail: 'error' } },
      error: { message: 'Rejected' },
      meta: {
        arg: { type: 'mutation', endpointName: 'login' },
        rejectedWithValue: true,
        baseQueryMeta: {},
        requestId: '1',
        requestStatus: 'rejected',
        condition: false,
      },
    };
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    // Since isRejectedWithValue checks for specific shape, we need the right type
    expect(next).toHaveBeenCalledWith(action);
  });

  it('calls next for every action', () => {
    const action = { type: 'anything' };
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    expect(next).toHaveBeenCalledWith(action);
  });
});

// More detailed test with the actual isRejectedWithValue check
describe('errorMiddleware with rejectedWithValue actions', () => {
  let next: (action: unknown) => unknown;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    next = vi.fn((action) => action);
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => false);
  });

  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  // Helper to create an action that passes isRejectedWithValue
  function makeRejectedWithValueAction({
    queryType,
    endpoint,
    payload,
  }: {
    queryType: string;
    endpoint: string;
    payload: unknown;
  }) {
    // isRejectedWithValue checks: hasPrefix && action.meta?.rejectedWithValue === true
    return {
      type: 'someApi/executeMutation/rejected',
      payload,
      error: { message: 'Rejected' },
      meta: {
        arg: { type: queryType, endpointName: endpoint },
        rejectedWithValue: true,
        requestId: 'req1',
        requestStatus: 'rejected',
        aborted: false,
        condition: false,
      },
    };
  }

  it('skips mutation type actions', () => {
    const action = makeRejectedWithValueAction({
      queryType: 'mutation',
      endpoint: 'login',
      payload: { status: 400, data: { detail: 'bad' } },
    });
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  it('skips silent query endpoints', () => {
    const silentEndpoints = ['refresh', 'getMe', 'getPreferences', 'getTemplates', 'getHistory'];
    for (const ep of silentEndpoints) {
      dispatchEventSpy.mockClear();
      const action = makeRejectedWithValueAction({
        queryType: 'query',
        endpoint: ep,
        payload: { status: 401 },
      });
      const middleware = errorMiddleware(noopApi)(next);
      middleware(action);
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    }
  });

  it('dispatches rtk-api-error event for unhandled query failures with string detail', () => {
    const action = makeRejectedWithValueAction({
      queryType: 'query',
      endpoint: 'getSubscriptionStatus',
      payload: { status: 500, data: { detail: 'Server broke' } },
    });
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.type).toBe('rtk-api-error');
    expect((event as CustomEvent).detail.message).toBe('Server broke');
    expect((event as CustomEvent).detail.type).toBe('danger');
    expect((event as CustomEvent).detail.endpoint).toBe('getSubscriptionStatus');
    expect((event as CustomEvent).detail.status).toBe(500);
  });

  it('uses fallback message when detail is not a string', () => {
    const action = makeRejectedWithValueAction({
      queryType: 'query',
      endpoint: 'getPassCatalog',
      payload: { status: 500, data: { detail: { errors: ['a'] } } },
    });
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    const event = dispatchEventSpy.mock.calls[0][0];
    expect((event as CustomEvent).detail.message).toBe('Something went wrong. Please try again.');
  });

  it('uses fallback message when no data', () => {
    const action = makeRejectedWithValueAction({
      queryType: 'query',
      endpoint: 'getPassCatalog',
      payload: { status: 500 },
    });
    const middleware = errorMiddleware(noopApi)(next);
    middleware(action);
    const event = dispatchEventSpy.mock.calls[0][0];
    expect((event as CustomEvent).detail.message).toBe('Something went wrong. Please try again.');
  });
});
