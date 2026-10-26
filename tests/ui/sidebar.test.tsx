import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../../src/components/ui/sidebar';

const desktopWidth = window.innerWidth;

afterEach(() => {
  window.innerWidth = desktopWidth;
  document.cookie = 'sidebar_state=; max-age=0; path=/';
  vi.restoreAllMocks();
});

const sidebarEl = () => document.querySelector('[data-slot="sidebar"]')!;

// A sidebar using every part. Input: Sidebar props. Output: JSX.
function FullSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarInput placeholder="Search" />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Games</SidebarGroupLabel>
          <SidebarGroupLabel asChild>
            <h3>Archive</h3>
          </SidebarGroupLabel>
          <SidebarGroupAction title="Add">+</SidebarGroupAction>
          <SidebarGroupAction asChild>
            <a href="#add">add link</a>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive variant="outline" size="lg">Treasure</SidebarMenuButton>
                <SidebarMenuAction showOnHover>⋯</SidebarMenuAction>
                <SidebarMenuAction asChild>
                  <a href="#more">more</a>
                </SidebarMenuAction>
                <SidebarMenuBadge>3</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Scores">Scores</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'Settings tip' }}>Settings</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#home">Home</a>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="#a">Sub md</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton size="sm" isActive asChild>
                      <button>Sub sm</button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuSkeleton />
              <SidebarMenuSkeleton showIcon />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>footer</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

describe('Sidebar on desktop', () => {
  it('collapses and expands with the trigger, rail and Ctrl/Cmd+B', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SidebarProvider style={{ color: 'red' }}>
        <FullSidebar />
        <SidebarInset>
          <SidebarTrigger onClick={onClick} />
        </SidebarInset>
      </SidebarProvider>,
    );
    expect(sidebarEl()).toHaveAttribute('data-state', 'expanded');
    expect(sidebarEl()).toHaveAttribute('data-collapsible', '');
    expect(screen.getByText('Treasure')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Sub sm')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByText('Sub md')).toHaveClass('text-sm');
    expect(document.querySelectorAll('[data-sidebar="menu-skeleton-icon"]')).toHaveLength(1);

    await user.click(document.querySelector<HTMLElement>('[data-slot="sidebar-trigger"]')!);
    expect(onClick).toHaveBeenCalled();
    expect(sidebarEl()).toHaveAttribute('data-state', 'collapsed');
    expect(sidebarEl()).toHaveAttribute('data-collapsible', 'offcanvas');
    expect(document.cookie).toContain('sidebar_state=false');

    fireEvent.click(document.querySelector('[data-slot="sidebar-rail"]')!);
    expect(sidebarEl()).toHaveAttribute('data-state', 'expanded');

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(sidebarEl()).toHaveAttribute('data-state', 'collapsed');
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(sidebarEl()).toHaveAttribute('data-state', 'expanded');
    fireEvent.keyDown(window, { key: 'b' });
    expect(sidebarEl()).toHaveAttribute('data-state', 'expanded');
  });

  it('reports changes to a controlling parent instead of updating itself', () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider open={false} onOpenChange={onOpenChange}>
        <FullSidebar side="right" variant="floating" collapsible="icon" />
      </SidebarProvider>,
    );
    expect(sidebarEl()).toHaveAttribute('data-collapsible', 'icon');
    expect(document.querySelector('[data-slot="sidebar-container"]')).toHaveClass('right-0', 'p-2');
    fireEvent.click(document.querySelector('[data-slot="sidebar-rail"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(sidebarEl()).toHaveAttribute('data-state', 'collapsed');
  });

  it('shows menu tooltips when collapsed', () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar variant="inset">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Scores">Scores</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );
    fireEvent.focus(screen.getByText('Scores'));
    expect(screen.getAllByText('Scores').length).toBeGreaterThan(1);
  });

  it('renders a fixed sidebar when collapsible is none', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none">static</Sidebar>
      </SidebarProvider>,
    );
    expect(sidebarEl()).toHaveTextContent('static');
    expect(sidebarEl()).not.toHaveAttribute('data-state');
  });
});

describe('Sidebar on mobile', () => {
  it('opens as a sheet from the trigger', async () => {
    window.innerWidth = 500;
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>mobile nav</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    expect(screen.queryByText('mobile nav')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));
    expect(screen.getByText('mobile nav')).toBeInTheDocument();
    expect(sidebarEl()).toHaveAttribute('data-mobile', 'true');
  });
});

describe('useSidebar', () => {
  it('requires a SidebarProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useSidebar();
      return null;
    };
    expect(() => render(<Probe />)).toThrow('useSidebar must be used within a SidebarProvider.');
  });
});
