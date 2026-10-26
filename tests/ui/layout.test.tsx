import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../src/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../src/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '../../src/components/ui/toggle-group';
import { Calendar } from '../../src/components/ui/calendar';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../../src/components/ui/input-otp';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../src/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../src/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../../src/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../src/components/ui/pagination';

const slots = (name: string) => document.querySelectorAll(`[data-slot="${name}"]`);

describe('disclosure components', () => {
  it('expands accordion items', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.click(screen.getByRole('button', { name: 'Question' }));
    expect(screen.getByText('Answer')).toBeVisible();
  });

  it('switches tabs', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">first</TabsContent>
        <TabsContent value="two">second</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('first')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Two' }));
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('styles toggle group items from the group or the item', () => {
    render(
      <>
        <ToggleGroup type="single" variant="outline" size="sm">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="multiple">
          <ToggleGroupItem value="b" variant="outline" size="lg">B</ToggleGroupItem>
        </ToggleGroup>
      </>,
    );
    expect(screen.getByText('A')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByText('B')).toHaveAttribute('data-size', 'lg');
    expect(screen.getByText('B')).toHaveAttribute('data-variant', 'outline');
  });
});

describe('static layout components', () => {
  it('renders alerts in both variants', () => {
    render(
      <>
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>details</AlertDescription>
        </Alert>
        <Alert variant="destructive">bad</Alert>
      </>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByText('Heads up')).toHaveAttribute('data-slot', 'alert-title');
    expect(screen.getByText('bad')).toHaveClass('text-destructive');
  });

  it('renders every card part', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>Act</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>,
    );
    for (const name of ['card', 'card-header', 'card-title', 'card-description', 'card-action', 'card-content', 'card-footer']) {
      expect(slots(name)).toHaveLength(1);
    }
  });

  it('renders a breadcrumb trail with default and custom separators', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/docs">Docs</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbEllipsis />
          <BreadcrumbPage>Here</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('data-slot', 'breadcrumb-link');
    expect(slots('breadcrumb-separator')[0].querySelector('svg')).not.toBeNull();
    expect(slots('breadcrumb-separator')[1]).toHaveTextContent('/');
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('Here')).toHaveAttribute('aria-current', 'page');
  });

  it('renders a full table', () => {
    render(
      <Table>
        <TableCaption>Scores</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>alice</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByRole('table', { name: 'Scores' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(slots('table-footer')).toHaveLength(1);
  });

  it('renders pagination with an active page', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive>2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute('aria-current');
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByText('More pages')).toBeInTheDocument();
  });
});

describe('inputs with their own state', () => {
  it('renders single and range calendars with navigation icons', () => {
    const month = new Date(2026, 9, 1);
    const { container } = render(
      <>
        <Calendar mode="single" month={month} />
        <Calendar mode="range" month={month} showOutsideDays={false} classNames={{ day_hidden: 'gone' }} />
      </>,
    );
    expect(screen.getAllByText('October 2026')).toHaveLength(2);
    expect(container.querySelectorAll('svg.size-4').length).toBeGreaterThanOrEqual(4);
  });

});

// input-otp starts timers of up to 6 s on mount; fake timers keep them from firing after the test environment is gone.
describe('InputOTP', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('fills OTP slots and shows the caret on the active slot', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    render(
      <InputOTP maxLength={4} containerClassName="otp">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12' } });
    act(() => vi.advanceTimersByTime(100));
    const all = slots('input-otp-slot');
    expect(all[0]).toHaveTextContent('1');
    expect(all[1]).toHaveTextContent('2');
    expect(all[2]).toHaveAttribute('data-active', 'true');
    expect(all[2].querySelector('.animate-caret-blink')).not.toBeNull();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders an empty slot for an index past maxLength', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    render(
      <InputOTP maxLength={1}>
        <InputOTPSlot index={5} />
      </InputOTP>,
    );
    expect(slots('input-otp-slot')[0]).toBeEmptyDOMElement();
  });
});
