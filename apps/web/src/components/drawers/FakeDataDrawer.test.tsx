import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FakeDataDrawer from './FakeDataDrawer';

describe('FakeDataDrawer', () => {
  const baseProps = {
    activeTool: { id: 'fake_data_set', label: 'Fake Data' },
    onResult: vi.fn(),
    showAlert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the count label for fake_data_set', () => {
    render(<FakeDataDrawer {...baseProps} />);
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('renders count options', () => {
    render(<FakeDataDrawer {...baseProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders format options for fake_data_set', () => {
    render(<FakeDataDrawer {...baseProps} />);
    expect(screen.getByText('TEXT')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('does not show format options for fake_name', () => {
    render(<FakeDataDrawer {...baseProps} activeTool={{ id: 'fake_name', label: 'Fake Names' }} />);
    expect(screen.queryByText('Format')).not.toBeInTheDocument();
    expect(screen.queryByText('TEXT')).not.toBeInTheDocument();
  });

  it('generates data in text format', () => {
    render(<FakeDataDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(baseProps.onResult).toHaveBeenCalledWith('Fake Data', expect.any(String));
    expect(baseProps.showAlert).toHaveBeenCalledWith('Generated 5 record(s)', 'success');
  });

  it('generates data in JSON format', () => {
    render(<FakeDataDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('JSON'));
    fireEvent.click(screen.getByText('Generate'));
    const output = baseProps.onResult!.mock.calls[0]![1];
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('generates data in CSV format', () => {
    render(<FakeDataDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('CSV'));
    fireEvent.click(screen.getByText('Generate'));
    const output = baseProps.onResult!.mock.calls[0]![1];
    expect(output).toContain('name,email,phone,address');
  });

  it('generates fake names only', () => {
    render(<FakeDataDrawer {...baseProps} activeTool={{ id: 'fake_name', label: 'Fake Names' }} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(baseProps.onResult).toHaveBeenCalledWith('Fake Names', expect.any(String));
  });

  it('generates fake emails', () => {
    render(
      <FakeDataDrawer {...baseProps} activeTool={{ id: 'fake_email', label: 'Fake Emails' }} />
    );
    fireEvent.click(screen.getByText('Generate'));
    const output = baseProps.onResult!.mock.calls[0]![1];
    expect(output).toContain('@');
  });

  it('generates fake phones', () => {
    render(
      <FakeDataDrawer {...baseProps} activeTool={{ id: 'fake_phone', label: 'Fake Phones' }} />
    );
    fireEvent.click(screen.getByText('Generate'));
    expect(baseProps.onResult).toHaveBeenCalled();
  });

  it('generates fake addresses', () => {
    render(
      <FakeDataDrawer {...baseProps} activeTool={{ id: 'fake_address', label: 'Fake Addresses' }} />
    );
    fireEvent.click(screen.getByText('Generate'));
    expect(baseProps.onResult).toHaveBeenCalled();
  });

  it('changes count when clicking option', () => {
    render(<FakeDataDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('10'));
    fireEvent.click(screen.getByText('Generate'));
    expect(baseProps.showAlert).toHaveBeenCalledWith('Generated 10 record(s)', 'success');
  });

  it('handles null activeTool', () => {
    render(<FakeDataDrawer {...baseProps} activeTool={null} />);
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
  });
});
