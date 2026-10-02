'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { StaffMember } from '@/app/admin/staff/page';
import { AppButton } from '@/components/shared/AppButton';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { AdminPermissions, PermissionModule } from '@/lib/stores/admin-auth-store';

// --- Types ---

interface EditPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSuccess: () => void;
}

interface UpdatePermissionsPayload {
  permissions: AdminPermissions;
  userId: string;
}

// --- Constants ---

const PERMISSION_MODULES: PermissionModule[] = [
  'catalog',
  'orders',
  'users',
  'support',
  'notifications',
  'config',
];

const DEFAULT_PERMISSIONS: AdminPermissions = {
  catalog: { read: false, write: false },
  orders: { read: false, write: false },
  users: { read: false, write: false },
  support: { read: false, write: false },
  notifications: { read: false, write: false },
  config: { read: false, write: false },
};

// --- Component ---

export default function EditPermissionsSheet({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: EditPermissionsSheetProps) {
  const t = useTranslations('admin.staff');
  const queryClient = useQueryClient();

  // --- Local permissions state ---
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);

  // --- Reset permissions when staff member changes or sheet opens ---
  useEffect(() => {
    if (staff) {
      setPermissions(staff.permissions ?? DEFAULT_PERMISSIONS);
    }
  }, [staff]);

  // --- Mutation ---
  const { mutateAsync: updatePermissions, isPending } =
    useAdminMutation<{ success: boolean; message: string }, UpdatePermissionsPayload>(
      'put',
      (variables) => `/users/${variables.userId}/permissions`,
      {
        onSuccess: () => {
          toast.success(t('toast.permissionsUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
          onSuccess();
        },
        onError: () => {
          toast.error(t('toast.permissionsUpdateFailed'));
        },
      },
    );

  // --- Toggle handlers with auto-toggle logic ---
  const handleToggleRead = (module: PermissionModule, checked: boolean) => {
    setPermissions((prev) => {
      const updated = { ...prev };
      if (checked) {
        // Enabling read - just enable read
        updated[module] = { ...updated[module], read: true };
      } else {
        // Disabling read → auto-disable write
        updated[module] = { read: false, write: false };
      }
      return updated;
    });
  };

  const handleToggleWrite = (module: PermissionModule, checked: boolean) => {
    setPermissions((prev) => {
      const updated = { ...prev };
      if (checked) {
        // Enabling write → auto-enable read
        updated[module] = { read: true, write: true };
      } else {
        // Disabling write - just disable write
        updated[module] = { ...updated[module], write: false };
      }
      return updated;
    });
  };

  // --- Submit handler ---
  const handleSubmit = async () => {
    if (!staff) return;
    await updatePermissions({
      userId: staff._id,
      permissions,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('permissions.title')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {PERMISSION_MODULES.map((module) => (
            <div key={module} className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-foreground">
                {t(`permissions.modules.${module}`)}
              </h4>
              <div className="flex flex-col gap-2 ltr:pl-2 rtl:pr-2">
                {/* Read toggle */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${module}-read`}
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    {t('permissions.toggles.read')}
                  </label>
                  <Switch
                    id={`${module}-read`}
                    checked={permissions[module].read}
                    onCheckedChange={(checked) =>
                      handleToggleRead(module, checked)
                    }
                  />
                </div>
                {/* Write toggle */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${module}-write`}
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    {t('permissions.toggles.write')}
                  </label>
                  <Switch
                    id={`${module}-write`}
                    checked={permissions[module].write}
                    onCheckedChange={(checked) =>
                      handleToggleWrite(module, checked)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div className="p-4 mt-auto border-t">
          <AppButton
            type="button"
            variant="primary"
            className="w-full"
            isLoading={isPending}
            disabled={isPending}
            onClick={handleSubmit}
          >
            {t('buttons.save')}
          </AppButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
