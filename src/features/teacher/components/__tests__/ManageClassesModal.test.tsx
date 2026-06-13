import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageClassesModal } from '../ManageClassesModal';
import * as classesApi from '../../api/classesApi';

vi.mock('../../api/classesApi');

describe('ManageClassesModal', () => {
  it('should render classes list', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([
      { id: '1', name: '10А', created_at: '', updated_at: '' },
      { id: '2', name: '10Б', created_at: '', updated_at: '' },
    ]);

    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('10А')).toBeInTheDocument();
      expect(screen.getByText('10Б')).toBeInTheDocument();
    });
  });

  it('should create new class', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([]);
    vi.mocked(classesApi.createClass).mockResolvedValue({
      id: '3',
      name: '11А',
      created_at: '',
      updated_at: '',
    });

    const user = userEvent.setup();
    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    // Wait for loading to complete and input to appear
    const input = await screen.findByPlaceholderText(/название класса/i);
    await user.type(input, '11А');

    const addButton = screen.getByRole('button', { name: /добавить/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(classesApi.createClass).toHaveBeenCalledWith('11А');
    });
  });

  it('should delete class with confirmation', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([
      { id: '1', name: '10А', created_at: '', updated_at: '' },
    ]);
    vi.mocked(classesApi.getClassStudentCount).mockResolvedValue(5);
    vi.mocked(classesApi.deleteClass).mockResolvedValue();

    window.confirm = vi.fn(() => true);

    const user = userEvent.setup();
    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('10А')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /удалить/i })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(classesApi.deleteClass).toHaveBeenCalledWith('1');
    });
  });
});
