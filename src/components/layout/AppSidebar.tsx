import { Network, Package, FileText, Route } from 'lucide-react';
import appIcon from '@/assets/app-icon-96.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { 
    id: 'uns', 
    title: 'Plant structure', 
    icon: Network,
    description: 'ISA-95 Unified Namespace'
  },
  { 
    id: 'aas', 
    title: 'Assets', 
    icon: Package,
    description: 'Asset Administration Shell'
  },
  { 
    id: 'rds', 
    title: 'Designations', 
    icon: FileText,
    description: 'IEC 81346 codes'
  },
  {
    id: 'tracking',
    title: 'Track and Trace',
    icon: Route,
    description: 'Where movable items are'
  },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="Industry Connect Forge" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" />
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-foreground">Industrial IoT</h2>
              <p className="text-xs text-muted-foreground">Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Systems</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <div className="flex flex-col items-start">
                        <span className="text-sm">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
