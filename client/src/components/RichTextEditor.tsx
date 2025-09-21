// client/src/components/RichTextEditor.tsx
import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image'; // --- NUEVO: Importar la extensión de imagen ---

// --- SUB-COMPONENTE: BARRA DE HERRAMIENTAS ---
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }
  
  const buttonClass = "px-2 py-1 text-sm rounded-md hover:bg-muted hover:text-muted-foreground";
  const activeButtonClass = "bg-muted text-muted-foreground";

  // --- NUEVO: Función para añadir imagen por URL ---
  const addImage = () => {
    const url = window.prompt('URL de la imagen');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
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
      {/* --- NUEVO: Botón para añadir imagen --- */}
      <button type="button" onClick={addImage} className={buttonClass}>
        Imagen
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
    extensions: [
      StarterKit,
      Image, // --- NUEVO: Añadir la extensión a Tiptap ---
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none p-3 min-h-[150px] focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      const isContentEmpty = editor.getText().trim().length === 0;
      onChange(isContentEmpty ? '' : editor.getHTML());
    },
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      {/* Con la extensión 'Image' activa, Tiptap manejará automáticamente
        el pegado de imágenes desde el portapapeles y el arrastrar y soltar.
        Nota: Esto insertará la imagen como datos base64. Para una solución
        más robusta, se necesitaría interceptar el evento de pegado, subir
        la imagen a tu servidor y luego insertar la URL resultante.
        Pero para empezar, esto es funcional.
      */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
};

export default RichTextEditor;