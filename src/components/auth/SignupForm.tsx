import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupValues } from '@/auth/schemas';
import { registerUser, passwordGrant } from '@/auth/keycloakClient';

interface SignupFormProps {
  onSuccess: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupValues) => {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.display_name);
      await passwordGrant(data.email, data.password);
      onSuccess();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      );
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-field">
        <label htmlFor="signup-name">Display name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          {...register('display_name')}
        />
        {errors.display_name && (
          <span className="auth-hint--weak">{errors.display_name.message}</span>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && <span className="auth-hint--weak">{errors.email.message}</span>}
      </div>

      <div className="auth-field">
        <label htmlFor="signup-password">Password</label>
        <div className="auth-password-wrapper">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
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
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
