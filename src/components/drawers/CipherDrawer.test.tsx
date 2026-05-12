import { render, screen, fireEvent } from '@testing-library/react';

import CipherDrawer from './CipherDrawer';

function renderCipher(props = {}) {
  return render(
    <CipherDrawer
      activeTool={{ id: 'vigenere_enc' }}
      text="Hello world"
      onResult={vi.fn()}
      showAlert={vi.fn()}
      transformText={vi.fn()}
      {...props}
    />
  );
}

describe('CipherDrawer', () => {
  it('renders placeholder for substitution cipher', () => {
    renderCipher({ activeTool: { id: 'substitution_cipher' } });
    expect(
      screen.getByPlaceholderText(/Substitution alphabet \(26 chars A–Z\)/)
    ).toBeInTheDocument();
  });

  it('renders placeholder for columnar transposition', () => {
    renderCipher({ activeTool: { id: 'columnar_transposition' } });
    expect(screen.getByPlaceholderText('Key, e.g. ZEBRAS')).toBeInTheDocument();
  });

  it('renders placeholder for aes', () => {
    renderCipher({ activeTool: { id: 'aes_decrypt' } });
    expect(screen.getByPlaceholderText('Enter a secret key here')).toBeInTheDocument();
  });

  it('renders default placeholder for unknown tool', () => {
    renderCipher({ activeTool: { id: 'unknown' } });
    expect(screen.getByPlaceholderText('Key, e.g. SECRET')).toBeInTheDocument();
  });

  it('uses password input type for aes tools', () => {
    renderCipher({ activeTool: { id: 'aes_encrypt' } });
    expect(screen.getByPlaceholderText('Enter a secret key here')).toHaveAttribute('type', 'password');
  });

  it('shows warning when no text', () => {
    const showAlert = vi.fn();
    renderCipher({ text: '', showAlert });
    fireEvent.click(screen.getByText('Apply'));
    expect(showAlert).toHaveBeenCalledWith('Enter text first', 'warning');
  });

  it('shows warning when no key', () => {
    const showAlert = vi.fn();
    renderCipher({ text: 'some text', showAlert });
    fireEvent.click(screen.getByText('Apply'));
    expect(showAlert).toHaveBeenCalledWith('Enter a key/passphrase', 'warning');
  });

  it('updates key input', () => {
    renderCipher();
    const input = screen.getByPlaceholderText('Key, e.g. SECRET') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'MYKEY' } });
    expect(input.value).toBe('MYKEY');
  });

  it('calls transformText for vigenere_enc with key', async () => {
    const onResult = vi.fn();
    const showAlert = vi.fn();
    const transformText = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve({ result: 'encrypted' }),
    });

    renderCipher({
      activeTool: { id: 'vigenere_enc' },
      text: 'Hello',
      onResult,
      showAlert,
      transformText,
    });

    fireEvent.change(screen.getByPlaceholderText('Key, e.g. SECRET'), {
      target: { value: 'KEY' },
    });
    fireEvent.click(screen.getByText('Apply'));

    await vi.waitFor(() => {
      expect(transformText).toHaveBeenCalled();
      expect(onResult).toHaveBeenCalledWith('Vigenere Encrypted', 'encrypted');
    });
  });

  it('shows error when transformText fails', async () => {
    const showAlert = vi.fn();
    const transformText = vi.fn().mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Server error' } }),
    });

    renderCipher({ activeTool: { id: 'vigenere_enc' }, text: 'Hello', showAlert, transformText });

    fireEvent.change(screen.getByPlaceholderText('Key, e.g. SECRET'), {
      target: { value: 'KEY' },
    });
    fireEvent.click(screen.getByText('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Server error', 'danger');
    });
  });

  it('shows danger for unknown cipher tool with key provided', async () => {
    const showAlert = vi.fn();
    renderCipher({ activeTool: { id: 'unknown_tool' }, text: 'Hello', showAlert });

    fireEvent.change(screen.getByPlaceholderText('Key, e.g. SECRET'), {
      target: { value: 'KEY' },
    });
    fireEvent.click(screen.getByText('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Unknown cipher tool', 'danger');
    });
  });

  it('handles no activeTool gracefully', () => {
    renderCipher({ activeTool: null });
    expect(screen.getByPlaceholderText('Key, e.g. SECRET')).toBeInTheDocument();
  });
});
