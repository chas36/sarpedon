import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm Component', () => {
  it('should render login and password inputs', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('should call onSubmit with credentials when form is submitted', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/логин/i), 'student123');
    await user.type(screen.getByLabelText(/пароль/i), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          login: 'student123',
          password: 'password123'
        })
      );
    });
  });

  it('should show validation error for empty login', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText(/логин обязателен/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for empty password', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/логин/i), 'student123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText(/пароль обязателен/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should disable form during loading state', () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);

    const loginInput = screen.getByLabelText(/логин/i);
    const passwordInput = screen.getByLabelText(/пароль/i);
    const submitButton = screen.getByRole('button', { name: /вход/i });

    expect(loginInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('should show loading indicator when loading', () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);

    expect(screen.getByRole('button')).toHaveTextContent(/вход/i);
  });

  it('should display error message when error prop is provided', () => {
    render(<LoginForm onSubmit={vi.fn()} error="Неверный логин или пароль" />);

    expect(screen.getByText(/неверный логин или пароль/i)).toBeInTheDocument();
  });

  it('should clear validation errors when user starts typing', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    // Trigger validation error
    await user.click(screen.getByRole('button', { name: /войти/i }));
    expect(await screen.findByText(/логин обязателен/i)).toBeInTheDocument();

    // Start typing
    await user.type(screen.getByLabelText(/логин/i), 'student');

    // Error should be cleared
    expect(screen.queryByText(/логин обязателен/i)).not.toBeInTheDocument();
  });

  it('should have proper input types', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    const loginInput = screen.getByLabelText(/логин/i);
    const passwordInput = screen.getByLabelText(/пароль/i);

    expect(loginInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
