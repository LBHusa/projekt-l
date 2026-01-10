'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  ClientList,
  ClientForm,
  ProjectList,
  ProjectForm,
  InvoiceList,
  FreelancerStats,
  type ClientFormData,
  type ProjectFormData,
} from '@/components/freelancer';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getFreelancerStats,
  type FreelancerStats as FreelancerStatsType,
} from '@/lib/data/freelancer';
import type { FreelanceClient, FreelanceProject } from '@/lib/database.types';

export default function FreelancerPage() {
  const [clients, setClients] = useState<FreelanceClient[]>([]);
  const [projects, setProjects] = useState<(FreelanceProject & { client?: FreelanceClient })[]>([]);
  const [stats, setStats] = useState<FreelancerStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<FreelanceClient | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<FreelanceProject | null>(null);

  const loadData = async () => {
    try {
      const [clientsData, projectsData, statsData] = await Promise.all([
        getClients(),
        getProjects(),
        getFreelancerStats(),
      ]);

      setClients(clientsData);
      setProjects(projectsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading freelancer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Client handlers
  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: FreelanceClient) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleClientSubmit = async (data: ClientFormData) => {
    const userId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth

    if (editingClient) {
      await updateClient(editingClient.id, data);
    } else {
      await createClient(data, userId);
    }

    setShowClientForm(false);
    setEditingClient(null);
    await loadData();
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient(clientId);
    await loadData();
  };

  // Project handlers
  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: FreelanceProject) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleProjectSubmit = async (data: ProjectFormData) => {
    const userId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth

    if (editingProject) {
      await updateProject(editingProject.id, data, userId);
    } else {
      await createProject(data, userId);
    }

    setShowProjectForm(false);
    setEditingProject(null);
    await loadData();
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-white/50">Lade Freelancer-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/karriere"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Karriere
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/30 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Freelancer-Modus</h1>
              <p className="text-white/70">
                Verwalte deine Kunden, Projekte und Umsätze
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <FreelancerStats stats={stats} />
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clients */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ClientList
              clients={clients}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
            />
          </motion.div>

          {/* Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProjectList
              projects={projects}
              onAddProject={handleAddProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
            />
          </motion.div>
        </div>

        {/* Invoices (Coming Soon) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <InvoiceList invoices={[]} onAddInvoice={() => {}} />
        </motion.div>
      </main>

      {/* Forms */}
      <ClientForm
        client={editingClient}
        isOpen={showClientForm}
        onClose={() => {
          setShowClientForm(false);
          setEditingClient(null);
        }}
        onSubmit={handleClientSubmit}
      />

      <ProjectForm
        project={editingProject}
        clients={clients}
        isOpen={showProjectForm}
        onClose={() => {
          setShowProjectForm(false);
          setEditingProject(null);
        }}
        onSubmit={handleProjectSubmit}
      />
    </div>
  );
}
