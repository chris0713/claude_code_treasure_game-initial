import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { cn } from '../../src/components/ui/utils';
import { useIsMobile } from '../../src/components/ui/use-mobile';
import { AspectRatio } from '../../src/components/ui/aspect-ratio';
import { Skeleton } from '../../src/components/ui/skeleton';
import { Textarea } from '../../src/components/ui/textarea';
import { Input } from '../../src/components/ui/input';
import { Label } from '../../src/components/ui/label';
import { Toaster } from '../../src/components/ui/sonner';
import { Separator } from '../../src/components/ui/separator';
import { Progress } from '../../src/components/ui/progress';
import { Switch } from '../../src/components/ui/switch';
import { Checkbox } from '../../src/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../src/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../src/components/ui/hover-card';
import { RadioGroup, RadioGroupItem } from '../../src/components/ui/radio-group';
import { Badge } from '../../src/components/ui/badge';
import { Toggle } from '../../src/components/ui/toggle';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../../src/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../../src/components/ui/avatar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../src/components/ui/resizable';
import { Button } from '../../src/components/ui/button';
import { ScrollArea, ScrollBar } from '../../src/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../src/components/ui/tooltip';
import { Slider } from '../../src/components/ui/slider';

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

describe('utils', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2', false && 'hidden', 'px-4', ['text-sm'])).toBe('px-4 text-sm');
  });
});

describe('useIsMobile', () => {
  it('tracks the window width through the media query', () => {
    let listener: () => void = () => {};
    const removeEventListener = vi.fn();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      addEventListener: (_: string, cb: () => void) => (listener = cb),
      removeEventListener,
    } as unknown as MediaQueryList);
    window.innerWidth = 500;
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    window.innerWidth = 1024;
    act(() => listener());
    expect(result.current).toBe(false);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', listener);
    vi.restoreAllMocks();
  });
});

describe('simple form controls', () => {
  it('renders input, textarea and label with merged classes', () => {
    render(
      <>
        <Label htmlFor="n" className="lbl">Name</Label>
        <Input id="n" type="email" className="inp" />
        <Textarea aria-label="Notes" className="txt" />
      </>,
    );
    expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Name')).toHaveClass('inp');
    expect(screen.getByLabelText('Notes')).toHaveClass('txt');
    expect(screen.getByText('Name')).toHaveClass('lbl');
  });

  it('toggles switch, checkbox, toggle and radio items', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Switch aria-label="sw" />
        <Checkbox aria-label="cb" />
        <Toggle aria-label="tg" variant="outline" size="lg" />
        <RadioGroup aria-label="rg" defaultValue="a">
          <RadioGroupItem value="a" aria-label="ra" />
          <RadioGroupItem value="b" aria-label="rb" />
        </RadioGroup>
      </>,
    );
    await user.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
    await user.click(screen.getByLabelText('tg'));
    expect(screen.getByLabelText('tg')).toHaveAttribute('data-state', 'on');
    await user.click(screen.getByLabelText('rb'));
    expect(screen.getByLabelText('rb')).toHaveAttribute('data-state', 'checked');
  });

  it('renders sliders from value, defaultValue or min/max', () => {
    const { container } = render(
      <>
        <Slider value={[10]} />
        <Slider defaultValue={[10, 20]} />
        <Slider />
      </>,
    );
    const thumbs = [...container.querySelectorAll('[data-slot="slider"]')].map(
      (s) => s.querySelectorAll('[data-slot="slider-thumb"]').length,
    );
    expect(thumbs).toEqual([1, 2, 2]);
  });

  it('positions the progress indicator', () => {
    render(
      <>
        <Progress value={40} />
        <Progress />
      </>,
    );
    const bars = document.querySelectorAll<HTMLElement>('[data-slot="progress-indicator"]');
    expect(bars[0].style.transform).toBe('translateX(-60%)');
    expect(bars[1].style.transform).toBe('translateX(-100%)');
  });
});

describe('display components', () => {
  it('renders button and badge variants, including asChild', () => {
    render(
      <>
        <Button variant="destructive" size="icon">x</Button>
        <Button asChild>
          <a href="/b">link button</a>
        </Button>
        <Badge variant="secondary">new</Badge>
        <Badge asChild>
          <a href="/c">link badge</a>
        </Badge>
      </>,
    );
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('bg-destructive', 'size-9');
    expect(screen.getByRole('link', { name: 'link button' })).toHaveAttribute('data-slot', 'button');
    expect(screen.getByText('new')).toHaveClass('bg-secondary');
    expect(screen.getByRole('link', { name: 'link badge' })).toHaveAttribute('data-slot', 'badge');
  });

  it('renders skeleton, separator, aspect ratio and avatar', () => {
    render(
      <>
        <Skeleton className="h-4" />
        <Separator orientation="vertical" />
        <AspectRatio ratio={2}>media</AspectRatio>
        <Avatar>
          <AvatarImage src="/a.png" alt="A" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      </>,
    );
    expect(slot('skeleton')).toHaveClass('h-4');
    expect(slot('separator-root')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByText('media')).toHaveAttribute('data-slot', 'aspect-ratio');
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders resizable panels with and without a grip', () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>left</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>right</ResizablePanel>
        <ResizableHandle />
      </ResizablePanelGroup>,
    );
    const handles = document.querySelectorAll('[data-slot="resizable-handle"]');
    expect(handles).toHaveLength(2);
    expect(handles[0].querySelector('svg')).not.toBeNull();
    expect(handles[1].querySelector('svg')).toBeNull();
  });

  it('renders scroll areas with both scrollbar orientations', () => {
    render(
      <ScrollArea type="always" className="h-10">
        content
        <ScrollBar orientation="horizontal" />
      </ScrollArea>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(document.querySelector('[data-orientation="vertical"]')).toHaveClass('w-2.5');
    expect(document.querySelector('[data-orientation="horizontal"]')).toHaveClass('h-2.5');
  });

  it('renders the toaster with the system theme or a provided theme', () => {
    const { unmount } = render(<Toaster />);
    expect(document.querySelector('section')).toBeInTheDocument();
    unmount();
    render(
      <ThemeProvider forcedTheme="dark" attribute="class">
        <Toaster />
      </ThemeProvider>,
    );
    expect(document.querySelector('section')).toBeInTheDocument();
  });
});

describe('overlay components', () => {
  it('opens collapsible content', async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>more</CollapsibleTrigger>
        <CollapsibleContent>details</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText('details')).not.toBeInTheDocument();
    await user.click(screen.getByText('more'));
    expect(screen.getByText('details')).toBeInTheDocument();
  });

  it('renders open popover, hover card and tooltip content', () => {
    render(
      <>
        <Popover open>
          <PopoverAnchor />
          <PopoverTrigger>pop</PopoverTrigger>
          <PopoverContent>popover body</PopoverContent>
        </Popover>
        <HoverCard open>
          <HoverCardTrigger>hover</HoverCardTrigger>
          <HoverCardContent>hover body</HoverCardContent>
        </HoverCard>
        <Tooltip open>
          <TooltipTrigger>tip</TooltipTrigger>
          <TooltipContent>tooltip body</TooltipContent>
        </Tooltip>
      </>,
    );
    expect(screen.getByText('popover body')).toHaveAttribute('data-slot', 'popover-content');
    expect(screen.getByText('hover body')).toHaveAttribute('data-slot', 'hover-card-content');
    expect(screen.getAllByText('tooltip body').length).toBeGreaterThan(0);
  });
});
