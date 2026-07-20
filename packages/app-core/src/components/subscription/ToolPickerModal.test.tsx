import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToolPickerModal from './ToolPickerModal';
import { TOOLS } from '../../constants/tools';
import { ALWAYS_FREE_IDS } from '../../constants/pricing';

const billable = TOOLS.filter(
  (t) => ['api', 'ai', 'local', 'select'].includes(t.type) && !ALWAYS_FREE_IDS.has(t.id)
);

describe('ToolPickerModal', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPicker = (props = {}) =>
    render(
      <ToolPickerModal
        open
        requiredCount={3}
        passName="Day Triple"
        priceLabel="₹25"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    );

  it('renders nothing when closed', () => {
    const { container } = render(
      <ToolPickerModal
        open={false}
        requiredCount={3}
        passName="Day Triple"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a dialog with the pass name and count', () => {
    renderPicker();
    expect(
      screen.getByRole('dialog', { name: /choose 3 tools for day triple/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('tool-picker-counter')).toHaveTextContent('0 of 3 selected');
  });

  it('excludes drawer and always-free tools from the list', () => {
    renderPicker();
    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    expect(checkboxes.length).toBe(billable.length);
    const freeTool = TOOLS.find((t) => ALWAYS_FREE_IDS.has(t.id));
    if (freeTool) {
      expect(screen.queryByText(freeTool.label)).not.toBeInTheDocument();
    }
  });

  it('gates confirm on exactly N selections and returns the chosen ids', () => {
    renderPicker();
    const confirm = screen.getByRole('button', { name: /continue to pay — ₹25/i });
    expect(confirm).toBeDisabled();

    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
    expect(confirm).toBeDisabled();
    expect(screen.getByTestId('tool-picker-counter')).toHaveTextContent('2 of 3 selected');

    fireEvent.click(checkboxes[2]!);
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const ids = onConfirm.mock.calls[0]![0] as string[];
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    ids.forEach((id) => expect(billable.some((t) => t.id === id)).toBe(true));
  });

  it('refuses selections beyond the required count', () => {
    renderPicker({ requiredCount: 1 });
    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    fireEvent.click(checkboxes[0]!);
    expect(checkboxes[1]!).toBeDisabled();
  });

  it('seeds initialSelection (deduped, billable only)', () => {
    const seedTool = billable[0]!;
    renderPicker({ initialSelection: [seedTool.id, seedTool.id, 'find_replace'] });
    expect(screen.getByTestId('tool-picker-counter')).toHaveTextContent('1 of 3 selected');
  });

  it('filters tools by search query', () => {
    renderPicker();
    const target = billable[0]!;
    fireEvent.change(screen.getByLabelText(/search tools/i), {
      target: { value: target.label },
    });
    expect(screen.getAllByRole('menuitemcheckbox').length).toBeLessThan(billable.length);
  });

  it('closes on Escape and on the close button', () => {
    renderPicker();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
