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
    expect(screen.getByPlaceholderText('Enter a secret key here')).toHaveAttribute(
      'type',
      'password'
    );
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

  it('shows text input (not password) for substitution cipher', () => {
    renderCipher({ activeTool: { id: 'substitution_cipher' } });
    const input = screen.getByPlaceholderText(/Substitution alphabet/);
    expect((input as HTMLInputElement).type).toBe('text');
  });

  it('shows password input for non-substitution ciphers', () => {
    renderCipher({ activeTool: { id: 'vigenere_enc' } });
    const input = screen.getByPlaceholderText('Key, e.g. SECRET');
    expect((input as HTMLInputElement).type).toBe('password');
  });

  it('shows aes placeholder for aes_encrypt', () => {
    renderCipher({ activeTool: { id: 'aes_encrypt' } });
    expect(screen.getByPlaceholderText('Enter a secret key here')).toBeInTheDocument();
  });

  it('pressing Enter key triggers handleApply', async () => {
    const showAlert = vi.fn();
    render(
      <CipherDrawer
        activeTool={{ id: 'vigenere_enc' }}
        text=""
        onResult={vi.fn()}
        showAlert={showAlert}
        transformText={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('Key, e.g. SECRET');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Enter text first', 'warning');
    });
  });

  it('AES encrypt succeeds with mocked crypto.subtle', async () => {
    const onResult = vi.fn();
    const showAlert = vi.fn();

    const fakeKeyMaterial = {};
    const fakeEncrypted = new Uint8Array([10, 20, 30]).buffer;
    const mockImportKey = vi.fn(async () => fakeKeyMaterial);
    const mockEncrypt = vi.fn(async () => fakeEncrypted);
    const mockGetRandVals = vi.fn(<T extends ArrayBufferView>(arr: T) => {
      (arr as unknown as Uint8Array).fill(0);
      return arr;
    });

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: { importKey: mockImportKey, encrypt: mockEncrypt },
        getRandomValues: mockGetRandVals,
      },
      writable: true,
      configurable: true,
    });

    render(
      <CipherDrawer
        activeTool={{ id: 'aes_encrypt' }}
        text="Hello world"
        onResult={onResult}
        showAlert={showAlert}
        transformText={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter a secret key here'), {
      target: { value: 'mysecretpassword' },
    });
    fireEvent.click(screen.getByTitle('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Text encrypted', 'success');
    });
    expect(onResult).toHaveBeenCalledWith('AES Encrypted', expect.any(String));
  });

  it('AES decrypt succeeds with mocked crypto.subtle', async () => {
    const onResult = vi.fn();
    const showAlert = vi.fn();

    const fakeKeyMaterial = {};
    const decryptedText = new TextEncoder().encode('decrypted!');
    const mockImportKey = vi.fn(async () => fakeKeyMaterial);
    const mockDecrypt = vi.fn(async () => decryptedText.buffer);

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: { importKey: mockImportKey, decrypt: mockDecrypt },
        getRandomValues: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Create valid base64 with 12+ bytes for IV
    const dummyData = new Uint8Array(20).fill(5);
    const b64Input = btoa(String.fromCharCode(...dummyData));

    render(
      <CipherDrawer
        activeTool={{ id: 'aes_decrypt' }}
        text={b64Input}
        onResult={onResult}
        showAlert={showAlert}
        transformText={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter a secret key here'), {
      target: { value: 'mysecretpassword' },
    });
    fireEvent.click(screen.getByTitle('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Text decrypted', 'success');
    });
    expect(onResult).toHaveBeenCalledWith('AES Decrypted', 'decrypted!');
  });

  it('AES encrypt shows danger on crypto failure', async () => {
    const showAlert = vi.fn();

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          importKey: vi.fn(async () => {
            throw new Error('fail');
          }),
        },
        getRandomValues: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    render(
      <CipherDrawer
        activeTool={{ id: 'aes_encrypt' }}
        text="Hello"
        onResult={vi.fn()}
        showAlert={showAlert}
        transformText={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter a secret key here'), {
      target: { value: 'key' },
    });
    fireEvent.click(screen.getByTitle('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Encryption failed', 'danger');
    });
  });

  it('AES decrypt shows danger on crypto failure', async () => {
    const showAlert = vi.fn();

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          importKey: vi.fn(async () => {
            throw new Error('bad key');
          }),
        },
        getRandomValues: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const dummyData = new Uint8Array(20).fill(0);
    const b64Input = btoa(String.fromCharCode(...dummyData));

    render(
      <CipherDrawer
        activeTool={{ id: 'aes_decrypt' }}
        text={b64Input}
        onResult={vi.fn()}
        showAlert={showAlert}
        transformText={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter a secret key here'), {
      target: { value: 'key' },
    });
    fireEvent.click(screen.getByTitle('Apply'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Decryption failed — wrong passphrase?', 'danger');
    });
  });
});
