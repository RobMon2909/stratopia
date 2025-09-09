import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Obtener todos los workspaces del usuario
// @route   GET /api/workspaces
export const getWorkspaces = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const workspaces = await prisma.workspace.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json(workspaces);
};

// @desc    Crear un nuevo workspace
// @route   POST /api/workspaces
export const createWorkspace = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Please provide a name for the workspace' });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      userId: req.user.id,
    },
  });
  res.status(201).json(workspace);
};

// @desc    Obtener las listas y tareas de un workspace específico
// @route   GET /api/workspaces/:id/lists
export const getWorkspaceLists = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const workspaceId = req.params.id;

    // Verificar que el workspace pertenece al usuario
    const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId: req.user.id },
    });

    if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found or access denied' });
    }

    const lists = await prisma.list.findMany({
        where: { workspaceId: workspaceId },
        include: {
            tasks: { // Incluir las tareas de cada lista
                orderBy: {
                    createdAt: 'asc'
                }
            }
        }
    });

    res.status(200).json(lists);
};