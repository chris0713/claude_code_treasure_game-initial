import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../src/components/ui/carousel';

// jsdom has no layout, so Embla is replaced by a fake API the tests control.
const embla = vi.hoisted(() => {
  const api = {
    canScrollPrev: vi.fn(() => true),
    canScrollNext: vi.fn(() => false),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  return { api, current: api as typeof api | undefined };
});
vi.mock('embla-carousel-react', () => ({ default: vi.fn(() => [vi.fn(), embla.current]) }));

afterEach(() => {
  embla.current = embla.api;
  vi.clearAllMocks();
});

// Renders a two-slide carousel. Input: extra Carousel props. Output: render result.
function renderCarousel(props: Partial<React.ComponentProps<typeof Carousel>> = {}) {
  return render(
    <Carousel {...props}>
      <CarouselContent>
        <CarouselItem>Slide 1</CarouselItem>
        <CarouselItem>Slide 2</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>,
  );
}

describe('Carousel', () => {
  it('wires buttons, keys and the API for a horizontal carousel', () => {
    const setApi = vi.fn();
    const { unmount } = renderCarousel({ setApi });
    expect(setApi).toHaveBeenCalledWith(embla.api);
    expect(embla.api.on).toHaveBeenCalledWith('select', expect.any(Function));
    expect(screen.getAllByRole('group')[0]).toHaveClass('pl-4');

    const prev = screen.getByRole('button', { name: 'Previous slide' });
    const next = screen.getByRole('button', { name: 'Next slide' });
    expect(prev).toBeEnabled();
    expect(next).toBeDisabled();
    expect(prev).toHaveClass('-left-12');

    fireEvent.click(prev);
    expect(embla.api.scrollPrev).toHaveBeenCalledTimes(1);

    const region = screen.getByRole('region');
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    fireEvent.keyDown(region, { key: 'Enter' });
    expect(embla.api.scrollPrev).toHaveBeenCalledTimes(2);
    expect(embla.api.scrollNext).toHaveBeenCalledTimes(1);

    unmount();
    expect(embla.api.off).toHaveBeenCalledWith('select', expect.any(Function));
  });

  it('uses vertical classes', () => {
    renderCarousel({ orientation: 'vertical' });
    expect(screen.getAllByRole('group')[0]).toHaveClass('pt-4');
    expect(screen.getByRole('button', { name: 'Previous slide' })).toHaveClass('-top-12');
    expect(screen.getByRole('button', { name: 'Next slide' })).toHaveClass('-bottom-12');
  });

  it('stays inert before Embla provides an API', () => {
    embla.current = undefined;
    const setApi = vi.fn();
    renderCarousel({ setApi });
    expect(setApi).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(embla.api.scrollNext).not.toHaveBeenCalled();
  });

  it('ignores a select event without an API', () => {
    renderCarousel();
    const onSelect = embla.api.on.mock.calls.find(([event]) => event === 'select')![1];
    expect(() => onSelect(undefined)).not.toThrow();
  });

  it('requires a Carousel parent', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<CarouselItem />)).toThrow('useCarousel must be used within a <Carousel />');
  });
});
