import { request } from "../lib/api";
import type { Curso } from "../types";

export const listarCursos = () => request<Curso[]>("/cursos/", { auth: false });