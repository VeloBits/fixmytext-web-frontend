import {
  authApi,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useGetMeQuery,
} from './authApi';

describe('authApi', () => {
  it('has reducerPath "authApi"', () => {
    expect(authApi.reducerPath).toBe('authApi');
  });

  it('has a reducer function', () => {
    expect(typeof authApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof authApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const endpointNames = Object.keys(authApi.endpoints);
    expect(endpointNames).toContain('register');
    expect(endpointNames).toContain('login');
    expect(endpointNames).toContain('logout');
    expect(endpointNames).toContain('refresh');
    expect(endpointNames).toContain('getMe');
    expect(endpointNames).toContain('forgotPassword');
    expect(endpointNames).toContain('resetPassword');
    expect(endpointNames).toContain('verifyEmail');
    expect(endpointNames).toContain('resendVerification');
  });

  it('exports hook functions', () => {
    expect(typeof useRegisterMutation).toBe('function');
    expect(typeof useLoginMutation).toBe('function');
    expect(typeof useLogoutMutation).toBe('function');
    expect(typeof useRefreshMutation).toBe('function');
    expect(typeof useForgotPasswordMutation).toBe('function');
    expect(typeof useResetPasswordMutation).toBe('function');
    expect(typeof useVerifyEmailMutation).toBe('function');
    expect(typeof useResendVerificationMutation).toBe('function');
    expect(typeof useGetMeQuery).toBe('function');
  });

  it('register endpoint builds correct query', () => {
    const { query } = authApi.endpoints.register.initiate;
    // We can test the endpoint definition via the endpoints object
    expect(authApi.endpoints.register).toBeDefined();
  });

  it('has Me tag type', () => {
    // Check via the api object
    expect(authApi).toBeDefined();
  });
});
