import { render, screen, fireEvent } from '@testing-library/react';

import TemplatesDrawer from './TemplatesDrawer';

function renderTemplates(props = {}) {
  return render(
    <TemplatesDrawer
      templates={[]}
      templateName=""
      setTemplateName={vi.fn()}
      handleSaveTemplate={vi.fn()}
      handleLoadTemplate={vi.fn()}
      handleDeleteTemplate={vi.fn()}
      disabled={false}
      {...props}
    />
  );
}

describe('TemplatesDrawer', () => {
  it('renders template name input', () => {
    renderTemplates();
    expect(screen.getByPlaceholderText('Template name…')).toBeInTheDocument();
  });

  it('renders Save button', () => {
    renderTemplates();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    renderTemplates();
    expect(screen.getByText(/No saved templates yet/)).toBeInTheDocument();
  });

  it('calls setTemplateName on input change', () => {
    const setTemplateName = vi.fn();
    renderTemplates({ setTemplateName });
    fireEvent.change(screen.getByPlaceholderText('Template name…'), {
      target: { value: 'My Template' },
    });
    expect(setTemplateName).toHaveBeenCalledWith('My Template');
  });

  it('calls handleSaveTemplate on Save click', () => {
    const handleSaveTemplate = vi.fn();
    renderTemplates({ handleSaveTemplate });
    fireEvent.click(screen.getByText('Save'));
    expect(handleSaveTemplate).toHaveBeenCalled();
  });

  it('calls handleSaveTemplate on Enter key', () => {
    const handleSaveTemplate = vi.fn();
    renderTemplates({ handleSaveTemplate });
    fireEvent.keyDown(screen.getByPlaceholderText('Template name…'), { key: 'Enter' });
    expect(handleSaveTemplate).toHaveBeenCalled();
  });

  it('disables Save button when disabled prop is true', () => {
    renderTemplates({ disabled: true });
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('renders template list', () => {
    const templates = [
      { name: 'Template 1', text: 'Hello world', tool_id: 'uppercase' },
      { name: 'Template 2', text: 'Foo bar', tool_id: '' },
    ];
    renderTemplates({ templates });
    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template 2')).toBeInTheDocument();
    expect(screen.getByText('11 chars')).toBeInTheDocument();
    expect(screen.getByText('7 chars')).toBeInTheDocument();
    expect(screen.getByText('uppercase')).toBeInTheDocument();
  });

  it('calls handleLoadTemplate when Load is clicked', () => {
    const handleLoadTemplate = vi.fn();
    const templates = [{ name: 'T1', text: 'test', tool_id: '' }];
    renderTemplates({ templates, handleLoadTemplate });
    fireEvent.click(screen.getByText('Load'));
    expect(handleLoadTemplate).toHaveBeenCalledWith(0);
  });

  it('calls handleDeleteTemplate when delete is clicked', () => {
    const handleDeleteTemplate = vi.fn();
    const templates = [{ name: 'T1', text: 'test', tool_id: '' }];
    renderTemplates({ templates, handleDeleteTemplate });
    fireEvent.click(screen.getByText('✕'));
    expect(handleDeleteTemplate).toHaveBeenCalledWith(0);
  });

  it('renders tool_id tag with underscores replaced', () => {
    const templates = [{ name: 'T', text: 'x', tool_id: 'my_tool_name' }];
    renderTemplates({ templates });
    expect(screen.getByText('my tool name')).toBeInTheDocument();
  });

  it('does not render tool_id tag when empty', () => {
    const templates = [{ name: 'T', text: 'x', tool_id: '' }];
    renderTemplates({ templates });
    // Should only have name, chars, Load, and delete
    expect(screen.queryByText(/tool/i)).not.toBeInTheDocument();
  });
});
