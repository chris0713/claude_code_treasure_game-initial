import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  type ChartConfig,
} from '../../src/components/ui/chart';

// ResponsiveContainer measures its parent, which jsdom cannot do; render children as-is instead.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const Icon = () => <svg data-testid="icon" />;

const config: ChartConfig = {
  wins: { label: 'Wins', color: 'green' },
  losses: { label: 'Losses', theme: { light: 'red', dark: 'darkred' }, icon: Icon },
  ties: { label: 'Ties' },
  chrome: { label: 'Chrome browser' },
};

const wins = { dataKey: 'wins', name: 'wins', value: 3, color: 'green', payload: { fill: 'lime' } };
const losses = { dataKey: 'losses', name: 'losses', value: 2, payload: {} };

// Renders content inside a chart container. Input: element and optional container id. Output: render result.
const inChart = (node: React.ReactElement, id?: string) =>
  render(
    <ChartContainer config={config} id={id}>
      {node}
    </ChartContainer>,
  );

describe('ChartContainer and ChartStyle', () => {
  it('writes CSS color variables for each theme', () => {
    const { container } = inChart(<div />, 'scores');
    expect(container.querySelector('[data-chart="chart-scores"]')).toBeInTheDocument();
    const css = container.querySelector('style')!.innerHTML;
    expect(css).toContain('[data-chart=chart-scores]');
    expect(css).toContain('--color-wins: green;');
    expect(css).toContain('.dark [data-chart=chart-scores]');
    expect(css).toContain('--color-losses: darkred;');
  });

  it('generates an id when none is given', () => {
    const { container } = inChart(<div />);
    expect(container.querySelector('[data-slot="chart"]')!.getAttribute('data-chart')).toMatch(/^chart-/);
  });

  it('writes no style without colors and skips themes missing a color', () => {
    const { container } = render(<ChartStyle id="x" config={{ a: { label: 'A' } }} />);
    expect(container.querySelector('style')).toBeNull();
    const partial = { a: { theme: { light: 'red' } } } as unknown as ChartConfig;
    const { container: c2 } = render(<ChartStyle id="y" config={partial} />);
    expect(c2.querySelector('style')!.innerHTML).toContain('--color-a: red;');
  });
});

describe('ChartTooltipContent', () => {
  it('renders nothing when inactive or empty', () => {
    const { container } = inChart(
      <>
        <ChartTooltipContent active={false} payload={[wins]} />
        <ChartTooltipContent active payload={[]} />
      </>,
    );
    expect(container.querySelectorAll('.grid.gap-1\\.5')).toHaveLength(0);
  });

  it('shows the config label for a known label and lists items with dot indicators', () => {
    inChart(<ChartTooltipContent active payload={[wins, losses]} label="ties" />);
    expect(screen.getByText('Ties')).toHaveClass('font-medium');
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(document.querySelector('.h-2\\.5.w-2\\.5')).toHaveStyle({ '--color-bg': 'lime' });
  });

  it('falls back to the raw label and hides it on request', () => {
    const { unmount } = inChart(<ChartTooltipContent active payload={[wins]} label="Round 1" />);
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    unmount();
    inChart(<ChartTooltipContent active payload={[wins]} label="Round 1" hideLabel />);
    expect(screen.queryByText('Round 1')).not.toBeInTheDocument();
  });

  it('uses labelKey, labelFormatter and a custom color', () => {
    inChart(
      <ChartTooltipContent
        active
        payload={[{ ...wins, color: undefined, payload: {} }, losses]}
        labelKey="losses"
        labelFormatter={(value) => `Label: ${value}`}
        labelClassName="lbl"
        color="purple"
      />,
    );
    expect(screen.getByText('Label: Losses')).toHaveClass('lbl');
    expect(document.querySelector('.h-2\\.5.w-2\\.5')).toHaveStyle({ '--color-bg': 'purple' });
  });

  it('renders no label when nothing resolves to one', () => {
    const { container } = inChart(
      <ChartTooltipContent active payload={[{ dataKey: 'other', name: 'other', value: 0, payload: {} }]} />,
    );
    expect(container.querySelector('.font-medium')).toBeNull();
    expect(screen.getByText('other')).toBeInTheDocument();
    // A zero value gets no value badge (React still prints the bare 0 from `item.value && ...`).
    expect(container.querySelector('.font-mono')).toBeNull();
  });

  it('nests the label for single line and dashed indicators', () => {
    const { unmount } = inChart(<ChartTooltipContent active payload={[wins]} label="ties" indicator="line" />);
    expect(document.querySelector('.w-1')).toBeInTheDocument();
    expect(document.querySelector('.items-end')).toBeInTheDocument();
    unmount();
    inChart(<ChartTooltipContent active payload={[wins]} label="ties" indicator="dashed" hideIndicator={false} />);
    expect(document.querySelector('.border-dashed.my-0\\.5')).toBeInTheDocument();
  });

  it('can hide indicators and use a formatter', () => {
    const { unmount } = inChart(<ChartTooltipContent active payload={[wins]} hideIndicator />);
    expect(document.querySelector('.h-2\\.5.w-2\\.5')).toBeNull();
    unmount();
    inChart(<ChartTooltipContent active payload={[wins]} formatter={(value, name) => `${name}=${value}`} />);
    expect(screen.getByText('wins=3')).toBeInTheDocument();
  });

  it('resolves config entries through nameKey on the item or its payload', () => {
    inChart(
      <ChartTooltipContent
        active
        nameKey="browser"
        payload={[
          { dataKey: 'a', name: 'a', value: 1, browser: 'chrome', payload: {} },
          { dataKey: 'b', name: 'b', value: 2, payload: { browser: 'chrome' } },
          { dataKey: 'c', name: 'c', value: 3, payload: 'raw' },
        ]}
      />,
    );
    expect(screen.getAllByText('Chrome browser')).toHaveLength(2);
  });
});

describe('ChartLegendContent', () => {
  it('renders nothing without items', () => {
    const { container } = inChart(<ChartLegendContent payload={[]} />);
    expect(container.querySelector('.pt-3')).toBeNull();
  });

  it('lists entries with icons or color swatches', () => {
    inChart(
      <ChartLegendContent
        payload={[
          { value: 'wins', dataKey: 'wins', color: 'green' },
          { value: 'losses', dataKey: 'losses', color: 'red' },
        ]}
      />,
    );
    expect(document.querySelector('.pt-3')).toBeInTheDocument();
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('hides icons, aligns to the top and supports nameKey', () => {
    inChart(
      <ChartLegendContent
        verticalAlign="top"
        hideIcon
        nameKey="kind"
        payload={[{ value: 'x', kind: 'losses', color: 'red' } as never, { value: 'y', color: 'blue' }]}
      />,
    );
    expect(document.querySelector('.pb-3')).toBeInTheDocument();
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
  });

  it('requires a ChartContainer parent', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ChartLegendContent payload={[]} />)).toThrow('useChart must be used within a <ChartContainer />');
    vi.restoreAllMocks();
  });
});
