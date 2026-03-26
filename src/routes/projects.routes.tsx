/**
 * Projects Routes
 * 
 * Rotas do módulo Projetos - requerem BU e módulo 'projects' ativo.
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

const ProjectsPage = lazy(() => import('@/modules/projects/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/modules/projects/pages/ProjectDetailPage'));

function ProjectRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="projects">
          {children}
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const projectRoutes = (
  <>
    <Route path="/projects" element={<ProjectRoute><ProjectsPage /></ProjectRoute>} />
    <Route path="/projects/:id" element={<ProjectRoute><ProjectDetailPage /></ProjectRoute>} />
  </>
);
