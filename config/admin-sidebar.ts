import {
    Banknote,
    BarChart3,
    Bell,
    FolderTree,
    Image,
    LayoutDashboard,
    LucideIcon,
    Mail,
    MessageSquare,
    Newspaper,
    Package,
    Settings,
    ShoppingCart,
    Tag,
    Ticket,
    UserCog,
    Users,
    Warehouse
} from 'lucide-react';

import { PermissionModule } from '@/lib/stores/admin-auth-store';

export interface AdminSidebarItem {
    label: string;
    path: string;
    icon: LucideIcon;
    translationKey: string;
    permissionModule?: PermissionModule; // undefined = always visible (Dashboard)
    adminOnly?: boolean; // true = only visible to admin role, hidden from staff
}

export const adminSidebarConfig: AdminSidebarItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, translationKey: 'admin.sidebar.dashboard', adminOnly: true },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart, translationKey: 'admin.sidebar.orders', permissionModule: 'orders' },
    { label: 'Products', path: '/admin/products', icon: Package, translationKey: 'admin.sidebar.products', permissionModule: 'catalog' },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree, translationKey: 'admin.sidebar.categories', permissionModule: 'catalog' },
    { label: 'Tags', path: '/admin/tags', icon: Tag, translationKey: 'admin.sidebar.tags', permissionModule: 'catalog' },
    { label: 'Users', path: '/admin/users', icon: Users, translationKey: 'admin.sidebar.users', permissionModule: 'users' },
    { label: 'Staff', path: '/admin/staff', icon: UserCog, translationKey: 'admin.sidebar.staff', permissionModule: 'users' },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, translationKey: 'admin.sidebar.analytics', permissionModule: 'orders', adminOnly: true },
    { label: 'Banners', path: '/admin/banners', icon: Image, translationKey: 'admin.sidebar.banners', permissionModule: 'catalog' },
    { label: 'Coupons', path: '/admin/coupons', icon: Ticket, translationKey: 'admin.sidebar.coupons', permissionModule: 'catalog' },
    { label: 'Support Tickets', path: '/admin/support', icon: MessageSquare, translationKey: 'admin.sidebar.support', permissionModule: 'support' },
    { label: 'Contact Messages', path: '/admin/contact', icon: Mail, translationKey: 'admin.sidebar.contact', permissionModule: 'config' },
    { label: 'Testimonials', path: '/admin/testimonials', icon: MessageSquare, translationKey: 'admin.sidebar.testimonials', permissionModule: 'config' },
    { label: 'Newsletter', path: '/admin/newsletter', icon: Newspaper, translationKey: 'admin.sidebar.newsletter', permissionModule: 'config' },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell, translationKey: 'admin.sidebar.notifications', permissionModule: 'notifications' },
    { label: 'Settings', path: '/admin/settings', icon: Settings, translationKey: 'admin.sidebar.settings', permissionModule: 'config' },
    { label: 'Bulk Buyers', path: '/admin/bulk-buyers', icon: Warehouse, translationKey: 'admin.sidebar.bulkBuyers', permissionModule: 'users', adminOnly: true },
    { label: 'COD Management', path: '/admin/cod', icon: Banknote, translationKey: 'admin.sidebar.cod', permissionModule: 'users', adminOnly: true },
];
