import React, { useState } from 'react';
import { ENDPOINTS } from '@/constants/endpoints';

type AlertType = 'warning' | 'danger' | 'success' | 'info';

interface TransformArg {
  endpoint: string;
  text: string;
  key?: string;
  mapping?: string;
}

interface TransformResult {
  result: string;
}

interface CipherDrawerProps {
  activeTool?: { id: string; label?: string } | null;
  text: string;
  onResult: (label: string, result: string) => void;
  showAlert: (message: string, type: AlertType) => void;
  transformText: (arg: TransformArg) => { unwrap: () => Promise<TransformResult> };
}

export default function CipherDrawer({ activeTool, text, onResult, showAlert, transformText }: CipherDrawerProps) {
  const [key, setKey] = useState('');

  const toolId = activeTool?.id || '';

  const handleApply = async () => {
    if (!text) {
      showAlert('Enter text first', 'warning');
      return;
    }
    if (!key) {
      showAlert('Enter a key/passphrase', 'warning');
      return;
    }

    const configs = {
      vigenere_enc: { endpoint: ENDPOINTS.VIGENERE_ENC, label: 'Vigenere Encrypted' },
      vigenere_dec: { endpoint: ENDPOINTS.VIGENERE_DEC, label: 'Vigenere Decrypted' },
      playfair_enc: { endpoint: ENDPOINTS.PLAYFAIR_ENC, label: 'Playfair Encrypted' },
      substitution_cipher: {
        endpoint: ENDPOINTS.SUBSTITUTION_CIPHER,
        label: 'Substitution Applied',
      },
      columnar_transposition: {
        endpoint: ENDPOINTS.COLUMNAR_TRANSPOSITION,
        label: 'Columnar Transposition Applied',
      },
    };

    const config = configs[toolId as keyof typeof configs];
    if (!config) {
      if (toolId === 'aes_encrypt' || toolId === 'aes_decrypt') {
        try {
          const enc = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(key.padEnd(32, '\0').slice(0, 32)),
            'AES-GCM',
            false,
            toolId === 'aes_encrypt' ? ['encrypt'] : ['decrypt']
          );

          if (toolId === 'aes_encrypt') {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
              { name: 'AES-GCM', iv },
              keyMaterial,
              enc.encode(text)
            );
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);
            const b64 = btoa(String.fromCharCode(...combined));
            onResult('AES Encrypted', b64);
          } else {
            const data = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
            const iv = data.slice(0, 12);
            const ciphertext = data.slice(12);
            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv },
              keyMaterial,
              ciphertext
            );
            onResult('AES Decrypted', new TextDecoder().decode(decrypted));
          }
          showAlert(toolId === 'aes_encrypt' ? 'Text encrypted' : 'Text decrypted', 'success');
        } catch {
          showAlert(
            toolId === 'aes_encrypt'
              ? 'Encryption failed'
              : 'Decryption failed — wrong passphrase?',
            'danger'
          );
        }
        return;
      }
      showAlert('Unknown cipher tool', 'danger');
      return;
    }

    try {
      const payload = toolId === 'substitution_cipher' ? { text, mapping: key } : { text, key };
      const data = await transformText({ endpoint: config.endpoint, ...payload }).unwrap();
      onResult(config.label, data.result);
      showAlert(`${config.label}`, 'success');
    } catch (err) {
      const apiErr = err as { data?: { detail?: string } };
      showAlert(apiErr.data?.detail || 'Cipher operation failed', 'danger');
    }
  };

  const getPlaceholder = () => {
    if (toolId === 'substitution_cipher') return 'Substitution alphabet (26 chars A–Z), e.g. ZYXWVUTSRQPONMLKJIHGFEDCBA';
    if (toolId === 'aes_encrypt' || toolId === 'aes_decrypt') return 'Enter a secret key here';
    if (toolId === 'columnar_transposition') return 'Key, e.g. ZEBRAS';
    return 'Key, e.g. SECRET';
  };

  // Mask the key for all secret-key ciphers. Substitution uses a public
  // alphabet mapping rather than a secret, so it stays visible.
  const isPassword = toolId !== 'substitution_cipher';

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApply();
  };

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            type={isPassword ? 'password' : 'text'}
            className="tu-fr-input"
            placeholder={getPlaceholder()}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleApply}
            title="Apply"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
