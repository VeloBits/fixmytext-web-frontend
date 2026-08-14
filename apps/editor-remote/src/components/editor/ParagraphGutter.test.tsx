import React from 'react';
import { render, act } from '@testing-library/react';
import ParagraphGutter from './ParagraphGutter';

// ResizeObserver is not available in jsdom - provide a minimal stub.
class ResizeObserverStub {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  // Allow tests to trigger the callback manually.
  trigger() {
    this.cb([], this as unknown as ResizeObserver);
  }
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function makeTextareaRef(el?: HTMLTextAreaElement | null) {
  return { current: el ?? null } as React.RefObject<HTMLTextAreaElement | null>;
}

describe('ParagraphGutter', () => {
  it('renders the gutter container', () => {
    const { container } = render(
      <ParagraphGutter textareaRef={makeTextareaRef()} text="" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('renders the hidden mirror div', () => {
    const { container } = render(
      <ParagraphGutter textareaRef={makeTextareaRef()} text="" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter-mirror')).toBeTruthy();
  });

  it('renders the numbers container', () => {
    const { container } = render(
      <ParagraphGutter textareaRef={makeTextareaRef()} text="" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter-numbers')).toBeTruthy();
  });

  it('renders with non-empty text without crashing', () => {
    const { container } = render(
      <ParagraphGutter textareaRef={makeTextareaRef()} text="hello\nworld" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('renders with scrollTop applied without crashing', () => {
    const { container } = render(
      <ParagraphGutter textareaRef={makeTextareaRef()} text="paragraph one" scrollTop={100} />
    );
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('handles a null textarea ref without crashing', () => {
    const ref = makeTextareaRef(null);
    const { container } = render(
      <ParagraphGutter textareaRef={ref} text="some text" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('re-renders on text change without crashing', () => {
    const ref = makeTextareaRef();
    const { rerender, container } = render(
      <ParagraphGutter textareaRef={ref} text="line one" scrollTop={0} />
    );
    rerender(
      <ParagraphGutter textareaRef={ref} text="line one\nline two\nline three" scrollTop={0} />
    );
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('re-renders on scrollTop change without crashing', () => {
    const ref = makeTextareaRef();
    const { rerender, container } = render(
      <ParagraphGutter textareaRef={ref} text="text" scrollTop={0} />
    );
    rerender(<ParagraphGutter textareaRef={ref} text="text" scrollTop={200} />);
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();
  });

  it('disconnects ResizeObserver on unmount', () => {
    const disconnectSpy = vi.spyOn(ResizeObserverStub.prototype, 'disconnect');
    // Must provide a real element so useEffect doesn't return early on `!ta`
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const ref = { current: textarea } as React.RefObject<HTMLTextAreaElement | null>;
    const { unmount } = render(
      <ParagraphGutter textareaRef={ref} text="some text" scrollTop={0} />
    );
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
    document.body.removeChild(textarea);
    disconnectSpy.mockRestore();
  });

  it('triggers ResizeObserver callback without crashing (covers setPositions spread)', () => {
    // Track every ResizeObserverStub instance created so we can call trigger().
    const instances: ResizeObserverStub[] = [];

    class TrackingResizeObserver extends ResizeObserverStub {
      constructor(cb: ResizeObserverCallback) {
        super(cb);
        instances.push(this);
      }
    }

    vi.stubGlobal('ResizeObserver', TrackingResizeObserver);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const ref = { current: textarea } as React.RefObject<HTMLTextAreaElement | null>;

    const { container } = render(
      <ParagraphGutter textareaRef={ref} text="paragraph one\n\nparagraph two" scrollTop={0} />
    );

    // The useEffect that sets up ResizeObserver runs after mount.
    // instances[0] is the observer created for this render.
    expect(instances.length).toBeGreaterThan(0);

    // Firing the callback exercises the `setPositions((p) => [...p])` line.
    act(() => {
      instances[instances.length - 1]!.trigger();
    });

    // Component must still be in the DOM - no crash.
    expect(container.querySelector('.tu-paragraph-gutter')).toBeTruthy();

    document.body.removeChild(textarea);
    // Restore the original stub (set in beforeAll) so other tests are unaffected.
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });
});
