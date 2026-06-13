import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render with children text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render primary variant with correct styles', () => {
    render(<Button variant="primary">Primary</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-learning-accent');
  });

  it('should render secondary variant with correct styles', () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-learning-surface');
  });

  it('should render ghost variant with correct styles', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('should render small size with correct styles', () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
  });

  it('should render medium size with correct styles', () => {
    render(<Button size="md">Medium</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('should render large size with correct styles', () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state with spinner', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-70');
  });

  it('should not call onClick when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button loading onClick={handleClick}>Loading</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className along with default styles', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('rounded-lg'); // Default class
  });

  it('should pass through HTML button attributes', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);

    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
