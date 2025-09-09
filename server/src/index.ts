import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import listRoutes from './routes/lists';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Usamos 5001 para evitar conflictos

app.use(cors());
app.use(express.json());

// Rutas de la API
app.get('/api', (req, res) => res.send('Stratopia - ClickUp API is running!'));
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/lists', listRoutes);


app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});