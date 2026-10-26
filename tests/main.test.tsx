import { describe, expect, it, vi } from 'vitest';

const { createRoot, render } = vi.hoisted(() => {
  const render = vi.fn();
  return { render, createRoot: vi.fn(() => ({ render })) };
});
vi.mock('react-dom/client', () => ({ createRoot }));
vi.mock('../src/App.tsx', () => ({ default: () => null }));

describe('main', () => {
  it('mounts the app into #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../src/main');
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
  });
});
