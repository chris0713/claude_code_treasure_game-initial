import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../src/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../src/components/ui/dialog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../src/components/ui/sheet';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../../src/components/ui/drawer';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../../src/components/ui/command';

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

describe('AlertDialog', () => {
  it('opens from the trigger and confirms', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alertdialog', { name: 'Sure?' })).toBeInTheDocument();
    expect(slot('alert-dialog-overlay')).toBeInTheDocument();
    expect(slot('alert-dialog-footer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('opens and closes with the built-in close button and DialogClose', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Change things</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Sheet', () => {
  it.each(['top', 'right', 'bottom', 'left'] as const)('slides in from the %s', (side) => {
    render(
      <Sheet open>
        <SheetContent side={side}>
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Pick one</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Close sheet</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    expect(slot('sheet-content')?.className).toContain(`slide-in-from-${side}`);
  });

  it('defaults to the right side and opens from a trigger', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Menu</SheetTrigger>
        <SheetContent>
          <SheetTitle>Nav</SheetTitle>
          <SheetDescription>links</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(slot('sheet-content')?.className).toContain('slide-in-from-right');
  });
});

describe('Drawer', () => {
  it('renders its content when open', () => {
    render(
      <Drawer open>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Drawer text</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close drawer</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.getByText('Drawer title')).toHaveAttribute('data-slot', 'drawer-title');
    expect(slot('drawer-overlay')).toBeInTheDocument();
    expect(slot('drawer-footer')).toBeInTheDocument();
  });
});

describe('Command', () => {
  it('filters items and shows the empty state', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>
              Open chest <CommandShortcut>⌘O</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </Command>,
    );
    expect(screen.getByText('⌘O')).toHaveAttribute('data-slot', 'command-shortcut');
    await user.type(screen.getByPlaceholderText('Search'), 'zzz');
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders inside a dialog with default and custom titles', () => {
    const { unmount } = render(
      <CommandDialog open>
        <CommandInput placeholder="Type" />
      </CommandDialog>,
    );
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByText('Search for a command to run...')).toBeInTheDocument();
    unmount();
    render(<CommandDialog open title="Jump" description="Go somewhere" />);
    expect(screen.getByText('Jump')).toBeInTheDocument();
  });
});
