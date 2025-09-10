// src/components/CommentSection.tsx

import React, { useState, useEffect } from 'react';
import { getComments, createComment } from '../services/api';
import RichTextEditor from './RichTextEditor'; // Importa el nuevo editor

// Definimos el tipo para un comentario
interface Comment {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    userName: string;
}

interface CommentSectionProps {
    taskId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (taskId) {
            getComments(taskId)
                .then(res => setComments(res.data))
                .catch(err => console.error("Error fetching comments:", err))
                .finally(() => setIsLoading(false));
        }
    }, [taskId]);

    const handlePostComment = async () => {
        if (newComment.trim().length < 8) return; // Un chequeo simple para contenido vacío
        try {
            const res = await createComment({ taskId, content: newComment });
            setComments([...comments, res.data.comment]);
            setNewComment(''); // Limpiar el editor
        } catch (error) {
            console.error("Failed to post comment:", error);
            alert("No se pudo enviar el comentario.");
        }
    };

    if (isLoading) return <p>Cargando comentarios...</p>;
    
    return (
        <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">Comentarios</h3>
            <div className="space-y-4 mb-4">
                {comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {comment.userName.charAt(0)}
                        </div>
                        <div>
                            <div className="bg-gray-100 rounded-lg p-3">
                                <p className="font-semibold text-sm">{comment.userName}</p>
                                <div 
                                    className="prose prose-sm max-w-none" 
                                    dangerouslySetInnerHTML={{ __html: comment.content }} 
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(comment.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500">No hay comentarios aún. ¡Sé el primero!</p>
                )}
            </div>

            <div>
                <RichTextEditor content={newComment} onChange={setNewComment} placeholder="Escribe un comentario..." />
                <button
                    onClick={handlePostComment}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
                >
                    Comentar
                </button>
            </div>
        </div>
    );
};

export default CommentSection;