'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useAdminQuery } from '@/lib/api/admin-hooks';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { StepBasicInfo } from './StepBasicInfo';
import { StepImageUpload } from './StepImageUpload';
import { StepVariants } from './StepVariants';
import { StepperIndicator } from './StepperIndicator';
import { CategoriesResponse, Category, Product, ProductFormProps, TreeCategory } from './types';

export default function ProductForm({ open, item, onSuccess, onClose }: ProductFormProps) {
  const t = useTranslations('admin.products');
  const isEditMode = !!item;

  const [currentStep, setCurrentStep] = useState(1);
  const [productId, setProductId] = useState<string>(item?._id ?? '');
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  // Categories for Step 1
  const { data: categoriesData } = useAdminQuery<CategoriesResponse>(
    ['admin', 'categories', 'tree', 'all'],
    '/catalog/categories/tree',
    undefined,
    { params: { includeInactive: true } },
  );

  // Full product detail (includes variantAttributes + images) — fetches for both edit and new (after step 1)
  const { data: productDetailData } = useAdminQuery<{
    success: boolean;
    product?: Product;
    data?: { product?: Product };
  }>(
    ['admin', 'product-detail', productId || 'none'],
    `/catalog/products/${productId}`,
    { enabled: !!productId && open },
  );

  const rawCategories: TreeCategory[] =
    (categoriesData as any)?.data?.categories ??
    (categoriesData as any)?.categories ??
    [];

  // Flatten the tree so CascadingCategorySelect can find children by parent ID
  const categories: Category[] = rawCategories.flatMap((parent) => [
    { _id: parent._id, name: parent.name, slug: parent.slug, isActive: parent.isActive, parent: null },
    ...(parent.children ?? []).map((child) => ({
      _id: child._id,
      name: child.name,
      slug: child.slug,
      isActive: child.isActive,
      parent: parent._id,
    })),
  ]);

  const fullProduct: Product | null =
    (productDetailData as any)?.product ??
    (productDetailData as any)?.data?.product ??
    (isEditMode ? item : null);

  // Sync productId when item changes (e.g. opening a different product)
  if (open && item && productId !== item._id) {
    setProductId(item._id);
    setCurrentStep(1);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(1);
      setProductId(item?._id ?? '');
      setCreatedProduct(null);
      onClose();
    }
  };

  const handleStep1Success = (id: string, product?: Product) => {
    setProductId(id);
    if (product) setCreatedProduct(product);
    setCurrentStep(2);
  };

  const handleDone = () => {
    setCurrentStep(1);
    setProductId(item?._id ?? '');
    setCreatedProduct(null);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col p-0" aria-describedby={undefined}>
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>{isEditMode ? t('form.editProduct') : t('form.addProduct')}</SheetTitle>
        </SheetHeader>

        <StepperIndicator
          currentStep={currentStep}
          isEditMode={isEditMode}
          onStepClick={(step) => isEditMode && setCurrentStep(step)}
        />

        <div className="border-t" />

        <div className="flex-1 flex flex-col min-h-0">
          {currentStep === 1 && (
            <StepBasicInfo
              item={fullProduct ?? createdProduct ?? item}
              categories={categories}
              isEditMode={isEditMode || !!createdProduct}
              onSubmitSuccess={handleStep1Success}
            />
          )}

          {currentStep === 2 && productId && (
            <StepImageUpload
              productId={productId}
              existingImages={fullProduct?.images ?? item?.images ?? []}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && productId && (
            <StepVariants
              productId={productId}
              existingAttributes={fullProduct?.variantAttributes ?? item?.variantAttributes ?? []}
              productImages={fullProduct?.images ?? createdProduct?.images ?? item?.images ?? []}
              onDone={handleDone}
              onBack={() => setCurrentStep(2)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
