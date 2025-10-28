import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner Component', () => {
  it('should render with default size', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('should have accessible label', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('should render small size with correct dimensions', () => {
    render(<Spinner size="sm" />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('should render medium size with correct dimensions', () => {
    render(<Spinner size="md" />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('should render large size with correct dimensions', () => {
    render(<Spinner size="lg" />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('should apply custom className', () => {
    render(<Spinner className="custom-spinner" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('should render centered variant', () => {
    render(<Spinner centered />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('should have spinning animation', () => {
    render(<Spinner />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('should support custom aria-label', () => {
    render(<Spinner aria-label="Processing data" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Processing data');
  });
});
