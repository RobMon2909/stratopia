import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Crear una nueva lista en un workspace
// @route   POST /api/lists
export const createList = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const { name, workspaceId } = req.body;
  if (!name || !workspaceId) {
    return res.status(400).json({ message: 'Name and workspaceId are required' });
  }

  // Verificar que el workspace pertenece al usuario que hace la petición
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      userId: req.user.id,
    },
  });

  if (!workspace) {
    return res.status(403).json({ message: 'User not authorized to add a list to this workspace' });
  }

  const list = await prisma.list.create({
    data: {
      name,
      workspaceId,
    },
  });
  res.status(201).json(list);
};

// NOTA: Aquí irían los controladores para crear, actualizar y borrar tareas.
// Por simplicidad, se omiten, pero seguirían la misma lógica.