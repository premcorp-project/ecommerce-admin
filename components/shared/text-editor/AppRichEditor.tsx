'use client';

import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Minus,
    Pilcrow,
    Quote,
    Redo2,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
    Unlink,
} from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md border p-1.5 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card border-border hover:bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" aria-hidden />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AppRichEditor({ value, onChange, placeholder, className, disabled }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable built-in Link and Underline — we add them below with custom config
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write a description…' }),
    ],
    content: value || '',
    immediatelyRender: false, // Required for Next.js SSR — prevents hydration mismatch
    editable: !disabled,
    onUpdate({ editor }) {
      // Emit empty string when editor is empty so Formik sees '' not '<p></p>'
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
  });

  // Sync external value changes (e.g. form reset / edit mode load)
  // Only update if the content actually differs to avoid cursor jumps
  if (editor && !editor.isFocused) {
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border bg-card shadow-sm',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-1 border-b bg-muted px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        {/* History */}
        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 size={14} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block type */}
        <ToolbarButton
          title="Paragraph"
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline marks */}
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={14} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={14} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={14} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          title="Insert / edit link"
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <LinkIcon size={14} />
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton
            title="Remove link"
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Unlink size={14} />
          </ToolbarButton>
        )}
      </div>

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        className={cn(
          'min-h-40 w-full p-4',
          // Prose styles scoped to the editor content
          '[&_.tiptap]:outline-none',
          '[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:mt-3',
          '[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mb-1.5 [&_.tiptap_h3]:mt-2',
          '[&_.tiptap_p]:mb-2 [&_.tiptap_p:last-child]:mb-0',
          '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:mb-2',
          '[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:mb-2',
          '[&_.tiptap_li]:mb-0.5',
          '[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-border [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:my-2',
          '[&_.tiptap_hr]:border-border [&_.tiptap_hr]:my-3',
          '[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline [&_.tiptap_a]:underline-offset-2',
          '[&_.tiptap_strong]:font-semibold',
          '[&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_.is-editor-empty:first-child::before]:float-left [&_.tiptap_.is-editor-empty:first-child::before]:h-0',
        )}
      />
    </div>
  );
}
