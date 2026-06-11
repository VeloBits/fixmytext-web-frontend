import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginValues } from '@velobits/app-core/auth/schemas';
import { passwordGrant } from '@velobits/app-core/auth/keycloakClient';

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginValues) => {
    setServerError(null);
    try {
      await passwordGrant(data.email, data.password);
      onSuccess();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && <span className="auth-hint--weak">{errors.email.message}</span>}
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <div className="auth-password-wrapper">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
          />
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        {errors.password && <span className="auth-hint--weak">{errors.password.message}</span>}
      </div>

      {serverError && (
        <div className="auth-hint--weak" role="alert">
          {serverError}
        </div>
      )}

      <button type="submit" className="auth-btn--primary" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <a
        href="#"
        className="auth-forgot-link"
        onClick={(e) => {
          e.preventDefault();
          window.location.href = '/forgot-password';
        }}
      >
        Forgot password?
      </a>
    </form>
  );
}
