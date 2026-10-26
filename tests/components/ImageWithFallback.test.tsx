import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImageWithFallback } from '../../src/components/figma/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('renders the image and swaps to a placeholder when it fails to load', () => {
    const { container } = render(<ImageWithFallback src="/x.png" alt="Chest" className="w-4" style={{ width: 4 }} />);
    const img = screen.getByAltText('Chest');
    expect(img).toHaveAttribute('src', '/x.png');
    fireEvent.error(img);
    expect(screen.getByAltText('Error loading image')).toHaveAttribute('data-original-url', '/x.png');
    expect(container.firstElementChild).toHaveClass('inline-block', 'w-4');
  });

  it('works without a className', () => {
    const { container } = render(<ImageWithFallback src="/x.png" alt="Chest" />);
    fireEvent.error(screen.getByAltText('Chest'));
    expect(container.firstElementChild?.className).toBe('inline-block bg-gray-100 text-center align-middle ');
  });
});
