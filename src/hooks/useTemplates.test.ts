import { renderHook, act } from '@testing-library/react';

const mockApiCreate = vi.fn();
const mockApiUpdate = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetTemplatesQuery: vi.fn(() => ({ data: undefined })),
  useCreateTemplateMutation: () => [mockApiCreate],
  useUpdateTemplateMutation: () => [mockApiUpdate],
  useDeleteTemplateMutation: () => [mockApiDelete],
}));

import { useSelector } from 'react-redux';
import { useGetTemplatesQuery } from '../store/api/userDataApi';
import useTemplates from './useTemplates';

describe('useTemplates', () => {
  let setText, showAlert, getActiveToolId, openToolById, renameActiveTab;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setText = vi.fn();
    showAlert = vi.fn();
    getActiveToolId = vi.fn(() => 'uppercase');
    openToolById = vi.fn();
    renameActiveTab = vi.fn();
    useSelector.mockReturnValue(null); // not authenticated
    mockApiCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockApiUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockApiDelete.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  const renderTpl = (text = 'hello') =>
    renderHook(() =>
      useTemplates(text, setText, showAlert, { getActiveToolId, openToolById, renameActiveTab })
    );

  it('returns empty templates initially', () => {
    const { result } = renderTpl();
    expect(result.current.templates).toEqual([]);
    expect(result.current.templateName).toBe('');
  });

  it('loads templates from localStorage', () => {
    localStorage.setItem('tu-templates', JSON.stringify([{ name: 'Test', text: 'content' }]));
    const { result } = renderTpl();
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].name).toBe('Test');
  });

  it('saves template locally when not authenticated', async () => {
    const { result } = renderTpl('my text');
    act(() => {
      result.current.setTemplateName('My Template');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(showAlert).toHaveBeenCalledWith('Template "My Template" saved', 'success');
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templateName).toBe('');
    expect(renameActiveTab).toHaveBeenCalledWith('My Template');
  });

  it('updates existing local template', async () => {
    const { result } = renderTpl('text1');
    act(() => {
      result.current.setTemplateName('Tpl');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    // Now update it
    act(() => {
      result.current.setTemplateName('Tpl');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(showAlert).toHaveBeenCalledWith('Template "Tpl" updated', 'success');
    expect(result.current.templates).toHaveLength(1);
  });

  it('shows error when name is empty', async () => {
    const { result } = renderTpl();
    act(() => {
      result.current.setTemplateName('');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(showAlert).toHaveBeenCalledWith('Enter a template name', 'danger');
  });

  it('shows error when text is empty', async () => {
    const { result } = renderHook(() =>
      useTemplates('', setText, showAlert, { getActiveToolId, openToolById, renameActiveTab })
    );
    act(() => {
      result.current.setTemplateName('Name');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(showAlert).toHaveBeenCalledWith('Nothing to save', 'danger');
  });

  it('handleLoadTemplate loads text and shows alert', async () => {
    const { result } = renderTpl('text');
    act(() => {
      result.current.setTemplateName('Tpl');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    act(() => {
      result.current.handleLoadTemplate(0);
    });
    expect(openToolById).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Template "Tpl" loaded', 'success');
  });

  it('handleLoadTemplate does nothing for invalid index', () => {
    const { result } = renderTpl();
    act(() => {
      result.current.handleLoadTemplate(99);
    });
    expect(showAlert).not.toHaveBeenCalledWith(expect.stringContaining('loaded'), 'success');
  });

  it('handleLoadTemplate uses setText when no openToolById', async () => {
    const { result } = renderHook(() =>
      useTemplates('text', setText, showAlert, { getActiveToolId })
    );
    act(() => {
      result.current.setTemplateName('Tpl');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    act(() => {
      result.current.handleLoadTemplate(0);
    });
    expect(setText).toHaveBeenCalledWith('text');
  });

  it('handleDeleteTemplate removes local template', async () => {
    const { result } = renderTpl('text');
    act(() => {
      result.current.setTemplateName('Tpl');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(result.current.templates).toHaveLength(1);
    await act(async () => {
      await result.current.handleDeleteTemplate(0);
    });
    expect(showAlert).toHaveBeenCalledWith('Template "Tpl" deleted', 'success');
    expect(result.current.templates).toHaveLength(0);
  });

  it('handleDeleteTemplate does nothing for invalid index', async () => {
    const { result } = renderTpl();
    await act(async () => {
      await result.current.handleDeleteTemplate(99);
    });
    expect(showAlert).not.toHaveBeenCalledWith(expect.stringContaining('deleted'), 'success');
  });

  // Authenticated tests
  describe('authenticated', () => {
    beforeEach(() => {
      useSelector.mockReturnValue('tok');
      useGetTemplatesQuery.mockReturnValue({
        data: [
          {
            id: 1,
            name: 'DB Tpl',
            text: 'db content',
            tool_id: 'uppercase',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      });
    });

    it('uses DB templates when authenticated', () => {
      const { result } = renderTpl();
      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].name).toBe('DB Tpl');
    });

    it('saves template via API create', async () => {
      const { result } = renderTpl('new text');
      act(() => {
        result.current.setTemplateName('New One');
      });
      await act(async () => {
        await result.current.handleSaveTemplate();
      });
      expect(mockApiCreate).toHaveBeenCalledWith({
        name: 'New One',
        text: 'new text',
        tool_id: 'uppercase',
      });
      expect(showAlert).toHaveBeenCalledWith('Template "New One" saved', 'success');
    });

    it('updates template via API update when name matches', async () => {
      const { result } = renderTpl('updated text');
      act(() => {
        result.current.setTemplateName('DB Tpl');
      });
      await act(async () => {
        await result.current.handleSaveTemplate();
      });
      expect(mockApiUpdate).toHaveBeenCalledWith({
        id: 1,
        name: 'DB Tpl',
        text: 'updated text',
        tool_id: 'uppercase',
      });
      expect(showAlert).toHaveBeenCalledWith('Template "DB Tpl" updated', 'success');
    });

    it('deletes template via API', async () => {
      const { result } = renderTpl();
      await act(async () => {
        await result.current.handleDeleteTemplate(0);
      });
      expect(mockApiDelete).toHaveBeenCalledWith(1);
      expect(showAlert).toHaveBeenCalledWith('Template "DB Tpl" deleted', 'success');
    });

    it('handles API create failure', async () => {
      mockApiCreate.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
      const { result } = renderTpl('text');
      act(() => {
        result.current.setTemplateName('Fail');
      });
      await act(async () => {
        await result.current.handleSaveTemplate();
      });
      expect(showAlert).toHaveBeenCalledWith('Failed to save template', 'danger');
    });

    it('handles API delete failure', async () => {
      mockApiDelete.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
      const { result } = renderTpl();
      await act(async () => {
        await result.current.handleDeleteTemplate(0);
      });
      expect(showAlert).toHaveBeenCalledWith('Failed to delete template', 'danger');
    });
  });

  describe('saveDirectly', () => {
    it('does nothing when name or content is empty', async () => {
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('', 'content');
      });
      expect(showAlert).not.toHaveBeenCalled();
      await act(async () => {
        await result.current.saveDirectly('name', '');
      });
      expect(showAlert).not.toHaveBeenCalled();
    });

    it('saves new local template directly', async () => {
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('Direct', 'content', 'tool1');
      });
      expect(showAlert).toHaveBeenCalledWith('Template "Direct" saved', 'success');
      expect(result.current.templates).toHaveLength(1);
    });

    it('updates existing local template directly', async () => {
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('Tpl', 'content1');
      });
      await act(async () => {
        await result.current.saveDirectly('Tpl', 'content2');
      });
      expect(showAlert).toHaveBeenCalledWith('Template "Tpl" updated', 'success');
      expect(result.current.templates).toHaveLength(1);
    });

    it('saves via API when authenticated', async () => {
      useSelector.mockReturnValue('tok');
      useGetTemplatesQuery.mockReturnValue({ data: [] });
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('New', 'content', 'tool1');
      });
      expect(mockApiCreate).toHaveBeenCalled();
    });

    it('updates via API when authenticated and name matches', async () => {
      useSelector.mockReturnValue('tok');
      useGetTemplatesQuery.mockReturnValue({
        data: [{ id: 5, name: 'Existing', text: 'old', created_at: '', updated_at: '' }],
      });
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('Existing', 'new content');
      });
      expect(mockApiUpdate).toHaveBeenCalledWith({
        id: 5,
        name: 'Existing',
        text: 'new content',
        tool_id: null,
      });
    });

    it('handles API failure in saveDirectly', async () => {
      useSelector.mockReturnValue('tok');
      useGetTemplatesQuery.mockReturnValue({ data: [] });
      mockApiCreate.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
      const { result } = renderTpl();
      await act(async () => {
        await result.current.saveDirectly('Fail', 'content');
      });
      expect(showAlert).toHaveBeenCalledWith('Failed to save template', 'danger');
    });
  });
});
