import { request } from "../lib/api";

export type Curso = { id: number; nome: string; total_periodos: number };

export const listarCursos = () => request<Curso[]>("/cursos/");