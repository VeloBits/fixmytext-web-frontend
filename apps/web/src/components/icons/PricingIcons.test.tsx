import React from 'react';
import { render } from '@testing-library/react';
import {
  NumIcon,
  DropletIcon,
  SunIcon,
  RunnerIcon,
  CalendarIcon,
  TrophyIcon,
  WrenchIcon,
  TwoIcon,
  StarIcon,
  FlagIcon,
  ClipboardIcon,
  RulerIcon,
  LeafIcon,
  CrownIcon,
  JarIcon,
  BucketIcon,
  BarrelIcon,
  GiftIcon,
} from './PricingIcons';

describe('PricingIcons', () => {
  describe('NumIcon', () => {
    it('renders the number', () => {
      const { container } = render(<NumIcon n={5} />);
      expect(container.querySelector('text')?.textContent).toBe('5');
    });

    it('uses smaller font for multi-digit numbers', () => {
      const { container } = render(<NumIcon n={12} />);
      expect(container.querySelector('text')).toHaveAttribute('font-size', '11');
    });

    it('uses larger font for single-digit numbers', () => {
      const { container } = render(<NumIcon n={3} />);
      expect(container.querySelector('text')).toHaveAttribute('font-size', '14');
    });
  });

  it.each([
    ['DropletIcon', DropletIcon],
    ['SunIcon', SunIcon],
    ['RunnerIcon', RunnerIcon],
    ['CalendarIcon', CalendarIcon],
    ['TrophyIcon', TrophyIcon],
    ['WrenchIcon', WrenchIcon],
    ['TwoIcon', TwoIcon],
    ['StarIcon', StarIcon],
    ['FlagIcon', FlagIcon],
    ['ClipboardIcon', ClipboardIcon],
    ['RulerIcon', RulerIcon],
    ['LeafIcon', LeafIcon],
    ['CrownIcon', CrownIcon],
    ['JarIcon', JarIcon],
    ['BucketIcon', BucketIcon],
    ['BarrelIcon', BarrelIcon],
    ['GiftIcon', GiftIcon],
  ])('%s renders an SVG', (name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('passes props through to icons', () => {
    const { container } = render(<DropletIcon size={48} stroke="green" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('stroke', 'green');
  });
});
