import React from 'react';
import { render } from '@testing-library/react';
import ParagraphGutter from './ParagraphGutter';

// ResizeObserver is not available in jsdom — provide a minimal stub.
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
    rerender(<ParagraphGutter textareaRef={ref} text="line one\nline two\nline three" scrollTop={0} />);
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
    const ref = makeTextareaRef();
    const { unmount } = render(
      <ParagraphGutter textareaRef={ref} text="some text" scrollTop={0} />
    );
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
