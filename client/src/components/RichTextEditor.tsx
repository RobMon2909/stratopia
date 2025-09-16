// client/src/components/RichTextEditor.tsx
// VERSIÓN FINAL CON ESTILOS DE TEMA

import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// --- SUB-COMPONENTE: BARRA DE HERRAMIENTAS ---
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }
  
  // Clases para los botones para que tengan un feedback visual
  const buttonClass = "px-2 py-1 text-sm rounded-md hover:bg-muted hover:text-muted-foreground";
  const activeButtonClass = "bg-muted text-muted-foreground";

  return (
    // Se reemplazan los colores fijos por clases de tema
    <div className="border-b border-border bg-background-secondary p-2 flex flex-wrap gap-x-4 gap-y-1">
      <button 
        type="button" 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={`${buttonClass} ${editor.isActive('bold') ? activeButtonClass : ''}`}
      >
        Negrita
      </button>
      <button 
        type="button" 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={`${buttonClass} ${editor.isActive('italic') ? 'italic' : ''} ${editor.isActive('italic') ? activeButtonClass : ''}`}
      >
        Cursiva
      </button>
      <button 
        type="button" 
        onClick={() => editor.chain().focus().toggleStrike().run()} 
        className={`${buttonClass} ${editor.isActive('strike') ? 'line-through' : ''} ${editor.isActive('strike') ? activeButtonClass : ''}`}
      >
        Tachado
      </button>
      <button 
        type="button" 
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        className={`${buttonClass} ${editor.isActive('bulletList') ? activeButtonClass : ''}`}
      >
        Viñetas
      </button>
      <button 
        type="button" 
        onClick={() => editor.chain().focus().toggleOrderedList().run()} 
        className={`${buttonClass} ${editor.isActive('orderedList') ? activeButtonClass : ''}`}
      >
        Lista Num.
      </button>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
interface RichTextEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    editorProps: {
      attributes: {
        // Se aplican clases para el área de escritura
        class: 'prose dark:prose-invert max-w-none p-3 min-h-[150px] focus:outline-none',
      },
      // Añadimos el placeholder directamente aquí
      // Tiptap lo manejará internamente
      // placeholder: placeholder, // Esta línea no es necesaria aquí, se pasa a EditorContent
    },
    onUpdate({ editor }) {
      // Evitamos enviar una actualización si el contenido está "vacío" (solo un párrafo)
      const isContentEmpty = editor.getText().trim().length === 0;
      onChange(isContentEmpty ? '' : editor.getHTML());
    },
  });

  return (
    // Contenedor principal que aplica el borde y el color de fondo de la tarjeta
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
};

export default RichTextEditor;