import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddStudentModal } from '../AddStudentModal';
import * as studentsApi from '../../api/studentsApi';
import * as classesApi from '../../api/classesApi';
import * as loginGenerator from '../../utils/loginGenerator';

vi.mock('../../api/studentsApi');
vi.mock('../../api/classesApi');
vi.mock('../../utils/loginGenerator');

describe('AddStudentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([
      { id: '1', name: '10А', created_at: '', updated_at: '' },
      { id: '2', name: '10Б', created_at: '', updated_at: '' },
    ]);
  });

  it('should render form with all fields', async () => {
    render(<AddStudentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^имя \*$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^фамилия \*$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^класс \*$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^логин \*$/i)).toBeInTheDocument();
    });
  });

  it('should generate login on button click', async () => {
    const mockLogin = 'ОКРУГ460';
    vi.mocked(loginGenerator.generateUniqueLogin).mockResolvedValue(mockLogin);

    const user = userEvent.setup();
    render(<AddStudentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const generateButton = await screen.findByRole('button', { name: /сгенерировать/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(loginGenerator.generateUniqueLogin).toHaveBeenCalled();
    });
  });

  it('should create student and show credentials', async () => {
    const mockStudent = {
      id: 'user-123',
      first_name: 'Иван',
      last_name: 'Иванов',
      class: '10А',
      role: 'student' as const,
      generated_login: 'ОКРУГ460',
      generated_password: 'ОКРУГ460',
      created_at: '',
      updated_at: '',
    };

    vi.mocked(studentsApi.createStudent).mockResolvedValue(mockStudent);

    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<AddStudentModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    // Fill form
    await user.type(await screen.findByLabelText(/^имя \*$/i), 'Иван');
    await user.type(screen.getByLabelText(/^фамилия \*$/i), 'Иванов');

    const classSelect = screen.getByLabelText(/^класс \*$/i);
    await user.selectOptions(classSelect, '10А');

    await user.type(screen.getByLabelText(/^логин \*$/i), 'ОКРУГ460');

    const submitButton = screen.getByRole('button', { name: /создать ученика/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(studentsApi.createStudent).toHaveBeenCalledWith({
        firstName: 'Иван',
        lastName: 'Иванов',
        className: '10А',
        login: 'ОКРУГ460',
        password: 'ОКРУГ460',
      });
    });

    // Check credentials screen
    await waitFor(() => {
      expect(screen.getByText(/ученик создан/i)).toBeInTheDocument();
      expect(screen.getAllByDisplayValue('ОКРУГ460')).toHaveLength(2); // login and password
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    const { container } = render(<AddStudentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const submitButton = await screen.findByRole('button', { name: /создать ученика/i });

    // Remove HTML5 validation to test our custom validation
    const form = container.querySelector('form');
    if (form) {
      form.noValidate = true;
    }

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/имя и фамилия обязательны/i)).toBeInTheDocument();
    });
  });
});
