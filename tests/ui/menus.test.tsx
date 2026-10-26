import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../src/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../src/components/ui/context-menu';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../../src/components/ui/menubar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../../src/components/ui/navigation-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../src/components/ui/select';

const slots = (name: string) => document.querySelectorAll(`[data-slot="${name}"]`);

// Every menu flavor exposes the same parts; this checks the parts each test rendered.
function expectMenuParts(prefix: string) {
  expect(screen.getByText('Plain')).toHaveAttribute('data-variant', 'default');
  expect(screen.getByText('Remove')).toHaveAttribute('data-variant', 'destructive');
  expect(screen.getByText('Remove')).toHaveAttribute('data-inset', 'true');
  expect(screen.getByText('Heading')).toHaveAttribute('data-inset', 'true');
  expect(screen.getByText('Sound')).toHaveAttribute('data-state', 'checked');
  expect(screen.getByText('Easy')).toHaveAttribute('data-state', 'checked');
  expect(screen.getByText('⌘S')).toHaveAttribute('data-slot', `${prefix}-shortcut`);
  expect(screen.getByText('Nested item')).toBeInTheDocument();
  expect(slots(`${prefix}-separator`)).toHaveLength(1);
}

describe('DropdownMenu', () => {
  it('renders every item kind when open', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuPortal />
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Heading</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>Plain</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" inset>Remove</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Sound</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="easy">
            <DropdownMenuRadioItem value="easy">Easy</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuItem>
            Save <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expectMenuParts('dropdown-menu');
  });
});

describe('ContextMenu', () => {
  it('opens on right click and renders every item kind', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right click me</ContextMenuTrigger>
        <ContextMenuPortal />
        <ContextMenuContent>
          <ContextMenuLabel inset>Heading</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem>Plain</ContextMenuItem>
            <ContextMenuItem variant="destructive" inset>Remove</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked>Sound</ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="easy">
            <ContextMenuRadioItem value="easy">Easy</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuItem>
            Save <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub open>
            <ContextMenuSubTrigger inset>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Nested item</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Right click me'));
    expectMenuParts('context-menu');
  });
});

describe('Menubar', () => {
  it('renders an open menu with every item kind', () => {
    render(
      <Menubar value="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal />
          <MenubarContent>
            <MenubarLabel inset>Heading</MenubarLabel>
            <MenubarGroup>
              <MenubarItem>Plain</MenubarItem>
              <MenubarItem variant="destructive" inset>Remove</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarCheckboxItem checked>Sound</MenubarCheckboxItem>
            <MenubarRadioGroup value="easy">
              <MenubarRadioItem value="easy">Easy</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarItem>
              Save <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarSub open>
              <MenubarSubTrigger inset>More</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Nested item</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole('menubar')).toBeInTheDocument();
    expectMenuParts('menubar');
  });
});

describe('NavigationMenu', () => {
  it('shows the active item content in the viewport', () => {
    render(
      <NavigationMenu value="games">
        <NavigationMenuList>
          <NavigationMenuItem value="games">
            <NavigationMenuTrigger>Games</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/treasure">Treasure hunt</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(screen.getByText('Treasure hunt')).toHaveAttribute('data-slot', 'navigation-menu-link');
    expect(slots('navigation-menu-viewport')).toHaveLength(1);
    expect(screen.getByRole('navigation')).toHaveAttribute('data-viewport', 'true');
  });

  it('can render without a viewport', () => {
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/">Home</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(slots('navigation-menu-viewport')).toHaveLength(0);
    expect(screen.getByText('Home')).toHaveClass('inline-flex');
  });
});

describe('Select', () => {
  it.each(['popper', 'item-aligned'] as const)('renders open content positioned %s', (position) => {
    render(
      <Select open value="b">
        <SelectTrigger size="sm" aria-label="Difficulty">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent position={position}>
          <SelectGroup>
            <SelectLabel>Levels</SelectLabel>
            <SelectItem value="a">Easy</SelectItem>
            <SelectSeparator />
            <SelectItem value="b">Hard</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hard' })).toHaveAttribute('data-state', 'checked');
    expect(slots('select-trigger')[0]).toHaveAttribute('data-size', 'sm');
  });

  it('shows the placeholder with the default trigger size', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Easy</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(slots('select-trigger')[0]).toHaveAttribute('data-size', 'default');
  });
});
