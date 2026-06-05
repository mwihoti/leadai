// ============================================================
// Linked Lead AI — Projects Page
// ============================================================

import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Plus, Trash2, FolderKanban, ExternalLink } from 'lucide-react';
import type { Project } from '../../types';

export default function ProjectsPage() {
  const { state, addProject, updateProject, deleteProject } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    techStack: '',
    businessValue: '',
    link: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({ name: '', description: '', techStack: '', businessValue: '', link: '' });
    setEditingId(null);
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const techStack = form.techStack.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingId) {
      updateProject(editingId, {
        name: form.name,
        description: form.description,
        techStack,
        businessValue: form.businessValue,
        link: form.link,
      });
    } else {
      addProject({
        name: form.name,
        description: form.description,
        techStack,
        businessValue: form.businessValue,
        link: form.link,
      });
    }
    resetForm();
  }

  function handleEdit(project: Project) {
    setForm({
      name: project.name,
      description: project.description,
      techStack: project.techStack.join(', '),
      businessValue: project.businessValue,
      link: project.link,
    });
    setEditingId(project.id);
    setShowForm(true);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Your portfolio projects — AI references these for lead matching</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Project' : 'New Project'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. WhatsApp Booking Bot"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tech Stack</label>
                <input
                  type="text"
                  value={form.techStack}
                  onChange={(e) => handleChange('techStack', e.target.value)}
                  placeholder="e.g. React, Node.js, TypeScript"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Describe what this project does..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Value</label>
              <input
                type="text"
                value={form.businessValue}
                onChange={(e) => handleChange('businessValue', e.target.value)}
                placeholder="e.g. Helps businesses automate customer booking and payments"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Link</label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://github.com/... or live demo URL"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {editingId ? 'Update Project' : 'Add Project'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project List */}
      <div className="grid grid-cols-2 gap-4">
        {state.projects.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No projects yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add projects so the AI can match them to leads
            </p>
          </div>
        ) : (
          state.projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this project?')) deleteProject(project.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mt-2">{project.description}</p>
              )}
              {project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.techStack.map((tech, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {project.businessValue && (
                <p className="text-xs text-gray-500 mt-2 italic">"{project.businessValue}"</p>
              )}
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> View project
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
