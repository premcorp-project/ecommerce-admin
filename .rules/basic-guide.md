## Project Structure

### Directory Organization

```
├── app/                    # Next.js App Router pages
│   └── (layouts)/         # Route groups for layouts
├── components/            # Reusable components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── shared/           # Shared business components
│   ├── general/              # Feature-specific components
│   ├── support/        # Feature-specific components
│   └── layouts/          # Layout components
├── config/               # Configuration files
├── context/              # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── store/                # Redux store configuration
├── styles/               # Global styles and CSS
├── types/                # TypeScript type definitions
└── public/               # Static assets
└── schemas/               # Froms yup validations
```


### Feature-Based Organization

Components are organized by feature (e.g., `role-management/`, `general/`) with sub-folders for specific functionality:

```
components/general/
├── users/
│   ├── dialogs/
│   │   ├── UserDetailDialog.tsx/
│   └── index.tsx
├── zones/
└── riders/
```

## File and Folder Naming

### Folders
- Use **kebab-case** for folder names: `ride-management/`, `general/` `rideManagement (x) not allowed`

### Files
- Use **PascalCase** for React components: `RideDetails.tsx`, `UserProfile.tsx`
- Use **camelCase** for utility files: `helpers.ts`, `utils.ts`
- Use **kebab-case** for configuration files or images or svg file: `main-menu.config.tsx main-logo.png`
- Use **lowercase** for type definition files: `types.ts`, `index.ts`, `user.d.ts`

## Component props (local, inline)

1) Component Props should define inside components 
2) Pascal Case for defining interface => Order , Props, UserProfile


```typescript
// components/shared/SomeComponent.tsx
interface Props {
  open: boolean;
  onClose: () => void;
}

export function SomeComponent({ open, onClose }: Props) {
  // ...
}
```


## Styling Guidelines
1) Do not hardcode any color use variables defined in global.css
### Tailwind CSS

```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

const Component = ({ variant, className }) => {
  return (
    <div 
      className={cn(
        "base-classes",
        variant === "primary" && "primary-classes",
        className
      )}
    >
      Content
    </div>
  );
};
```

## SVG Icons
1) use Lucide-react library for icons
2) custom icons should be placed inside /public/svgs/user.svg
3) custom images should be placed inside /public/images/user.jpg

## Do not change or add any configuration/editor rule in eslint or prettier file


### State Management

1. **Local State**: Use `useState` for component-local state
2. **Context**: Use React Context for feature-specific shared state
3. **Redux**: Use Redux Toolkit for global application state

### Performance

1. **Memoization**: Use `React.memo`, `useMemo`, `useCallback` judiciously
2. **Code Splitting**: Use dynamic imports for large components
3. **Image Optimization**: Always use Next.js `Image` component


Run the following commands before pushing code to githun to ensure compliance and no build errors:

```bash
# Lint code
npm run lint

# Format code
npm run format
```